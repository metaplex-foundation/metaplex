import {
  Edition,
  MasterEditionV1,
  MasterEditionV2,
  MetadataKey,
  ParsedAccount,
  pubkeyToString,
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
} from '@oyster/common/dist/lib/models/metaplex/index';
import { useEffect, useState } from 'react';
import { getEditions, getMasterEditions, getMetdataByCreator } from './getData';
import { useWallet } from '@solana/wallet-adapter-react';

export const useUserArts = (): SafetyDepositDraft[] => {
  const { publicKey } = useWallet();
  const key = pubkeyToString(publicKey);
  const { userAccounts } = useUserAccounts();
  const [masterEditions, setMasterEditions] = useState<
    Record<string, ParsedAccount<MasterEditionV1 | MasterEditionV2>>
  >({});
  const [editions, setEditions] = useState<
    Record<string, ParsedAccount<Edition>>
  >({});

  const arrayToObject = (array, keyField) =>
    array.reduce((obj, item) => {
      obj[item[keyField]] = item;
      return obj;
    }, {});

  const accountByMint = userAccounts.reduce((prev, acc) => {
    prev.set(acc.info.mint.toBase58(), acc);
    return prev;
  }, new Map<string, TokenAccount>());
  const [filtered, setFiltered] = useState<any>([]);
  useEffect(() => {
    if (!key) return;
    getMetdataByCreator(key).then(metadata => {
      if (metadata && metadata.length > 0) {
        setFiltered(metadata);
      }
    });
    getMasterEditions('masterEditionsV1').then(data => {
      console.log(data);
      if (data.length == 0) {
        getMasterEditions('masterEditionsV2').then(data => {
          const arr = arrayToObject(data, 'pubkey');
          setMasterEditions(arr);
        });
      } else {
        const arr = arrayToObject(data, 'pubkey');
        setMasterEditions(arr);
      }
    });
    getEditions().then(data => {
      const arr = arrayToObject(data, 'pubkey');
      setEditions(arr);
    });
  }, [key]);

  const ownedMetadata = filtered.filter(
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
