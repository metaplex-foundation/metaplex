import { airdrop } from '@metaplex-foundation/amman';
import { Connection, Keypair } from '@solana/web3.js';

// -----------------
// Helpers not relevant to the examples
// -----------------
export async function fundedPayer(connection: Connection, sol = 1) {
  const payer = Keypair.generate();
  await airdrop(connection, payer.publicKey, sol);
  return payer;
}
