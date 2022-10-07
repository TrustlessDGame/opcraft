import { createIndexer, createWorld, EntityID, getComponentValue, HasValue, runQuery } from "@latticexyz/recs";
import { setupDevSystems } from "./setup";
import { createActionSystem, setupMUDNetwork, waitForActionCompletion } from "@latticexyz/std-client";
import { GameConfig, getNetworkConfig } from "./config";
import { awaitPromise, Coord, filterNullishValues, VoxelCoord } from "@latticexyz/utils";
import { BigNumber, utils } from "ethers";
import {
  definePositionComponent,
  defineOwnedByComponent,
  defineGameConfigComponent,
  defineRecipeComponent,
  defineLoadingStateComponent,
  defineItemComponent,
  defineItemPrototypeComponent,
  defineOccurrenceComponent,
  defineStakeComponent,
  defineClaimComponent,
} from "./components";
import { defineNameComponent } from "./components/NameComponent";
import { getBlockAtPosition as getBlockAtPositionApi, getECSBlock, getTerrain, getTerrainBlock } from "./api";
import { createPerlin } from "@latticexyz/noise";
import { BlockIdToKey, BlockType } from "./constants";
import { createFaucetService, createRelayStream, GodID } from "@latticexyz/network";
import { SystemTypes } from "contracts/types/SystemTypes";
import { SystemAbis } from "contracts/types/SystemAbis.mjs";
import { map, timer } from "rxjs";

/**
 * The Network layer is the lowest layer in the client architecture.
 * Its purpose is to synchronize the client components with the contract components.
 */
export async function createNetworkLayer(config: GameConfig) {
  console.log("[Network] Network config");
  console.table(config);

  // --- WORLD ----------------------------------------------------------------------
  const world = createWorld();

  // --- COMPONENTS -----------------------------------------------------------------
  const components = {
    Position: definePositionComponent(world),
    ItemPrototype: defineItemPrototypeComponent(world),
    Item: defineItemComponent(world),
    Name: defineNameComponent(world),
    OwnedBy: defineOwnedByComponent(world),
    GameConfig: defineGameConfigComponent(world),
    Recipe: defineRecipeComponent(world),
    LoadingState: defineLoadingStateComponent(world),
    Occurrence: defineOccurrenceComponent(world),
    Stake: defineStakeComponent(world),
    Claim: defineClaimComponent(world),
  };

  // --- SETUP ----------------------------------------------------------------------
  const { txQueue, systems, txReduced$, network, startSync, encoders, ecsEvent$, mappings } = await setupMUDNetwork<
    typeof components,
    SystemTypes
  >(getNetworkConfig(config), world, components, SystemAbis, { initialGasPrice: 2_000_000 });

  // Relayer setup
  const playerAddress = network.connectedAddress.get();
  const playerSigner = network.signer.get();
  const relay =
    config.relayServiceUrl && playerAddress && playerSigner
      ? await createRelayStream(playerSigner, config.relayServiceUrl, playerAddress)
      : null;

  relay && world.registerDisposer(relay.dispose);
  if (relay) console.log("[Relayer] Relayer connected: " + config.relayServiceUrl);

  // Faucet setup
  const faucet = config.faucetServiceUrl ? createFaucetService(config.faucetServiceUrl) : undefined;

  if (config.devMode) {
    const playerIsBroke = (await network.signer.get()?.getBalance())?.lte(utils.parseEther("0.005"));
    if (playerIsBroke) {
      console.log("[Dev Faucet] Dripping funds to player");
      const address = network.connectedAddress.get();
      address && (await faucet?.dripDev({ address }));
    }
  }

  // --- ACTION SYSTEM --------------------------------------------------------------
  const actions = createActionSystem<{ actionType: string; coord?: VoxelCoord; blockType?: keyof typeof BlockType }>(
    world,
    txReduced$
  );

  // Add indexers and optimistic updates
  const { withOptimisticUpdates } = actions;
  components.Position = createIndexer(withOptimisticUpdates(components.Position));
  components.OwnedBy = createIndexer(withOptimisticUpdates(components.OwnedBy));

  // --- API ------------------------------------------------------------------------

  const perlin = await createPerlin();
  const terrainContext = {
    Position: components.Position,
    Item: components.Item,
    world,
  };

  function getTerrainBlockAtPosition(position: VoxelCoord) {
    return getTerrainBlock(getTerrain(position, perlin), position, perlin);
  }

  function getECSBlockAtPosition(position: VoxelCoord) {
    return getECSBlock(terrainContext, position);
  }
  function getBlockAtPosition(position: VoxelCoord) {
    return getBlockAtPositionApi(terrainContext, perlin, position);
  }

  function build(entity: EntityID, coord: VoxelCoord) {
    const entityIndex = world.entityToIndex.get(entity);
    if (entityIndex == null) return console.warn("trying to place unknown entity", entity);
    const blockId = getComponentValue(components.Item, entityIndex)?.value;
    const blockType = blockId != null ? BlockIdToKey[blockId as EntityID] : undefined;

    actions.add({
      id: `build+${coord.x}/${coord.y}/${coord.z}` as EntityID,
      metadata: { actionType: "build", coord, blockType },
      requirement: () => true,
      components: { Position: components.Position, Item: components.Item, OwnedBy: components.OwnedBy },
      execute: () => systems["system.Build"].executeTyped(BigNumber.from(entity), coord, { gasLimit: 1_700_000 }),
      updates: () => [
        {
          component: "OwnedBy",
          entity: entityIndex,
          value: { value: GodID },
        },
        {
          component: "Position",
          entity: entityIndex,
          value: coord,
        },
      ],
    });
  }

  async function mine(coord: VoxelCoord) {
    const ecsBlock = getECSBlockAtPosition(coord);
    const blockId = ecsBlock ?? getTerrainBlockAtPosition(coord);

    if (blockId == null) throw new Error("entity has no block type");
    const blockType = BlockIdToKey[blockId];

    const airEntity = world.registerEntity();

    actions.add({
      id: `mine+${coord.x}/${coord.y}/${coord.z}` as EntityID,
      metadata: { actionType: "mine", coord, blockType },
      requirement: () => true,
      components: { Position: components.Position, OwnedBy: components.OwnedBy, Item: components.Item },
      // TODO: find tighter bound for gas limit (gas requirement is different for ecs blocks and different terrain blocks)
      execute: () => systems["system.Mine"].executeTyped(coord, blockId, { gasLimit: 1_700_000 }),
      updates: () => [
        {
          component: "Position",
          entity: airEntity,
          value: coord,
        },
        {
          component: "Item",
          entity: airEntity,
          value: { value: BlockType.Air },
        },
      ],
    });
  }

  async function craft(ingredients: EntityID[][], result: EntityID) {
    const entities = filterNullishValues(ingredients.flat().map((id) => world.entityToIndex.get(id)));

    const id = actions.add({
      id: `craft ${entities.join("/")}` as EntityID,
      metadata: { actionType: "craft", blockType: BlockIdToKey[result] },
      requirement: () => true,
      components: { OwnedBy: components.OwnedBy },
      execute: () => systems["system.Craft"].executeTyped(ingredients, { gasLimit: 1_700_000 }),
      updates: () =>
        entities.map((entity) => ({
          component: "OwnedBy",
          entity,
          value: { value: GodID },
        })),
    });

    await waitForActionCompletion(actions.Action, id);
  }

  function stake(chunkCoord: Coord) {
    const diamondEntityIndex = [
      ...runQuery([
        HasValue(components.OwnedBy, { value: network.connectedAddress.get() }),
        HasValue(components.Item, { value: BlockType.Diamond }),
      ]),
    ][0];

    if (diamondEntityIndex == null) return console.warn("No owned diamonds to stake");
    const diamondEntity = world.entities[diamondEntityIndex];

    actions.add({
      id: `stake+${chunkCoord.x}/${chunkCoord.y}` as EntityID,
      metadata: { actionType: "stake", blockType: "Diamond" },
      requirement: () => true,
      components: { OwnedBy: components.OwnedBy },
      execute: () => systems["system.Stake"].executeTyped(diamondEntity, chunkCoord, { gasLimit: 600_000 }),
      updates: () => [
        {
          component: "OwnedBy",
          entity: diamondEntityIndex,
          value: { value: GodID },
        },
      ],
    });
  }

  function claim(chunkCoord: Coord) {
    actions.add({
      id: `stake+${chunkCoord.x}/${chunkCoord.y}` as EntityID,
      metadata: { actionType: "claim", blockType: "Diamond" },
      requirement: () => true,
      components: {},
      execute: () => systems["system.Claim"].executeTyped(chunkCoord, { gasLimit: 600_000 }),
      updates: () => [],
    });
  }

  // --- STREAMS --------------------------------------------------------------------
  const connectedClients$ = timer(0, 5000).pipe(
    map<number, Promise<number>>(() => relay?.countConnected() || new Promise((res) => res(0))),
    awaitPromise()
  );

  // --- CONTEXT --------------------------------------------------------------------
  const context = {
    world,
    components,
    txQueue,
    systems,
    txReduced$,
    startSync,
    network,
    actions,
    api: {
      build,
      mine,
      craft,
      stake,
      claim,
      getBlockAtPosition,
      getECSBlockAtPosition,
      getTerrainBlockAtPosition,
    },
    dev: setupDevSystems(world, encoders, systems),
    streams: { connectedClients$ },
    config,
    relay,
    worldAddress: config.worldAddress,
    ecsEvent$,
    mappings,
    faucet,
  };

  return context;
}
