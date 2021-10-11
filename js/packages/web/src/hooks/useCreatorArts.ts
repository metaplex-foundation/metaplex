import { useMeta } from '../contexts';
import { StringPublicKey } from '@oyster/common';
import { useMemo } from 'react';

export const useCreatorArts = (id?: StringPublicKey) => {
  const { metadata } = useMeta();
  const filtered = useMemo(
    () =>
      metadata.filter(m => m.info.data.creators?.some(c => c.address === id)),
    [metadata],
  );

  return filtered;
};
