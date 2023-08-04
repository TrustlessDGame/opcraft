import React, { FC } from "react";
import styled from "styled-components";

interface LoadingViewType {
  text?: string;
}

const LoadingView: FC<LoadingViewType> = ({ text }) => {
  return (
    <LoadingStyled>
      <div className="loading-inner">
        <div className="loading-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
            style={{
              margin: "auto",
              background: "none",
              display: "block",
              shapeRendering: "auto",
            }}
            width="80px"
            height="80px"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid"
          >
            <circle
              cx="50"
              cy="50"
              r="32"
              strokeWidth="8"
              stroke="#ffffff"
              strokeDasharray="50.26548245743669 50.26548245743669"
              fill="none"
              strokeLinecap="round"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                repeatCount="indefinite"
                dur="1s"
                keyTimes="0;1"
                values="0 50 50;360 50 50"
              />
            </circle>
          </svg>
        </div>
        <p className="text">{text || "Wait a moment..."}</p>
      </div>
    </LoadingStyled>
  );
};

export default LoadingView;

const LoadingStyled = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000000bd;
  z-index: 9999;

  .text {
    color: white;
    text-align: center;
    display: block;
    margin-top: 10px;
  }
`;
