import {
  fromLamports,
  StringPublicKey,
  useMint,
  useUserAccounts,
} from '@oyster/common';
import { useEffect, useMemo, useState } from 'react';
import { useSolPrice } from '../contexts';

export function useUserBalance(
  mintAddress?: StringPublicKey,
  account?: StringPublicKey,
) {
  const mint = useMemo(
    () => (typeof mintAddress === 'string' ? mintAddress : mintAddress),
    [mintAddress],
  );
  const { userAccounts } = useUserAccounts();
  const [balanceInUSD, setBalanceInUSD] = useState(0);
  // TODO: add option to register for different token prices
  const solPrice = useSolPrice();

  const mintInfo = useMint(mint);
  const accounts = useMemo(() => {
    return userAccounts
      .filter(
        acc =>
          mint === acc.info.mint.toBase58() &&
          (!account || account === acc.pubkey),
      )
      .sort((a, b) => b.info.amount.sub(a.info.amount).toNumber());
  }, [userAccounts, mint, account]);

  const balanceLamports = useMemo(() => {
    return accounts.reduce(
      (res, item) => (res += item.info.amount.toNumber()),
      0,
    );
  }, [accounts]);

  const balance = useMemo(
    () => fromLamports(balanceLamports, mintInfo),
    [mintInfo, balanceLamports],
  );

  useEffect(() => {
    setBalanceInUSD(balance * solPrice);
  }, [balance, solPrice, mint, setBalanceInUSD]);

  return {
    balance,
    balanceLamports,
    balanceInUSD,
    accounts,
    hasBalance: accounts.length > 0 && balance > 0,
  };
}
