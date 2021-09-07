import { useUserAccounts } from '@oyster/common';
import { useMeta } from './../contexts';
import { getOwnedMeta } from '@oyster/common/dist/lib/contexts/meta/getOwnedMeta';

export const useUserArts = () => {
  const state = useMeta();
  const { userAccounts } = useUserAccounts();

  return getOwnedMeta(userAccounts, state);
};
