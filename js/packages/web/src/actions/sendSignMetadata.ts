import { Keypair, Connection, TransactionInstruction } from '@solana/web3.js';
import {
  sendTransactionWithRetry,
  signMetadata,
  StringPublicKey,
} from '@oyster/common';

export async function sendSignMetadata(
  connection: Connection,
  wallet: any,
  metadata: StringPublicKey,
) {
  let signers: Keypair[] = [];
  let instructions: TransactionInstruction[] = [];

  await signMetadata(metadata, wallet.publicKey.toBase58(), instructions);

  await sendTransactionWithRetry(
    connection,
    wallet,
    instructions,
    signers,
    'single',
  );
}
