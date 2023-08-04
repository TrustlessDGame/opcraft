import React, { FC, useState } from "react";
import { Button } from "./common";
import Modal from "./common/Modal";
import InputForm from "./common/Input";
import ButtonConfirm from "./common/ButtonConfirm";
import { ethers } from "ethers";
import { getProviderDefault } from "../../../utils/getProviderDefault";
import { toast } from "react-toastify";
import styled from "styled-components";
import LoadingView from "./common/LoadingView";

interface TopupType {
  address: string;
}

const Topup: FC<TopupType> = ({ address }) => {
  const [amountTopup, setAmountTopup] = useState(0);
  const [openModal, setOpenModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const provider = getProviderDefault();

  const onOpenModal = () => {
    setOpenModal(true);
  };

  const closeModal = () => {
    setOpenModal(false);
  };

  const _onTopup = async (amount: number) => {
    const accounts = await provider.listAccounts();
    const currentAddress = accounts[0];

    const balance = await provider.getBalance(currentAddress);
    const balanceInEther = Number(ethers.utils.parseEther(balance.toString()));

    if (balanceInEther < amount) {
      toast.warning("Your balance is not enough");
      return;
    }

    if (!amount || amount <= 0) {
      toast.warning("Amount invalid!");
      return;
    }
    try {
      const signerWallet = provider.getSigner();
      // Define the recipient's address and transfer amount
      const transferAmount = ethers.utils.parseEther(amount.toString());

      // Create a new transaction
      const transaction = {
        to: address,
        value: transferAmount,
      };

      const txResponse = await signerWallet.sendTransaction(transaction);

      if (txResponse) {
        setIsLoading(true);
      }

      // Wait for the transaction to be mined
      await txResponse.wait();
      toast.success("Topup successfully");
      setOpenModal(false);
    } catch (error: any) {
      console.log(error);
      toast.error(error.message || "Something wrongs!");
    } finally {
      setIsLoading(false);
    }
  };

  const onGetAmount = (value: string) => {
    setAmountTopup(parseFloat(value));
  };

  return (
    <>
      {isLoading && <LoadingView />}
      <Button onClick={onOpenModal}>Topup</Button>
      {openModal && (
        <Modal isOpen={openModal} onClose={closeModal} width="300px">
          <ModalContent>
            <form>
              <h2 className="modal-title">Topup</h2>
              <InputForm type="text" name="amount" label="Amount TC" handleChange={(value) => onGetAmount(value)} />
              <ButtonConfirm
                onConfirm={(e) => {
                  e.preventDefault();
                  _onTopup(amountTopup);
                }}
              >
                Topup now
              </ButtonConfirm>
            </form>
            {/* <button onClick={closeModal}>Close Modal</button> */}
          </ModalContent>
        </Modal>
      )}
    </>
  );
};

export default Topup;

const ModalContent = styled.div``;
