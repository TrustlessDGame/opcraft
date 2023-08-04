import React, { useEffect } from "react";
import styled from "styled-components";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  width?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, width }) => {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return isOpen ? (
    <ModalStyled>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-inner" onClick={(e) => e.stopPropagation()} style={{ width: width || "auto" }}>
          {children}
        </div>
      </div>
    </ModalStyled>
  ) : null;
};

export default Modal;

const ModalStyled = styled.div`
  /* Modal.css */
  .modal-title {
    text-align: center;
    margin-bottom: 30px;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #000000bd;
    z-index: 999;
    animation: fadeIn 0.3s;
  }

  .modal-inner {
    background-color: #303030e3;
    padding: 20px;
    border-radius: 10px;
    border: 1px solid white;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    animation: scaleIn 0.3s;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes scaleIn {
    from {
      transform: scale(0.8);
    }
    to {
      transform: scale(1);
    }
  }
`;
