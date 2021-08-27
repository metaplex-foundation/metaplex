import { PublicKey } from '@solana/web3.js';

export const pubkeyToString = (key: PublicKey | string = '') => {
  return typeof key === 'string' ? key : key?.toBase58() || '';
};
