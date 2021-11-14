import { useMemo } from 'react';
import { ParsedAccount } from '@oyster/common';
import { PackCard } from '@oyster/common/dist/lib/models/packs/accounts/PackCard';

import { SafetyDepositDraft } from '../../../actions/createAuctionManager';
import { useUserArts } from '../../../hooks';

export const useOpenedMetadata = (
  packCards: ParsedAccount<PackCard>[],
): SafetyDepositDraft[] => {
  const ownedMetadata = useUserArts();

  const metadata = useMemo(
    () =>
      ownedMetadata.reduce<SafetyDepositDraft[]>((acc, value) => {
        const parent = value.edition?.info.parent;
        if (parent) {
          const metadataExistsInPack = packCards.some(
            ({ info }) => info.master === parent,
          );

          if (metadataExistsInPack) {
            acc.push(value);
          }
        }

        return acc;
      }, []),
    [ownedMetadata.length, packCards],
  );

  return metadata;
};
