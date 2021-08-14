import { useMemo } from 'react';
import names from '../config/userNames.json';
import { Artist } from '../types';

// TODO: reuse types
export type CreatorInfo = Omit<Artist, 'address'>;

export const useCreatorNameService = () => {
  const getInfo = useMemo(
    () => (creatorAddress: string) => {
      const nameInfo =
        (names as Record<string, CreatorInfo>)[creatorAddress] || {};
      return nameInfo;
    },
    [],
  );

  return getInfo;
};
