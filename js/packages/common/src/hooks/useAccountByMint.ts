import { PublicKey } from '@solana/web3.js';
import { useUserAccounts } from '../hooks/useUserAccounts';

export const useAccountByMint = (mint?: string | PublicKey) => {
  if (mint === undefined) {
    return undefined;
  }

  const { userAccounts } = useUserAccounts();
  const mintAddress = typeof mint === 'string' ? new PublicKey(mint) : mint;

  const index = userAccounts.findIndex(acc =>
    acc.info.mint.equals(mintAddress),
  );

  if (index !== -1) {
    return userAccounts[index];
  }

  return;
};
