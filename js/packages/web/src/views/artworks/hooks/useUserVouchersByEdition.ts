import { Metadata, ParsedAccount, useMeta } from '@oyster/common';
import { useMemo } from 'react';
import { SafetyDepositDraft } from '../../../actions/createAuctionManager';
import { useUserArts } from '../../../hooks';
import { ExtendedVoucherByKey, VoucherByKey } from '../types';

export const useUserVouchersByEdition = (): ExtendedVoucherByKey => {
  const { vouchers, metadata } = useMeta();
  const ownedMetadata = useUserArts();

  const vouchersByEdition = useMemo(
    () =>
      getVouchersByEdition({
        ownedMetadata,
        metadata,
        vouchers,
      }),
    [ownedMetadata, vouchers],
  );

  return vouchersByEdition;
};

const getVouchersByEdition = ({
  ownedMetadata,
  metadata,
  vouchers,
}: {
  ownedMetadata: SafetyDepositDraft[];
  metadata: ParsedAccount<Metadata>[];
  vouchers: VoucherByKey;
}): ExtendedVoucherByKey => {
  // Get master editions related to voucher
  const vouchersByMasterEdition = getVouchersByMasterEdition({
    metadata,
    vouchers,
  });

  // Return all user owned editions (prints) for each master edition
  return ownedMetadata.reduce<ExtendedVoucherByKey>((acc, metadata) => {
    if (metadata.edition) {
      const voucher = vouchersByMasterEdition[metadata.edition.info.parent];

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

const getVouchersByMasterEdition = ({
  metadata,
  vouchers,
}: {
  metadata: ParsedAccount<Metadata>[];
  vouchers: VoucherByKey;
}): VoucherByKey =>
  metadata.reduce<VoucherByKey>((acc, metadata) => {
    if (metadata.info.masterEdition) {
      const metadataPubkey = metadata.pubkey;
      const voucher = Object.values(vouchers).find(
        ({ info }) => info.metadata === metadataPubkey,
      );

      if (voucher) {
        acc[metadata.info.masterEdition] = voucher;
      }
    }

    return acc;
  }, {});
