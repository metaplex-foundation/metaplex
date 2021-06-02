import { TokenAccount, useUserAccounts, useWallet } from '@oyster/common';
import { SafetyDepositDraft } from '../actions/createAuctionManager';
import { useMeta } from './../contexts';

export const useUserArts = (): SafetyDepositDraft[] => {
  const { metadata, masterEditions, editions, whitelistedCreatorsByCreator } =
    useMeta();
  const { userAccounts } = useUserAccounts();
  const { wallet } = useWallet();

  const accountByMint = userAccounts.reduce((prev, acc) => {
    prev.set(acc.info.mint.toBase58(), acc);
    return prev;
  }, new Map<string, TokenAccount>());

  const ownedMetadata = metadata.filter(
    m =>
      accountByMint.has(m.info.mint.toBase58()) &&
      (accountByMint?.get(m.info.mint.toBase58())?.info?.amount?.toNumber() ||
        0) > 0,
  );

  const possibleEditions = ownedMetadata.map(m =>
    m.info.edition ? editions[m.info.edition?.toBase58()] : undefined,
  );

  const possibleMasterEditions = ownedMetadata.map(m =>
    m.info.masterEdition
      ? masterEditions[m.info.masterEdition?.toBase58()]
      : undefined,
  );

  let safetyDeposits: SafetyDepositDraft[] = [];
  let i = 0;
  ownedMetadata.forEach(m => {
    let a = accountByMint.get(m.info.mint.toBase58());
    let masterA = accountByMint.get(
      possibleMasterEditions[i]?.info.printingMint?.toBase58() || '',
    );

    if (a) {
      safetyDeposits.push({
        holding: a.pubkey,
        edition: possibleEditions[i],
        masterEdition: possibleMasterEditions[i],
        metadata: m,
        printingMintHolding: masterA?.pubkey,
      });
    }
    i++;
  });

  return safetyDeposits;
};
