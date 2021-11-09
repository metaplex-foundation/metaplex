import {
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import BN from 'bn.js';
import { serialize } from 'borsh';

import { SCHEMA, SetStoreIndexArgs } from '.';
import { programIds, StringPublicKey, toPublicKey } from '../../utils';

export async function setStoreIndex(
  storeIndex: StringPublicKey,
  auctionCache: StringPublicKey,
  payer: StringPublicKey,
  page: BN,
  offset: BN,
  instructions: TransactionInstruction[],
  belowCache?: StringPublicKey,
  aboveCache?: StringPublicKey,
) {
  const PROGRAM_IDS = programIds();
  const store = PROGRAM_IDS.store;
  if (!store) {
    throw new Error('Store not initialized');
  }

  const value = new SetStoreIndexArgs({ page, offset });
  const data = Buffer.from(serialize(SCHEMA, value));

  const keys = [
    {
      pubkey: toPublicKey(storeIndex),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(payer),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(auctionCache),
      isSigner: false,
      isWritable: false,
    },

    {
      pubkey: toPublicKey(store),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: PROGRAM_IDS.system,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ];

  if (aboveCache) {
    keys.push({
      pubkey: toPublicKey(aboveCache),
      isSigner: false,
      isWritable: false,
    });
  }

  if (belowCache) {
    keys.push({
      pubkey: toPublicKey(belowCache),
      isSigner: false,
      isWritable: false,
    });
  }
  instructions.push(
    new TransactionInstruction({
      keys,
      programId: toPublicKey(PROGRAM_IDS.metaplex),
      data,
    }),
  );
}
