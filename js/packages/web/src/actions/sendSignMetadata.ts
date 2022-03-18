import { Keypair, Connection, TransactionInstruction } from '@solana/web3.js';
import {
  SendSignedTransactionResult,
  sendTransactionWithRetry,
  signMetadata,
  StringPublicKey,
} from '@oyster/common';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { WalletContextState } from '@solana/wallet-adapter-react';

export async function sendSignMetadata(
  connection: Connection,
  wallet: WalletContextState,
  metadata: StringPublicKey
): Promise<SendSignedTransactionResult> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const signers: Keypair[] = [];
  const instructions: TransactionInstruction[] = [];

  await signMetadata(metadata, wallet.publicKey.toBase58(), instructions);

  return await sendTransactionWithRetry(connection, wallet, instructions, signers, 'confirmed');
}
