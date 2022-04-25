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
} from '@metaplex-foundation/mpl-core';
import BN from 'bn.js';
import { AuctionProgram } from '../AuctionProgram';
import { Buffer } from 'buffer';
import { AccountInfo, PublicKey } from '@solana/web3.js';

type Args = {
  totalUncancelledBids: BN;
  tickSize: BN | null;
  gapTickSizePercentage: number | null;
  instantSalePrice: BN | null;
  name: number[] | null;
};
export class AuctionDataExtended extends Borsh.Data<Args> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static readonly SCHEMA: Map<any, any> = AuctionDataExtended.struct([
    ['totalUncancelledBids', 'u64'],
    ['tickSize', { kind: 'option', type: 'u64' }],
    ['gapTickSizePercentage', { kind: 'option', type: 'u8' }],
    ['instantSalePrice', { kind: 'option', type: 'u64' }],
    ['name', { kind: 'option', type: [32] }],
  ]);

  totalUncancelledBids!: BN;
  tickSize?: BN;
  gapTickSizePercentage?: number;
  instantSalePrice?: BN;
  name?: number[];
}

export class AuctionExtended extends Account<AuctionDataExtended> {
  static readonly DATA_SIZE = 8 + 9 + 2 + 200;

  constructor(pubkey: AnyPublicKey, info: AccountInfo<Buffer>) {
    super(pubkey, info);

    if (!this.assertOwner(AuctionProgram.PUBKEY)) {
      throw ERROR_INVALID_OWNER();
    }

    assert(this.info != null, 'account info needs to be defined');
    if (!AuctionExtended.isCompatible(this.info.data)) {
      throw ERROR_INVALID_ACCOUNT_DATA();
    }

    this.data = AuctionDataExtended.deserialize(this.info.data);
  }

  static isCompatible(data: Buffer) {
    return data.length === AuctionExtended.DATA_SIZE;
  }

  static getPDA(vault: AnyPublicKey) {
    return AuctionProgram.findProgramAddress([
      Buffer.from(AuctionProgram.PREFIX),
      AuctionProgram.PUBKEY.toBuffer(),
      new PublicKey(vault).toBuffer(),
      Buffer.from(AuctionProgram.EXTENDED),
    ]);
  }
}
