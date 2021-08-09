import { useMeta } from '../contexts';
import { PublicKey } from '@solana/web3.js';

export const useCreatorArts = (id?: PublicKey | string) => {
  if (id === undefined) {
    return [];
  }
  const key = typeof id === 'string' ? new PublicKey(id) : id;

  const { metadata } = useMeta();
  const filtered = metadata.filter(m =>
    m.info.data.creators?.some(c => c.address.equals(key)),
  );

  return filtered;
};
