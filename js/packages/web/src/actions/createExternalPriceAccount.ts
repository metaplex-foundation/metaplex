import {
  Keypair,
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import { utils, actions, createMint } from '@oyster/common';

import { MintLayout } from '@solana/spl-token';
import BN from 'bn.js';
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

  const mintRentExempt = await connection.getMinimumBalanceForRentExemption(
    MintLayout.span,
  );

  const epaRentExempt = await connection.getMinimumBalanceForRentExemption(
    MAX_EXTERNAL_ACCOUNT_SIZE,
  );

  let externalPriceAccount = Keypair.generate();

  const priceMint = createMint(
    instructions,
    wallet.publicKey,
    mintRentExempt,
    0,
    wallet.publicKey,
    wallet.publicKey,
    signers,
  );

  let epaStruct = new ExternalPriceAccount({
    pricePerShare: new BN(0),
    priceMint: priceMint,
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
    priceMint,
    instructions,
    signers,
  };
}
