export const trimWalletAddress = (address: string = '') => {
  // Trim long wallet address with first and last four characters and add ... in between
  return `${address.slice(0, 4)}...${address.slice(address.length - 4)}`
}

export default trimWalletAddress
