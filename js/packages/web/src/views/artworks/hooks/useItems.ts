import { Metadata, ParsedAccount, useMeta } from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';

import { useCreatorArts, useUserArts } from '../../../hooks';
import { ArtworkViewState, ExtendedPackByKey, Item } from '../types';

import { useUserPacksByEdition } from './useUserPacksByEdition';
import { PackVoucher } from '@oyster/common/dist/lib/models/packs/accounts/PackVoucher';
import { ProvingProcess } from '@oyster/common/dist/lib/models/packs/accounts/ProvingProcess';
import { PackSet } from '@oyster/common/dist/lib/models/packs/accounts/PackSet';

export const useItems = ({
  activeKey,
}: {
  activeKey: ArtworkViewState;
}): Item[] | ParsedAccount<Metadata>[] => {
  const { publicKey } = useWallet();
  const ownedMetadata = useUserArts();
  const createdMetadata = useCreatorArts(publicKey?.toBase58() || '');
  const { metadata, provingProcesses, packs, vouchers } = useMeta();
  const userPacks = useUserPacksByEdition();

  const shouldEnableNftPacks = process.env.NEXT_ENABLE_NFT_PACKS === 'true';

  if (activeKey === ArtworkViewState.Owned) {
    return [
      ...mergeMetadataWithPacks(
        ownedMetadata.map(m => m.metadata),
        userPacks,
      ),
      ...(shouldEnableNftPacks
        ? getPacksBasedOnProvingProcesses({ provingProcesses, vouchers, packs })
        : []),
    ];
  }

  if (activeKey === ArtworkViewState.Created) {
    return createdMetadata;
  }

  return [
    ...mergeMetadataWithPacks(metadata, userPacks),
    ...(shouldEnableNftPacks
      ? getPacksBasedOnProvingProcesses({ provingProcesses, vouchers, packs })
      : []),
  ];
};

function mergeMetadataWithPacks(
  metadata: ParsedAccount<Metadata>[],
  userPacks: ExtendedPackByKey,
): Item[] {
  return metadata.map(m => {
    if (m.info.edition && userPacks[m.info.edition]) {
      return { ...userPacks[m.info.edition], voucherMetadataKey: m.pubkey };
    }
    return m;
  }) as Item[];
}

const getPacksBasedOnProvingProcesses = ({
  provingProcesses,
  vouchers,
  packs,
}: {
  provingProcesses: Record<string, ParsedAccount<ProvingProcess>>;
  vouchers: Record<string, ParsedAccount<PackVoucher>>;
  packs: Record<string, ParsedAccount<PackSet>>;
}): Item[] =>
  Object.values(provingProcesses).reduce((acc: Item[], process): Item[] => {
    const pack = packs[process.info.packSet];
    const voucher = Object.values(vouchers).find(
      v => v.info.packSet === process.info.packSet,
    );
    if (voucher) {
      acc.push({
        ...pack,
        voucherMetadataKey: voucher.info.metadata,
        cardsRedeemed: process.info.cardsRedeemed,
        provingProcessKey: process.pubkey,
      });
    }
    return acc;
  }, []);
