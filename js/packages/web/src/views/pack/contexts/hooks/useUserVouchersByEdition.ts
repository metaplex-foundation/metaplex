import { useMeta } from '@oyster/common';
import { useMemo } from 'react';

import { SafetyDepositDraft } from '../../../../actions/createAuctionManager';
import { useUserArts } from '../../../../hooks';
import { ExtendedVoucherByKey, VoucherByKey } from '../../../../types/packs';

export const useUserVouchersByEdition = (): ExtendedVoucherByKey => {
  const { vouchers } = useMeta();
  const ownedMetadata = useUserArts();

  const vouchersByEdition = useMemo(
    () =>
      getVouchersByEdition({
        ownedMetadata,
        vouchers,
      }),
    [ownedMetadata, vouchers],
  );

  return vouchersByEdition;
};

const getVouchersByEdition = ({
  ownedMetadata,
  vouchers,
}: {
  ownedMetadata: SafetyDepositDraft[];
  vouchers: VoucherByKey;
}): ExtendedVoucherByKey => {
  // Return all user owned editions (prints) for each master edition
  return ownedMetadata.reduce<ExtendedVoucherByKey>((acc, metadata) => {
    const masterEdition = metadata.edition?.info.parent;

    if (metadata.edition && masterEdition) {
      const voucher = Object.values(vouchers).find(
        ({ info }) => info.master === masterEdition,
      );

      if (voucher) {
        acc[metadata.edition.pubkey] = {
          ...voucher,
          mint: metadata.metadata.info.mint,
          edition: metadata.edition.pubkey,
        };
      }
    }
    return acc;
  }, {});
};
