import { ParsedAccount, useMeta } from '@oyster/common';
import { PackVoucher } from '@oyster/common/dist/lib/models/packs/accounts/PackVoucher';
import { ProvingProcess } from '@oyster/common/dist/lib/models/packs/accounts/ProvingProcess';
import { PackSet } from '@oyster/common/dist/lib/models/packs/accounts/PackSet';

import { ExtendedPack } from '../../../types/packs';

export const usePacksBasedOnProvingProcesses = (): ExtendedPack[] => {
  const { provingProcesses, packs, vouchers } = useMeta();

  const shouldEnableNftPacks = process.env.NEXT_ENABLE_NFT_PACKS === 'true';

  if (!shouldEnableNftPacks) {
    return [];
  }

  return getPacksBasedOnProvingProcesses({ provingProcesses, packs, vouchers });
};

const getPacksBasedOnProvingProcesses = ({
  provingProcesses,
  vouchers,
  packs,
}: {
  provingProcesses: Record<string, ParsedAccount<ProvingProcess>>;
  vouchers: Record<string, ParsedAccount<PackVoucher>>;
  packs: Record<string, ParsedAccount<PackSet>>;
}): ExtendedPack[] =>
  Object.values(provingProcesses).reduce<ExtendedPack[]>((acc, process) => {
    const pack = packs[process.info.packSet];
    const voucher = Object.values(vouchers).find(
      ({ info }) => info.packSet === process.info.packSet,
    );

    if (!voucher) {
      return acc;
    }

    return [
      ...acc,
      {
        ...pack,
        voucher: voucher.pubkey,
        voucherMetadataKey: voucher.info.metadata,
        cardsRedeemed: process.info.cardsRedeemed,
        provingProcessKey: process.pubkey,
      },
    ];
  }, []);
