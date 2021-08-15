import {
  MasterEditionV1,
  MetadataKey,
  ParsedAccount,
  TokenAccount,
  useUserAccounts,
} from '@oyster/common';
import BN from 'bn.js';
import { SafetyDepositDraft } from '../actions/createAuctionManager';
import {
  NonWinningConstraint,
  ParticipationConfigV2,
  WinningConfigType,
  WinningConstraint,
} from '../models/metaplex';
import { useMeta } from './../contexts';

export const useUserArts = (): SafetyDepositDraft[] => {
  const { metadata, masterEditions, editions } = useMeta();
  const { userAccounts } = useUserAccounts();

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
    let masterA;
    const masterEdition = possibleMasterEditions[i];
    if (masterEdition?.info.key == MetadataKey.MasterEditionV1) {
      masterA = accountByMint.get(
        (
          masterEdition as ParsedAccount<MasterEditionV1>
        )?.info.printingMint?.toBase58() || '',
      );
    }

    let winningConfigType: WinningConfigType;
    if (masterEdition?.info.key == MetadataKey.MasterEditionV1) {
      winningConfigType = WinningConfigType.PrintingV1;
    } else if (masterEdition?.info.key == MetadataKey.MasterEditionV2) {
      if (masterEdition.info.maxSupply) {
        winningConfigType = WinningConfigType.PrintingV2;
      } else {
        winningConfigType = WinningConfigType.Participation;
      }
    } else {
      winningConfigType = WinningConfigType.TokenOnlyTransfer;
    }

    if (a) {
      safetyDeposits.push({
        holding: a.pubkey,
        edition: possibleEditions[i],
        masterEdition,
        metadata: m,
        printingMintHolding: masterA?.pubkey,
        winningConfigType,
        amountRanges: [],
        participationConfig:
          winningConfigType == WinningConfigType.Participation
            ? new ParticipationConfigV2({
                winnerConstraint: WinningConstraint.ParticipationPrizeGiven,
                nonWinningConstraint: NonWinningConstraint.GivenForFixedPrice,
                fixedPrice: new BN(0),
              })
            : undefined,
      });
    }
    i++;
  });

  return safetyDeposits;
};
