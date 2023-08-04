import React, { useState, ChangeEvent } from "react";
import styled from "styled-components";

interface InputProps {
  label: string;
  type?: string;
  name: string;
  placeholder?: string;
  handleChange: (value: string) => void;
}

const InputForm: React.FC<InputProps> = ({ label, type = "text", name, placeholder, handleChange }) => {
  const [value, setValue] = useState<string>("");

  const onChange_getValue = (event: ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;
    const numericValue = inputValue.replace(/[^0-9.]/g, ""); // Allow only digits and dot (decimal point)

    // Check for valid decimal format
    const isValidDecimal = /^(\d*\.\d*|\d*)$/.test(numericValue);
    if (isValidDecimal) {
      setValue(numericValue);
      handleChange(numericValue);
    }
  };

  return (
    <InputStyled>
      <label htmlFor={name}>{label}</label>
      <input
        type={type}
        name={name}
        id={name}
        value={value}
        onChange={onChange_getValue}
        placeholder={placeholder}
        autoComplete="off"
      />
    </InputStyled>
  );
};

export default InputForm;

const InputStyled = styled.div`
  label {
    margin-bottom: 10px;
    display: block;
  }
  input {
    border: 1px solid white;
    border-radius: 5px;
    padding: 10px;
    display: block;
    width: 100%;
    background: #4c4c4c;
    color: white;

    &:focus {
      outline: 0;
      box-shadow: 1px 2px 5px #ababab66;
    }
  }
`;
