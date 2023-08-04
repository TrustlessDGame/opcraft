import React, { FC, useState } from "react";
import { Button } from "./common";
import Modal from "./common/Modal";
import styled from "styled-components";
import CopyIcon from "./icons/CopyIcon";

interface TopupType {
  address?: string;
}

const Export: FC<TopupType> = ({ address }) => {
  const [openModal, setOpenModal] = useState(false);

  const onOpenModal = () => {
    setOpenModal(true);
  };

  const closeModal = () => {
    setOpenModal(false);
  };

  const returnPrivateKey = () => {
    const privateKey = localStorage.getItem("burnerWallet") || "";
    // return formatAddress(privateKey, 7, 6) || "...";
    return privateKey || "...";
  };

  return (
    <>
      <Button onClick={onOpenModal}>Export</Button>
      {openModal && (
        <Modal isOpen={openModal} onClose={closeModal} width="300px">
          <ModalContent>
            <p className="label">Your private key</p>
            <div className="wrap-text">
              <span className="prvKey">{returnPrivateKey()}</span>
              <span>
                <CopyIcon text={returnPrivateKey()} />
              </span>
            </div>
          </ModalContent>
        </Modal>
      )}
    </>
  );
};

export default Export;

const ModalContent = styled.div`
  .label {
    margin-bottom: 10px;
    color: yellow;
  }
  .wrap-text {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .prvKey {
      width: 80%;
      overflow: hidden;
      word-wrap: break-word;
      display: -webkit-box;
      -webkit-line-clamp: 1; /* number of lines to show */
      line-clamp: 1;
      -webkit-box-orient: vertical;
    }
  }
`;
