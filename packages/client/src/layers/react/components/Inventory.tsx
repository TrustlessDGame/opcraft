import React, { useEffect, useState } from "react";
import { registerUIComponent } from "../engine";
import { combineLatest, concat, map, of, scan } from "rxjs";
import styled from "styled-components";
import { Absolute, AbsoluteBorder, Background, Center, Crafting, Slot, Gold, Red } from "./common";
import { range } from "@latticexyz/utils";
import {
  defineQuery,
  EntityIndex,
  getComponentValue,
  getEntitiesWithValue,
  Has,
  HasValue,
  setComponent,
  UpdateType,
} from "@latticexyz/recs";
import { getBlockIconUrl } from "../../noa/constants";
import { BlockIdToKey } from "../../network/constants";
import { formatEntityID } from "@latticexyz/network";

// This gives us 36 inventory slots. As of now there are 34 types of items, so it should fit.
const INVENTORY_WIDTH = 9;
const INVENTORY_HEIGHT = 4;

export function registerInventory() {
  registerUIComponent(
    "Inventory",
    {
      rowStart: 11,
      rowEnd: 13,
      colStart: 1,
      colEnd: 13,
    },
    (layers) => {
      const {
        network: {
          components: { OwnedBy, Item },
          streams: { connectedClients$ },
          network: { connectedAddress },
        },
        noa: {
          components: { UI, InventoryIndex, SelectedSlot, CraftingTable },
          streams: { stakeAndClaim$ },
        },
      } = layers;

      const ownedByMeQuery = defineQuery([HasValue(OwnedBy, { value: connectedAddress.get() }), Has(Item)], {
        runOnInit: true,
      });

      const ownedByMe$ = concat<{ [key: string]: number }[]>(
        of({}),
        ownedByMeQuery.update$.pipe(
          scan((acc, curr) => {
            const blockID = getComponentValue(Item, curr.entity)?.value;
            if (!blockID) return { ...acc };
            acc[blockID] = acc[blockID] || 0;
            if (curr.type === UpdateType.Exit) {
              acc[blockID]--;
              return { ...acc };
            }

            acc[blockID]++;
            return { ...acc };
          }, {} as { [key: string]: number })
        )
      );

      const showInventory$ = concat(
        of({ layers, show: false, craftingSideLength: 2 }),
        UI.update$.pipe(
          map((e) => ({
            layers,
            show: e.value[0]?.showInventory,
            craftingSideLength: e.value[0]?.showCrafting ? 3 : 2, // Increase crafting side length if crafting flag is set
          }))
        )
      );

      const inventoryIndex$ = concat(of(0), InventoryIndex.update$.pipe(map((e) => e.entity)));
      const selectedSlot$ = concat(of(0), SelectedSlot.update$.pipe(map((e) => e.value[0]?.value)));
      const craftingTable$ = concat(of(0), CraftingTable.update$);

      return combineLatest([
        ownedByMe$,
        showInventory$,
        selectedSlot$,
        stakeAndClaim$,
        of(connectedAddress.get()),
        connectedClients$,
        inventoryIndex$,
        craftingTable$,
      ]).pipe(map((props) => ({ props })));
    },
    ({ props }) => {
      const [
        ownedByMe,
        { layers, show, craftingSideLength },
        selectedSlot,
        stakeAndClaim,
        connectedAddress,
        connectedClients,
      ] = props;

      const [holdingBlock, setHoldingBlock] = useState<EntityIndex | undefined>();

      useEffect(() => {
        if (!show) setHoldingBlock(undefined);
      }, [show]);

      useEffect(() => {
        if (holdingBlock == null) {
          document.body.style.cursor = "unset";
          return;
        }

        const blockID = world.entities[holdingBlock];
        const blockType = BlockIdToKey[blockID];
        const icon = getBlockIconUrl(blockType);
        document.body.style.cursor = `url(${icon}) 12 12, auto`;
      }, [holdingBlock]);

      const {
        noa: {
          world,
          api: { toggleInventory },
          components: { InventoryIndex },
        },
      } = layers;

      function close() {
        toggleInventory(false);
      }

      function moveItems(slot: number) {
        const blockAtSlot = [...getEntitiesWithValue(InventoryIndex, { value: slot })][0];
        const blockIDAtSlot = blockAtSlot == null ? null : layers.noa.world.entities[blockAtSlot];
        const ownedEntitiesOfType = blockIDAtSlot && ownedByMe[blockIDAtSlot];

        // If not currently holding a block, grab the block at this slot
        if (holdingBlock == null) {
          if (ownedEntitiesOfType) setHoldingBlock(blockAtSlot);
          return;
        }

        // Else (if currently holding a block), swap the holding block with the block at this position
        const holdingBlockSlot = getComponentValue(InventoryIndex, holdingBlock)?.value;
        if (holdingBlockSlot == null) {
          console.warn("holding block has no slot", holdingBlock);
          setHoldingBlock(undefined);
          return;
        }
        setComponent(InventoryIndex, holdingBlock, { value: slot });
        blockAtSlot && setComponent(InventoryIndex, blockAtSlot, { value: holdingBlockSlot });
        setHoldingBlock(undefined);
      }

      // Map each inventory slot to the corresponding block type at this slot index
      const Slots = [...range(INVENTORY_HEIGHT * INVENTORY_WIDTH)].map((i) => {
        const blockIndex: EntityIndex | undefined = [...getEntitiesWithValue(InventoryIndex, { value: i })][0];
        const blockID = blockIndex != null ? world.entities[blockIndex] : undefined;
        const quantity = blockID && ownedByMe[blockID];
        return (
          <Slot
            key={"slot" + i}
            blockID={quantity ? blockID : undefined}
            quantity={quantity || undefined}
            onClick={() => moveItems(i)}
            disabled={blockIndex === holdingBlock}
            selected={i === selectedSlot}
          />
        );
      });

      const Inventory = (
        <Absolute>
          <Center>
            <Background onClick={close} />
            <div>
              <AbsoluteBorder borderColor={"#999999"} borderWidth={3}>
                <Crafting
                  layers={layers}
                  holdingBlock={holdingBlock}
                  setHoldingBlock={setHoldingBlock}
                  sideLength={craftingSideLength}
                />
                <Wrapper>
                  {[...range(INVENTORY_WIDTH * (INVENTORY_HEIGHT - 1))]
                    .map((i) => i + INVENTORY_WIDTH)
                    .map((i) => Slots[i])}
                </Wrapper>
              </AbsoluteBorder>
            </div>
          </Center>
        </Absolute>
      );

      const { claim } = stakeAndClaim;
      const canBuild = claim && connectedAddress ? claim.claimer === formatEntityID(connectedAddress) : true;

      const ActionBar = (
        <RelativeCenter>
          <ConnectedPlayersContainer>
            <PlayerCount>{connectedClients}</PlayerCount>
            <PixelatedImage src="/img/mud-player.png" width={35} />
          </ConnectedPlayersContainer>
          <LogoContainer>
            <PixelatedImage src="/img/opcraft-dark.png" width={150} />
          </LogoContainer>
          {claim && !canBuild && (
            <Notification>
              <Red>X</Red> you cannot build or mine here. This chunk has been claimed by{" "}
              <Gold>
                {claim.claimer.substring(0, 6)}...{claim.claimer.substring(36, 42)}
              </Gold>
            </Notification>
          )}
          {claim && canBuild && (
            <Notification>
              <Gold>You control this chunk!</Gold>
            </Notification>
          )}
          <Wrapper>{[...range(INVENTORY_WIDTH)].map((i) => Slots[i])}</Wrapper>
        </RelativeCenter>
      );

      return (
        <>
          {show ? Inventory : null}
          {ActionBar}
        </>
      );
    }
  );
}

const PixelatedImage = styled.img`
  image-rendering: pixelated;
`;

const PlayerCount = styled.span`
  font-size: 1.5em;
  margin-left: 5px;
  margin-bottom: -5px;
`;

const ConnectedPlayersContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  left: 15px;
  bottom: 15px;
`;

const LogoContainer = styled.div`
  position: absolute;
  right: 15px;
  bottom: 15px;
`;

const Notification = styled.p`
  position: absolute;
  top: 25px;
`;

const RelativeCenter = styled(Center)`
  position: relative;
`;

const Wrapper = styled.div`
  position: absolute;
  bottom: 0px;
  background-color: rgb(0 0 0 / 40%);
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  align-items: center;
  pointer-events: all;
  border: 5px lightgray solid;
  z-index: 10;
`;
