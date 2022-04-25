/**
 * NOTE: that we ignore @typescript-eslint/no-explicit-any cases in this file.
 * The way to fix this properly is to improve the return type of the
 * @metaplex-foundation/core `struct` and update that library.
 * Given that these parts of the SDK will be re-generated with solita very soon
 * that would be a wasted effort and therefore we make an EXCEPTION here.
 */
import { strict as assert } from 'assert';
import { AccountInfo, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import {
  AnyPublicKey,
  Account,
  Borsh,
  ERROR_INVALID_ACCOUNT_DATA,
  ERROR_INVALID_OWNER,
} from '@metaplex-foundation/mpl-core';
import { MetaplexKey, MetaplexProgram } from '../MetaplexProgram';
import { Buffer } from 'buffer';

type Args = {
  metadata: string;
  supplySnapshot: BN;
  expectedRedemptions: BN;
  redemptions: BN;
};
export class PrizeTrackingTicketData extends Borsh.Data<Args> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static readonly SCHEMA: Map<any, any> = PrizeTrackingTicketData.struct([
    ['key', 'u8'],
    ['metadata', 'pubkeyAsString'],
    ['supplySnapshot', 'u64'],
    ['expectedRedemptions', 'u64'],
    ['redemptions', 'u64'],
  ]);

  key: MetaplexKey = MetaplexKey.PrizeTrackingTicketV1;
  metadata!: string;
  supplySnapshot!: BN;
  expectedRedemptions!: BN;
  redemptions!: BN;

  constructor(args: Args) {
    super(args);
    this.key = MetaplexKey.PrizeTrackingTicketV1;
  }
}

export class PrizeTrackingTicket extends Account<PrizeTrackingTicketData> {
  constructor(pubkey: AnyPublicKey, info: AccountInfo<Buffer>) {
    super(pubkey, info);

    if (!this.assertOwner(MetaplexProgram.PUBKEY)) {
      throw ERROR_INVALID_OWNER();
    }

    assert(this.info != null, 'account info needs to be defined');
    if (!PrizeTrackingTicket.isCompatible(this.info.data)) {
      throw ERROR_INVALID_ACCOUNT_DATA();
    }

    this.data = PrizeTrackingTicketData.deserialize(this.info.data);
  }

  static isCompatible(data: Buffer) {
    return data[0] === MetaplexKey.PrizeTrackingTicketV1;
  }

  static async getPDA(auctionManager: AnyPublicKey, mint: AnyPublicKey) {
    return MetaplexProgram.findProgramAddress([
      Buffer.from(MetaplexProgram.PREFIX),
      MetaplexProgram.PUBKEY.toBuffer(),
      new PublicKey(auctionManager).toBuffer(),
      new PublicKey(mint).toBuffer(),
    ]);
  }
}
