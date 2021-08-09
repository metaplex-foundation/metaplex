import { PublicKey } from '@solana/web3.js';
import { useMeta } from '../contexts';
import { pubkeyToString } from '../utils/pubkeyToString';

export const useCreator = (id?: PublicKey | string) => {
  if (id === undefined) {
    return undefined;
  }

  const key = typeof id === 'string' ? new PublicKey(id) : id;

  const { whitelistedCreatorsByCreator } = useMeta();
  const creator = Object.values(whitelistedCreatorsByCreator).find(
    creator => creator.info.address.equals(key),
  );
  return creator;
};
