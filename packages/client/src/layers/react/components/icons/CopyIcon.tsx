import React from "react";
import { toast } from "react-toastify";

const CopyIcon = ({ text }: { text: string }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    toast.success("Copy successfully!");
  };

  return (
    <div className="copy-icon" onClick={handleCopy}>
      <svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="6.5" y="6.5" width="9" height="13" rx="1.5" stroke="#ffffff" />
        <path
          d="M8.5 6C8.5 5.17157 9.17157 4.5 10 4.5H16C16.8284 4.5 17.5 5.17157 17.5 6V16C17.5 16.8284 16.8284 17.5 16 17.5"
          stroke="#ffffff"
        />
      </svg>
    </div>
  );
};

export default CopyIcon;
