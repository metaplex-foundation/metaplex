import { programIds } from '@oyster/common';
import {
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import { serialize } from 'borsh';

import { getWhitelistedCreator, SCHEMA, SetWhitelistedCreatorArgs } from '.';

export async function setWhitelistedCreator(
  creator: PublicKey,
  activated: boolean,
  admin: PublicKey,
  payer: PublicKey,
  instructions: TransactionInstruction[],
) {
  const PROGRAM_IDS = programIds();

  const whitelistedCreatorPDAKey = await getWhitelistedCreator(creator);

  const value = new SetWhitelistedCreatorArgs({ activated });
  const data = Buffer.from(serialize(SCHEMA, value));

  const keys = [
    {
      pubkey: whitelistedCreatorPDAKey,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: admin,
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: payer,
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: creator,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: PROGRAM_IDS.store,
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

  instructions.push(
    new TransactionInstruction({
      keys,
      programId: PROGRAM_IDS.metaplex,
      data,
    }),
  );
}
