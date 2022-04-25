import { PublicKey } from '@solana/web3.js';
import { config } from '@metaplex-foundation/mpl-core';

export const VaultProgram = {
  PUBKEY: new PublicKey(config.programs.vault),
};

export type ParamsWithStore<P> = P & { store: PublicKey };
