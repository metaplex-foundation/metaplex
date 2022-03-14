import { PublicKey } from '@solana/web3.js';

export type MintOptions = {
  //Use to mint normally to owner wallet then transfer to new wallet.
  useSPLTransfer: boolean;
  //publickey of the wallet to receive the NFT
  receivingWallet: PublicKey;
};
