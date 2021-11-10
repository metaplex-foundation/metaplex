import { ParsedAccount, useMeta } from '@oyster/common';
import { PackSet } from '@oyster/common/dist/lib/models/packs/accounts/PackSet';

export const usePacksList = (): ParsedAccount<PackSet>[] => {
  const { packs } = useMeta();
  const shouldEnableNftPacks = process.env.NEXT_ENABLE_NFT_PACKS;

  if (!shouldEnableNftPacks) {
    return [];
  }

  return Object.values(packs);
};
