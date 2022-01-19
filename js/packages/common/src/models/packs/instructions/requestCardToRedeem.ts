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
import {
  findPackConfigProgramAddress,
  findProvingProcessProgramAddress,
} from '../find';

interface Params extends RequestCardToRedeemParams {
  packSetKey: PublicKey;
  editionKey: StringPublicKey;
  editionMint: StringPublicKey;
  voucherKey: StringPublicKey;
  tokenAccount?: StringPublicKey;
  wallet: PublicKey;
  randomOracle: StringPublicKey;
}

export async function requestCardToRedeem({
  index,
  packSetKey,
  editionKey,
  editionMint,
  voucherKey,
  tokenAccount,
  wallet,
  randomOracle,
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
    wallet,
    toPublicKey(editionMint),
  );
  const packConfig = await findPackConfigProgramAddress(packSetKey);

  const data = Buffer.from(serialize(PACKS_SCHEMA, value));
  const keys = [
    // pack_set
    {
      pubkey: toPublicKey(packSetKey),
      isSigner: false,
      isWritable: false,
    },
    // pack_config
    {
      pubkey: toPublicKey(packConfig),
      isSigner: false,
      isWritable: true,
    },
    // store
    {
      pubkey: toPublicKey(store),
      isSigner: false,
      isWritable: false,
    },
    // edition
    {
      pubkey: toPublicKey(editionKey),
      isSigner: false,
      isWritable: false,
    },
    // edition_mint
    {
      pubkey: toPublicKey(editionMint),
      isSigner: false,
      isWritable: true,
    },
    // pack_voucher
    {
      pubkey: toPublicKey(voucherKey),
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
      pubkey: wallet,
      isSigner: true,
      isWritable: true,
    },
    // randomness_oracle
    {
      pubkey: toPublicKey(randomOracle),
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
    // spl_token program
    {
      pubkey: programIds().token,
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

  if (tokenAccount) {
    // user_token_account
    keys.push({
      pubkey: toPublicKey(tokenAccount),
      isSigner: false,
      isWritable: true,
    });
  }

  return new TransactionInstruction({
    keys,
    programId: toPublicKey(PROGRAM_IDS.pack_create),
    data,
  });
}
