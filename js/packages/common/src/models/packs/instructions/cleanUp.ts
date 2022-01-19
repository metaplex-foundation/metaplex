import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { serialize } from 'borsh';

import { programIds, toPublicKey } from '../../../utils';
import { CleanUpArgs, PACKS_SCHEMA } from '../../../actions/packs';
import { findPackConfigProgramAddress } from '../find';

export async function cleanUp(
  packSetKey: PublicKey,
): Promise<TransactionInstruction> {
  const PROGRAM_IDS = programIds();

  const value = new CleanUpArgs();

  const store = PROGRAM_IDS.store;
  if (!store) {
    throw new Error('Store not initialized');
  }

  const packConfig = await findPackConfigProgramAddress(packSetKey);

  const data = Buffer.from(serialize(PACKS_SCHEMA, value));
  const keys = [
    // pack_set
    {
      pubkey: toPublicKey(packSetKey),
      isSigner: false,
      isWritable: true,
    },
    // pack_config
    {
      pubkey: toPublicKey(packConfig),
      isSigner: false,
      isWritable: true,
    },
  ];

  return new TransactionInstruction({
    keys,
    programId: toPublicKey(PROGRAM_IDS.pack_create),
    data,
  });
}
