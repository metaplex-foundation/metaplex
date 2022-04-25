import { PublicKey } from '@solana/web3.js';
import { config, Program } from '@metaplex-foundation/mpl-core';

export class AuctionProgram extends Program {
  static readonly PREFIX = 'auction';
  static readonly EXTENDED = 'extended';
  static readonly PUBKEY = new PublicKey(config.programs.auction);
}
