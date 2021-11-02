import { TransactionInstruction } from '@solana/web3.js';
import { serialize } from 'borsh';
import { StringPublicKey, toPublicKey } from '../../utils';
import { programIds } from '../../utils/programIds';
import {
  ExternalPriceAccount,
  UpdateExternalPriceAccountArgs,
} from './entities';
import { VAULT_SCHEMA } from './schema';

export async function updateExternalPriceAccount(
  externalPriceAccountKey: StringPublicKey,
  externalPriceAccount: ExternalPriceAccount,
  instructions: TransactionInstruction[],
) {
  const vaultProgramId = programIds().vault;

  const value = new UpdateExternalPriceAccountArgs({ externalPriceAccount });
  const data = Buffer.from(serialize(VAULT_SCHEMA, value));

  const keys = [
    {
      pubkey: toPublicKey(externalPriceAccountKey),
      isSigner: false,
      isWritable: true,
    },
  ];
  instructions.push(
    new TransactionInstruction({
      keys,
      programId: toPublicKey(vaultProgramId),
      data,
    }),
  );
}
