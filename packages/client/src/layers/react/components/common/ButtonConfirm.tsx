import React, { Children, FC } from "react";
import styled from "styled-components";

interface ButtonComfirmType {
  children: React.ReactNode;
  onConfirm: (e: any) => void;
}

const ButtonConfirm: FC<ButtonComfirmType> = (props) => {
  const { children, onConfirm } = props;

  return (
    <ButtonComfirm>
      <button onClick={onConfirm}>{children}</button>
    </ButtonComfirm>
  );
};

export default ButtonConfirm;

const ButtonComfirm = styled.div`
  width: 100%;
  text-align: center;

  button {
    padding: 10px 20px;
    background: yellow;
    color: black;
    text-align: center;
    border: 10px;
    border-radius: 5px;
    font-weight: 600;
    margin-top: 20px;
  }
`;
