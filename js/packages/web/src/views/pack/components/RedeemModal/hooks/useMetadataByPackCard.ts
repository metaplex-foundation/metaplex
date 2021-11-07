import { Metadata, ParsedAccount, useMeta } from '@oyster/common';
import { useMemo } from 'react';

type PackMetadataByPackCard = Record<string, ParsedAccount<Metadata>>;

export const useMetadataByPackCard = (
  packId: string,
): PackMetadataByPackCard => {
  const { packCardsByPackSet, metadataByMasterEdition } = useMeta();

  const cards = packCardsByPackSet[packId];
  const metadata = useMemo(
    () =>
      cards?.reduce<PackMetadataByPackCard>(
        (packMetadata, { info, pubkey }) => {
          packMetadata[pubkey] = metadataByMasterEdition[info.master];
          return packMetadata;
        },
        {},
      ),
    [cards, metadataByMasterEdition],
  );

  return metadata;
};
