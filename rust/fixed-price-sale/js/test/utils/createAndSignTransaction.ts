import { Connection, Keypair, Signer, Transaction, TransactionInstruction } from '@solana/web3.js';

export async function createAndSignTransaction(
  connection: Connection,
  payer: Keypair,
  instructions: TransactionInstruction[],
  signers: Signer[],
): Promise<Transaction> {
  const tx = new Transaction();
  tx.add(...instructions);
  tx.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
  tx.feePayer = payer.publicKey;
  tx.partialSign(...signers);

  return tx;
}
