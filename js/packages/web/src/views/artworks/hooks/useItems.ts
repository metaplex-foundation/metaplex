import { useMeta } from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';

import { useCreatorArts, useUserArts } from '../../../hooks';
import { ArtworkViewState, Item } from '../types';

import { useUserPacksByEdition } from './useUserPacksByEdition';

export const useItems = ({
  activeKey,
}: {
  activeKey: ArtworkViewState;
}): Array<Item> => {
  const { publicKey } = useWallet();
  const ownedMetadata = useUserArts();
  const createdMetadata = useCreatorArts(publicKey?.toBase58() || '');
  const { metadata } = useMeta();
  const userPacks = useUserPacksByEdition();

  if (activeKey === ArtworkViewState.Owned) {
    return [...Object.values(userPacks), ...ownedMetadata.map(m => m.metadata)];
  }

  if (activeKey === ArtworkViewState.Created) {
    return createdMetadata;
  }

  return [...Object.values(userPacks), ...metadata];
};
