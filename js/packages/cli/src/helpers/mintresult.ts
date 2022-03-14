import { PublicKey } from '@solana/web3.js';

export type MintResult = {
  metadataAccount: PublicKey;
  mint: PublicKey;
};
