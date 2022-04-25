import { PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata';
import { Connection, Keypair, PublicKey, Transaction, SYSVAR_CLOCK_PUBKEY } from '@solana/web3.js';
import { createClaimResourceInstruction } from '../../src/generated/instructions';
import { createAndSignTransaction } from '../utils';

interface ClaimResourceParams {
  payer: Keypair;
  connection: Connection;
  market: PublicKey;
  treasuryHolder: PublicKey;
  sellingResource: PublicKey;
  vault: PublicKey;
  metadata: PublicKey;
  destination: PublicKey;
  vaultOwnerBump: number;
  owner: PublicKey;
}

export const createClaimResourceTransaction = async ({
  payer,
  connection,
  market,
  treasuryHolder,
  sellingResource,
  vault,
  metadata,
  destination,
  vaultOwnerBump,
  owner,
}: ClaimResourceParams): Promise<Transaction> => {
  const instruction = createClaimResourceInstruction(
    {
      market,
      treasuryHolder,
      sellingResource,
      sellingResourceOwner: payer.publicKey,
      vault,
      metadata,
      owner,
      destination,
      tokenMetadataProgram: PROGRAM_ID,
      clock: SYSVAR_CLOCK_PUBKEY,
    },
    {
      vaultOwnerBump,
    },
  );

  const claimResourceTx: Transaction = await createAndSignTransaction(
    connection,
    payer,
    [instruction],
    [payer],
  );

  return claimResourceTx;
};
