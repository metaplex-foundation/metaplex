/**
 * NOTE: that we ignore @typescript-eslint/no-explicit-any cases in this file.
 * The way to fix this properly is to improve the return type of the
 * @metaplex-foundation/core `struct` and update that library.
 * Given that these parts of the SDK will be re-generated with solita very soon
 * that would be a wasted effort and therefore we make an EXCEPTION here.
 */
import { Borsh, StringPublicKey, Transaction } from '@metaplex-foundation/mpl-core';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import {
  PublicKey,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  TransactionCtorFields,
  TransactionInstruction,
} from '@solana/web3.js';
import { AuctionProgram } from '../AuctionProgram';

export class CancelBidArgs extends Borsh.Data<{ resource: StringPublicKey }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static readonly SCHEMA: Map<any, any> = CancelBidArgs.struct([
    ['instruction', 'u8'],
    ['resource', 'pubkeyAsString'],
  ]);

  instruction = 0;
  resource!: StringPublicKey;
}

type CancelBidParams = {
  auction: PublicKey;
  auctionExtended: PublicKey;
  bidderPot: PublicKey;
  bidderMeta: PublicKey;
  bidder: PublicKey;
  bidderToken: PublicKey;
  bidderPotToken: PublicKey;
  tokenMint: PublicKey;
  resource: PublicKey;
};

export class CancelBid extends Transaction {
  constructor(options: TransactionCtorFields, params: CancelBidParams) {
    super(options);
    const {
      auction,
      auctionExtended,
      bidderPot,
      bidderMeta,
      bidder,
      bidderToken,
      bidderPotToken,
      tokenMint,
      resource,
    } = params;

    const data = CancelBidArgs.serialize({ resource: resource.toString() });

    this.add(
      new TransactionInstruction({
        keys: [
          {
            pubkey: bidder,
            isSigner: true,
            isWritable: false,
          },
          {
            pubkey: bidderToken,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: bidderPot,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: bidderPotToken,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: bidderMeta,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: auction,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: auctionExtended,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: tokenMint,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: SYSVAR_CLOCK_PUBKEY,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: SYSVAR_RENT_PUBKEY,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: TOKEN_PROGRAM_ID,
            isSigner: false,
            isWritable: false,
          },
        ],
        programId: AuctionProgram.PUBKEY,
        data,
      }),
    );
  }
}
