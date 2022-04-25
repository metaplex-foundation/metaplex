import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import {
  createUpdateExternalPriceAccountInstruction,
  ExternalPriceAccount,
  Key,
  UpdateExternalPriceAccountInstructionAccounts,
  UpdateExternalPriceAccountInstructionArgs,
} from '../generated';
import { QUOTE_MINT, VAULT_PROGRAM_ADDRESS } from '../mpl-token-vault';
import { InstructionsWithAccounts } from '../types';

/**
 * Creates the external price account needed for the {@link initVault}
 * instruction.
 * It uses {@link QUOTE_MINT} as its `priceMint`.
 *
 * @category CreateExternalPriceAccount
 * @category Instructions
 */
export async function createExternalPriceAccount(
  connection: Connection,
  payer: PublicKey,
): Promise<InstructionsWithAccounts<{ externalPriceAccount: PublicKey }>> {
  // -----------------
  // Create uninitialized external price account
  // -----------------
  const externalPriceAccountPair = Keypair.generate();

  const rentExempt = await connection.getMinimumBalanceForRentExemption(
    ExternalPriceAccount.byteSize,
  );

  const createExternalPriceAccountIx = SystemProgram.createAccount({
    fromPubkey: payer,
    newAccountPubkey: externalPriceAccountPair.publicKey,
    lamports: rentExempt,
    space: ExternalPriceAccount.byteSize, // 1 + 8 + 32 + 1
    programId: new PublicKey(VAULT_PROGRAM_ADDRESS),
  });

  // -----------------
  // Initialize External Price Account by "updating" it
  // -----------------
  const externalPriceAccount = ExternalPriceAccount.fromArgs({
    key: Key.ExternalAccountKeyV1,
    pricePerShare: 0,
    priceMint: QUOTE_MINT,
    allowedToCombine: true,
  });

  const args: UpdateExternalPriceAccountInstructionArgs = {
    externalPriceAccount,
  };
  const accounts: UpdateExternalPriceAccountInstructionAccounts = {
    externalPriceAccount: externalPriceAccountPair.publicKey,
  };

  const updateExternalPriceAccountIx = createUpdateExternalPriceAccountInstruction(accounts, args);
  return [
    [createExternalPriceAccountIx, updateExternalPriceAccountIx],
    [externalPriceAccountPair],
    { externalPriceAccount: externalPriceAccountPair.publicKey },
  ];
}
