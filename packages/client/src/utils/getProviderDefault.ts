import { ethers } from "ethers";

declare global {
  interface Window {
    ethereum: any;
  }
}
export const getProviderDefault = () => {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  return provider;
};
