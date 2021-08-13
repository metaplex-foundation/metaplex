import {
  Keypair,
  Connection,
  TransactionInstruction,
  PublicKey,
} from '@solana/web3.js';
import {
  sendTransactionWithRetry,
  signMetadata,
  WalletSigner,
} from '@oyster/common';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';

export async function sendSignMetadata(
  connection: Connection,
  wallet: WalletSigner,
  metadata: PublicKey,
) {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

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
