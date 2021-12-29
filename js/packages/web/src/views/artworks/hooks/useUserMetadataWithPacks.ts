import { ParsedAccount, useMeta } from '@oyster/common';
import { ProvingProcess } from '@oyster/common/dist/lib/models/packs/accounts/ProvingProcess';

import { SafetyDepositDraft } from '../../../actions/createAuctionManager';
import { useUserArts } from '../../../hooks';
import { PackByKey, VoucherByKey } from '../../../types/packs';
import { Item } from '../types';

// This hook joins user metadata with packs in the same view
// If there is a pack that can be assigned to a metadata edition
// Then a pack entity will be returned
// SafetyDeposit otherwise
export const useUserMetadataWithPacks = (): Item[] => {
  const { vouchers, packs, provingProcesses } = useMeta();
  const ownedMetadata = useUserArts();

  const shouldEnableNftPacks = process.env.NEXT_ENABLE_NFT_PACKS === 'true';

  if (!shouldEnableNftPacks) {
    return ownedMetadata;
  }

  return getMetadataWithPacks({
    ownedMetadata,
    vouchers,
    packs,
    provingProcesses,
  });
};

const getMetadataWithPacks = ({
  ownedMetadata,
  vouchers,
  packs,
  provingProcesses,
}: {
  ownedMetadata: SafetyDepositDraft[];
  vouchers: VoucherByKey;
  packs: PackByKey;
  provingProcesses: Record<string, ParsedAccount<ProvingProcess>>;
}): Item[] =>
  // Go through owned metadata
  // If it's an edition, check if this edition can be used as a voucher to open a pack
  // Return ExtendedPack entity if so
  ownedMetadata.reduce<Item[]>((acc, metadata) => {
    if (!metadata.edition) {
      return [...acc, metadata];
    }

    const masterEdition = metadata.edition?.info.parent;
    const voucher = Object.values(vouchers).find(
      ({ info }) => info.master === masterEdition,
    );

    if (!voucher) {
      return [...acc, metadata];
    }

    const doesHaveProvingProcess = Object.values(provingProcesses).find(
      ({ info }) => info.voucherMint === metadata.metadata.info.mint,
    );

    if (doesHaveProvingProcess) {
      return acc;
    }

    return [
      ...acc,
      {
        ...packs[voucher.info.packSet],
        voucher: voucher.pubkey,
        voucherMetadataKey: metadata.metadata.pubkey,
        mint: metadata.metadata.info.mint,
      },
    ];
  }, []);
