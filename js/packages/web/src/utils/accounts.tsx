import { useAccountsContext } from '@oyster/common';
import { AccountInfo, PublicKey } from '@solana/web3.js';
import { useMemo } from 'react';
import { PoolInfo } from './pools';

export type AccountParser = (
  pubkey: PublicKey,
  data: AccountInfo<Buffer>
) => ParsedAccountBase;

export interface ParsedAccountBase {
  pubkey: PublicKey;
  account: AccountInfo<Buffer>;
  info: any; // TODO: change to unkown
}

export const keyToAccountParser = new Map<string, AccountParser>();

export function useCachedPool(legacy = false) {
  const context = useAccountsContext();

  const allPools = context.pools as PoolInfo[] || [];
  const pools = useMemo(() => {
    return allPools.filter((p) => p.legacy === legacy);
  }, [allPools, legacy]);

  return {
    pools,
  };
}
