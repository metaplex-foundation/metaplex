import {
  PublicKey,
  TransactionInstruction,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_CLOCK_PUBKEY,
  SystemProgram,
} from '@solana/web3.js';
import { serialize } from 'borsh';

import { programIds, toPublicKey, StringPublicKey } from '../../../utils';
import { PACKS_SCHEMA, RequestCardToRedeemArgs } from '../../..';
import { RequestCardToRedeemParams } from '..';
import { findProvingProcessProgramAddress } from '../find';

interface Params extends RequestCardToRedeemParams {
  packSetKey: PublicKey;
  edition: StringPublicKey;
  editionMint: StringPublicKey;
  packVoucher: StringPublicKey;
  tokenAccount: StringPublicKey;
  wallet: StringPublicKey;
}

export async function requestCardToRedeem({
  index,
  packSetKey,
  edition,
  editionMint,
  packVoucher,
  tokenAccount,
  wallet,
}: Params): Promise<TransactionInstruction> {
  const PROGRAM_IDS = programIds();

  const value = new RequestCardToRedeemArgs({
    index,
  });

  const store = PROGRAM_IDS.store;
  if (!store) {
    throw new Error('Store not initialized');
  }

  const provingProcess = await findProvingProcessProgramAddress(
    packSetKey,
    toPublicKey(editionMint),
  );

  const data = Buffer.from(serialize(PACKS_SCHEMA, value));
  const keys = [
    // pack_set
    {
      pubkey: toPublicKey(packSetKey),
      isSigner: false,
      isWritable: false,
    },
    // store
    {
      pubkey: toPublicKey(store),
      isSigner: false,
      isWritable: false,
    },
    // edition
    {
      pubkey: toPublicKey(edition),
      isSigner: false,
      isWritable: false,
    },
    // edition_mint
    {
      pubkey: toPublicKey(editionMint),
      isSigner: false,
      isWritable: false,
    },
    // pack_voucher
    {
      pubkey: toPublicKey(packVoucher),
      isSigner: false,
      isWritable: false,
    },
    // proving_process
    {
      pubkey: toPublicKey(provingProcess),
      isSigner: false,
      isWritable: true,
    },
    // user_wallet
    {
      pubkey: toPublicKey(wallet),
      isSigner: true,
      isWritable: false,
    },
    // user_token_account
    {
      pubkey: toPublicKey(tokenAccount),
      isSigner: false,
      isWritable: true,
    },
    // randomness_oracle
    {
      pubkey: programIds().oracle,
      isSigner: false,
      isWritable: false,
    },
    // clock
    {
      pubkey: toPublicKey(SYSVAR_CLOCK_PUBKEY),
      isSigner: false,
      isWritable: false,
    },
    // rent
    {
      pubkey: toPublicKey(SYSVAR_RENT_PUBKEY),
      isSigner: false,
      isWritable: false,
    },
    // system_program
    {
      pubkey: SystemProgram.programId,
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
