import {
  Keypair,
  Connection,
  TransactionInstruction,
  PublicKey,
} from '@solana/web3.js';
import { sendTransactionWithRetry, signMetadata } from '@oyster/common';

export async function sendSignMetadata(
  connection: Connection,
  wallet: any,
  metadata: PublicKey,
) {
  let signers: Keypair[] = [];
  let instructions: TransactionInstruction[] = [];

  await signMetadata(metadata, wallet.publicKey, instructions);

  await sendTransactionWithRetry(
    connection,
    wallet,
    instructions,
    signers,
    'single',
  );
}
