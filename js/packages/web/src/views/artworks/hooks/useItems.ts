import { Metadata, ParsedAccount, useMeta } from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';

import { useCreatorArts, useUserArts } from '../../../hooks';
import { ArtworkViewState, ExtendedPackByKey, Item } from '../types';

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
    return mergeMetadataWithPacks(
      ownedMetadata.map(m => m.metadata),
      userPacks,
    );
  }

  if (activeKey === ArtworkViewState.Created) {
    return createdMetadata;
  }

  return mergeMetadataWithPacks(metadata, userPacks);
};

function mergeMetadataWithPacks(
  matadata: ParsedAccount<Metadata>[],
  userPacks: ExtendedPackByKey,
): Item[] {
  return matadata.map(m => {
    if (m.info.edition && userPacks[m.info.edition]) {
      return { ...userPacks[m.info.edition], voucherMatadata: m };
    }
    return m;
  });
}
