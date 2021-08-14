import { PublicKey } from '@solana/web3.js';
import { useMeta } from '../contexts';
import { pubkeyToString } from '../utils/pubkeyToString';

export const useCreator = (id?: PublicKey | string) => {
  const { whitelistedCreatorsByCreator } = useMeta();
  const key = pubkeyToString(id);
  const creator = Object.values(whitelistedCreatorsByCreator).find(
    creator => creator.info.address.toBase58() === key,
  );
  return creator;
};
