import {
  MasterEditionV1,
  MetadataKey,
  ParsedAccount,
  useUserAccounts,
} from '@oyster/common';
import BN from 'bn.js';
import { SafetyDepositDraft } from '../actions/createAuctionManager';
import {
  NonWinningConstraint,
  ParticipationConfigV2,
  WinningConfigType,
  WinningConstraint,
} from '@oyster/common/dist/lib/models/metaplex/index';
import { useMeta } from './../contexts';

export const useUserArts = (): SafetyDepositDraft[] => {
  const { metadata, masterEditions, editions } = useMeta();
  const { accountByMint } = useUserAccounts();

  const ownedMetadata = metadata.filter(
    m =>
      accountByMint.has(m.info.mint) &&
      (accountByMint?.get(m.info.mint)?.info?.amount?.toNumber() || 0) > 0,
  );

  const possibleEditions = ownedMetadata.map(m =>
    m.info.edition ? editions[m.info.edition] : undefined,
  );

  const possibleMasterEditions = ownedMetadata.map(m =>
    m.info.masterEdition ? masterEditions[m.info.masterEdition] : undefined,
  );

  const safetyDeposits: SafetyDepositDraft[] = [];
  let i = 0;
  ownedMetadata.forEach(m => {
    const a = accountByMint.get(m.info.mint);
    let masterA;
    const masterEdition = possibleMasterEditions[i];
    if (masterEdition?.info.key == MetadataKey.MasterEditionV1) {
      masterA = accountByMint.get(
        (masterEdition as ParsedAccount<MasterEditionV1>)?.info.printingMint ||
          '',
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
