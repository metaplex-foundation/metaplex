/**
 * NOTE: that we ignore @typescript-eslint/no-explicit-any cases in this file.
 * The way to fix this properly is to improve the return type of the
 * @metaplex-foundation/core `struct` and update that library.
 * Given that these parts of the SDK will be re-generated with solita very soon
 * that would be a wasted effort and therefore we make an EXCEPTION here.
 */
import { Borsh, Transaction } from '@metaplex-foundation/mpl-core';
import {
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  TransactionCtorFields,
  TransactionInstruction,
} from '@solana/web3.js';
import { AuctionProgram } from '@metaplex-foundation/mpl-auction';
import { MetaplexProgram } from '../MetaplexProgram';
import { ParamsWithStore } from './vault';

export class StartAuctionArgs extends Borsh.Data {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static readonly SCHEMA: Map<any, any> = StartAuctionArgs.struct([['instruction', 'u8']]);

  instruction = 5;
}

type StartAuctionParams = {
  auction: PublicKey;
  auctionManager: PublicKey;
  auctionManagerAuthority: PublicKey;
};

export class StartAuction extends Transaction {
  constructor(options: TransactionCtorFields, params: ParamsWithStore<StartAuctionParams>) {
    super(options);
    const { store, auction, auctionManager, auctionManagerAuthority } = params;

    const data = StartAuctionArgs.serialize();

    this.add(
      new TransactionInstruction({
        keys: [
          {
            pubkey: auctionManager,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: auction,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: auctionManagerAuthority,
            isSigner: true,
            isWritable: false,
          },
          {
            pubkey: store,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: AuctionProgram.PUBKEY,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: SYSVAR_CLOCK_PUBKEY,
            isSigner: false,
            isWritable: false,
          },
        ],
        programId: MetaplexProgram.PUBKEY,
        data,
      }),
    );
  }
}
