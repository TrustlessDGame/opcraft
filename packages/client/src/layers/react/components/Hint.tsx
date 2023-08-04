import React from "react";
import styled from "styled-components";
import { CloseableContainer } from "./common";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export const Hint: React.FC<{ onClose: () => void }> = ({ onClose, children }) => {
  return (
    <HintContainer onClose={onClose}>
      <>{children}</>
      <StyledContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </HintContainer>
  );
};

const HintContainer = styled(CloseableContainer)`
  line-height: 1;
  pointer-events: all;
  padding-right: 23px;
  max-width: 200px;
`;

const StyledContainer = styled(ToastContainer)`
  &&&.Toastify__toast-container {
  }
  .Toastify__toast {
  }
  .Toastify__toast-body {
    div {
      text-shadow: none;
    }
  }
  .Toastify__progress-bar {
  }
`;
