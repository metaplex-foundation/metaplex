import { calculate } from '@metaplex/arweave-cost';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export const LAMPORT_MULTIPLIER = LAMPORTS_PER_SOL;

export const ARWEAVE_UPLOAD_ENDPOINT =
  'https://us-central1-metaplex-studios.cloudfunctions.net/uploadFile';

export async function getAssetCostToStore(files: { size: number }[]) {
  const sizes = files.map(f => f.size);
  const result = await calculate(sizes);

  return LAMPORTS_PER_SOL * result.solana;
}
