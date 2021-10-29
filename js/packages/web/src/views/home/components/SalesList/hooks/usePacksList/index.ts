import { ParsedAccount, useMeta } from '@oyster/common';
import { PackSet } from '@oyster/common/dist/lib/models/packs/accounts/PackSet';

export const usePacksList = (): ParsedAccount<PackSet>[] => {
  const { packs } = useMeta();

  return Object.values(packs);
};
