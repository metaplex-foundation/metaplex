import {
  Keypair,
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import { utils, actions } from '@oyster/common';

import BN from 'bn.js';
import { QUOTE_MINT } from '../constants';
const {
  updateExternalPriceAccount,
  ExternalPriceAccount,
  MAX_EXTERNAL_ACCOUNT_SIZE,
} = actions;

// This command creates the external pricing oracle
export async function createExternalPriceAccount(
  connection: Connection,
  wallet: any,
): Promise<{
  priceMint: PublicKey;
  externalPriceAccount: PublicKey;
  instructions: TransactionInstruction[];
  signers: Keypair[];
}> {
  const PROGRAM_IDS = utils.programIds();

  let signers: Keypair[] = [];
  let instructions: TransactionInstruction[] = [];

  const epaRentExempt = await connection.getMinimumBalanceForRentExemption(
    MAX_EXTERNAL_ACCOUNT_SIZE,
  );

  let externalPriceAccount = Keypair.generate();

  let epaStruct = new ExternalPriceAccount({
    pricePerShare: new BN(0),
    priceMint: QUOTE_MINT,
    allowedToCombine: true,
  });

  const uninitializedEPA = SystemProgram.createAccount({
    fromPubkey: wallet.publicKey,
    newAccountPubkey: externalPriceAccount.publicKey,
    lamports: epaRentExempt,
    space: MAX_EXTERNAL_ACCOUNT_SIZE,
    programId: PROGRAM_IDS.vault,
  });
  instructions.push(uninitializedEPA);
  signers.push(externalPriceAccount);

  await updateExternalPriceAccount(
    externalPriceAccount.publicKey,
    epaStruct,
    instructions,
  );

  return {
    externalPriceAccount: externalPriceAccount.publicKey,
    priceMint: QUOTE_MINT,
    instructions,
    signers,
  };
}
