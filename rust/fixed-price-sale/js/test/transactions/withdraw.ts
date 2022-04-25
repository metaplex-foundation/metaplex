import { ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Connection, Keypair, PublicKey, Transaction, SYSVAR_CLOCK_PUBKEY } from '@solana/web3.js';
import { createAndSignTransaction } from '../utils';
import { createWithdrawInstruction } from '../../src/generated/instructions';

interface WithdrawParams {
  payer: Keypair;
  connection: Connection;
  market: PublicKey;
  payoutTicket: PublicKey;
  destination: PublicKey;
  treasuryMint: PublicKey;
  treasuryHolder: PublicKey;
  metadata: PublicKey;
  sellingResource: PublicKey;
  payoutTicketBump: number;
  treasuryOwnerBump: number;
  treasuryOwner: PublicKey;
  primaryMetadataCreators: PublicKey;
}

export const createWithdrawTransaction = async ({
  payer,
  connection,
  market,
  payoutTicket,
  destination,
  treasuryMint,
  treasuryHolder,
  metadata,
  sellingResource,
  treasuryOwnerBump,
  payoutTicketBump,
  treasuryOwner,
  primaryMetadataCreators,
}: WithdrawParams): Promise<Transaction> => {
  const instruction = await createWithdrawInstruction(
    {
      market,
      sellingResource,
      metadata,
      treasuryHolder,
      treasuryMint,
      owner: treasuryOwner,
      destination,
      funder: payer.publicKey,
      payer: payer.publicKey,
      payoutTicket: payoutTicket,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      primaryMetadataCreators,
      clock: SYSVAR_CLOCK_PUBKEY,
    },
    {
      treasuryOwnerBump,
      payoutTicketBump,
    },
  );

  const withdrawTx: Transaction = await createAndSignTransaction(
    connection,
    payer,
    [instruction],
    [payer],
  );

  return withdrawTx;
};
