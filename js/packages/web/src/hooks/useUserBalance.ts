import {
  fromLamports,
  StringPublicKey,
  useMint,
  useUserAccounts,
  WRAPPED_SOL_MINT,
} from '@oyster/common';
import { useEffect, useMemo, useState } from 'react';
import { useSolPrice, useAllSplPrices } from '../contexts';

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
  // TODO: add option to register for different token prices without having to set them in env
  /*  console.log(
    '[--P]MINTADDRESS',
    mintAddress,
    useAllSplPrices(),
    useSolPrice(),
  ); */

  const solPrice = useSolPrice();
  const altSplPrice = useAllSplPrices().filter(
    a => a.tokenMint == mintAddress,
  )[0]?.tokenPrice;
  const tokenPrice =
    mintAddress == WRAPPED_SOL_MINT.toBase58() ? solPrice : altSplPrice;

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
      // TODO: Edge-case: If a number is too big (more than 10Mil) and the decimals
      //    for the token are > 8, the lamports.toNumber() crashes, as it is more then 53 bits.
      (res, item) => (res += item.info.amount.toNumber()),
      0,
    );
  }, [accounts]);

  const balance = useMemo(
    () => fromLamports(balanceLamports, mintInfo),
    [mintInfo, balanceLamports],
  );

  useEffect(() => {
    setBalanceInUSD(balance * tokenPrice);
  }, [balance, tokenPrice, mint, setBalanceInUSD]);

  return {
    balance,
    balanceLamports,
    balanceInUSD,
    accounts,
    hasBalance: accounts.length > 0 && balance > 0,
  };
}
