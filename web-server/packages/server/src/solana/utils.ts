import { PublicKey } from "@solana/web3.js";

export const findProgramAddressBase58 = async (
    seeds: (Buffer | Uint8Array)[],
    programId: PublicKey,
  ) => {
    const result = await PublicKey.findProgramAddress(seeds, programId);
    return [result[0].toBase58(), result[1]] as [string, number];
  };
