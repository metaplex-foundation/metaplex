import {
  PublicKey,
  TransactionInstruction,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_CLOCK_PUBKEY,
} from '@solana/web3.js';
import { serialize } from 'borsh';

import { getWhitelistedCreator } from '../../metaplex';
import { programIds, toPublicKey, StringPublicKey } from '../../../utils';
import { InitPackSetParams } from '../interface';
import { InitPackSetArgs, PACKS_SCHEMA } from '../../..';

interface Params extends InitPackSetParams {
  packSetKey: PublicKey;
  authority: StringPublicKey;
}

export async function initPackSet({
  name,
  description,
  uri,
  mutable,
  distributionType,
  allowedAmountToRedeem,
  redeemStartDate,
  redeemEndDate,
  packSetKey,
  authority,
}: Params): Promise<TransactionInstruction> {
  const PROGRAM_IDS = programIds();

  const value = new InitPackSetArgs({
    name,
    description,
    uri,
    mutable,
    distributionType,
    allowedAmountToRedeem,
    redeemStartDate,
    redeemEndDate,
  });

  const store = PROGRAM_IDS.store;
  if (!store) {
    throw new Error('Store not initialized');
  }

  const whitelistedCreator = await getWhitelistedCreator(authority);

  const data = Buffer.from(serialize(PACKS_SCHEMA, value));
  const keys = [
    {
      pubkey: toPublicKey(packSetKey),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(authority),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(store),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: PROGRAM_IDS.oracle,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(SYSVAR_RENT_PUBKEY),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(SYSVAR_CLOCK_PUBKEY),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(whitelistedCreator),
      isSigner: false,
      isWritable: false,
    },
  ];

  return new TransactionInstruction({
    keys,
    programId: toPublicKey(PROGRAM_IDS.pack_create),
    data,
  });
}
