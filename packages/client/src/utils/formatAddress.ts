export const formatAddress = (address: string, prefix: number, suffix: number) => {
  const prefixLength = prefix || 4;
  const suffixLength = suffix || 4;

  const truncatedAddress = `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;

  return truncatedAddress;
};
