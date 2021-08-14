import { PublicKey } from '@solana/web3.js';
import { useMeta } from '../contexts';

export const useCreator = (id?: PublicKey | string) => {
  const { whitelistedCreatorsByCreator } = useMeta();
  const key = typeof id === 'string' ? id : id?.toBase58() || '';
  const creators = Object.values(whitelistedCreatorsByCreator).filter(
    creator => creator.info.address.toBase58() === key,
  );

  if (creators.length === 0) {
    return undefined;
  }

  return creators[0];
};
