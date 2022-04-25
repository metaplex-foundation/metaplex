/**
 * NOTE: that we ignore @typescript-eslint/no-explicit-any cases in this file.
 * The way to fix this properly is to improve the return type of the
 * @metaplex-foundation/core `struct` and update that library.
 * Given that these parts of the SDK will be re-generated with solita very soon
 * that would be a wasted effort and therefore we make an EXCEPTION here.
 */
import { strict as assert } from 'assert';
import {
  Account,
  Borsh,
  ERROR_INVALID_ACCOUNT_DATA,
  ERROR_INVALID_OWNER,
  AnyPublicKey,
  StringPublicKey,
} from '@metaplex-foundation/mpl-core';
import { AuctionProgram } from '../AuctionProgram';
import { AccountInfo, PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer';

type Args = {
  bidderPot: StringPublicKey;
  bidderAct: StringPublicKey;
  auctionAct: StringPublicKey;
  emptied: boolean;
};
export class BidderPotData extends Borsh.Data<Args> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static readonly SCHEMA: Map<any, any> = BidderPotData.struct([
    ['bidderPot', 'pubkeyAsString'],
    ['bidderAct', 'pubkeyAsString'],
    ['auctionAct', 'pubkeyAsString'],
    ['emptied', 'u8'],
  ]);

  /// Points at actual pot that is a token account
  bidderPot!: StringPublicKey;
  /// Originating bidder account
  bidderAct!: StringPublicKey;
  /// Auction account
  auctionAct!: StringPublicKey;
  /// emptied or not
  emptied!: boolean;
}

export class BidderPot extends Account<BidderPotData> {
  static readonly DATA_SIZE = 32 + 32 + 32 + 1;

  constructor(key: AnyPublicKey, info: AccountInfo<Buffer>) {
    super(key, info);

    if (!this.assertOwner(AuctionProgram.PUBKEY)) {
      throw ERROR_INVALID_OWNER();
    }

    assert(this.info != null, 'account info needs to be defined');
    if (!BidderPot.isCompatible(this.info.data)) {
      throw ERROR_INVALID_ACCOUNT_DATA();
    }

    this.data = BidderPotData.deserialize(this.info.data);
  }

  static isCompatible(data: Buffer) {
    return data.length === BidderPot.DATA_SIZE;
  }

  static getPDA(auction: AnyPublicKey, bidder: AnyPublicKey) {
    return AuctionProgram.findProgramAddress([
      Buffer.from(AuctionProgram.PREFIX),
      AuctionProgram.PUBKEY.toBuffer(),
      new PublicKey(auction).toBuffer(),
      new PublicKey(bidder).toBuffer(),
    ]);
  }
}
