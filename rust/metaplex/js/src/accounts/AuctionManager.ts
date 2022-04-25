/**
 * NOTE: that we ignore @typescript-eslint/no-explicit-any cases in this file.
 * The way to fix this properly is to improve the return type of the
 * @metaplex-foundation/core `struct` and update that library.
 * Given that these parts of the SDK will be re-generated with solita very soon
 * that would be a wasted effort and therefore we make an EXCEPTION here.
 */
import { strict as assert } from 'assert';
import { AccountInfo, Connection, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import bs58 from 'bs58';
import { BidRedemptionTicket, WINNER_INDEX_OFFSETS } from './BidRedemptionTicket';
import { MetaplexKey, MetaplexProgram } from '../MetaplexProgram';
import { Buffer } from 'buffer';
import { Auction } from '@metaplex-foundation/mpl-auction';
import {
  Account,
  AnyPublicKey,
  Borsh,
  ERROR_DEPRECATED_ACCOUNT_DATA,
  ERROR_INVALID_ACCOUNT_DATA,
  ERROR_INVALID_OWNER,
  StringPublicKey,
} from '@metaplex-foundation/mpl-core';

export enum AuctionManagerStatus {
  Initialized,
  Validated,
  Running,
  Disbursing,
  Finished,
}

export class AuctionManagerStateV2 extends Borsh.Data<{
  status: AuctionManagerStatus;
  safetyConfigItemsValidated: BN;
  bidsPushedToAcceptPayment: BN;
  hasParticipation: boolean;
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static readonly SCHEMA: Map<any, any> = AuctionManagerStateV2.struct([
    ['status', 'u8'],
    ['safetyConfigItemsValidated', 'u64'],
    ['bidsPushedToAcceptPayment', 'u64'],
    ['hasParticipation', 'u8'],
  ]);

  status!: AuctionManagerStatus;
  safetyConfigItemsValidated!: BN;
  bidsPushedToAcceptPayment!: BN;
  hasParticipation!: boolean;
}

type Args = {
  store: StringPublicKey;
  authority: StringPublicKey;
  auction: StringPublicKey;
  vault: StringPublicKey;
  acceptPayment: StringPublicKey;
  state: AuctionManagerStateV2;
};
export class AuctionManagerV2Data extends Borsh.Data<Args> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static readonly SCHEMA: Map<any, any> = new Map([
    ...AuctionManagerStateV2.SCHEMA,
    ...AuctionManagerV2Data.struct([
      ['key', 'u8'],
      ['store', 'pubkeyAsString'],
      ['authority', 'pubkeyAsString'],
      ['auction', 'pubkeyAsString'],
      ['vault', 'pubkeyAsString'],
      ['acceptPayment', 'pubkeyAsString'],
      ['state', AuctionManagerStateV2],
    ]),
  ]);

  key: MetaplexKey;
  store!: StringPublicKey;
  authority!: StringPublicKey;
  auction!: StringPublicKey;
  vault!: StringPublicKey;
  acceptPayment!: StringPublicKey;
  state!: AuctionManagerStateV2;

  constructor(args: Args) {
    super(args);
    this.key = MetaplexKey.AuctionManagerV2;
  }
}

export class AuctionManager extends Account<AuctionManagerV2Data> {
  constructor(pubkey: AnyPublicKey, info: AccountInfo<Buffer>) {
    super(pubkey, info);

    if (!this.assertOwner(MetaplexProgram.PUBKEY)) {
      throw ERROR_INVALID_OWNER();
    }

    assert(this.info != null, 'account info needs to be defined');
    if (AuctionManager.isAuctionManagerV1(this.info.data)) {
      throw ERROR_DEPRECATED_ACCOUNT_DATA();
    } else if (AuctionManager.isAuctionManagerV2(this.info.data)) {
      this.data = AuctionManagerV2Data.deserialize(this.info.data);
    } else {
      throw ERROR_INVALID_ACCOUNT_DATA();
    }
  }

  static isCompatible(data: Buffer) {
    return AuctionManager.isAuctionManagerV1(data) || AuctionManager.isAuctionManagerV2(data);
  }

  static isAuctionManagerV1(data: Buffer) {
    return data[0] === MetaplexKey.AuctionManagerV1;
  }

  static isAuctionManagerV2(data: Buffer) {
    return data[0] === MetaplexKey.AuctionManagerV2;
  }

  static getPDA(auction: AnyPublicKey) {
    return MetaplexProgram.findProgramAddress([
      Buffer.from(MetaplexProgram.PREFIX),
      new PublicKey(auction).toBuffer(),
    ]);
  }

  static async findMany(
    connection: Connection,
    filters: { store?: AnyPublicKey; authority?: AnyPublicKey } = {},
  ) {
    const memcmpFilters = [
      // Filter for AuctionManagerV2 by key
      {
        memcmp: {
          offset: 0,
          bytes: bs58.encode(Buffer.from([MetaplexKey.AuctionManagerV2])),
        },
      },
    ];
    if (filters.store != null) {
      // Filter for assigned to store
      memcmpFilters.push({
        memcmp: {
          offset: 1,
          bytes: new PublicKey(filters.store).toBase58(),
        },
      });
    }
    if (filters.authority != null) {
      // Filter for assigned to authority
      memcmpFilters.push({
        memcmp: {
          offset: 33,
          bytes: new PublicKey(filters.authority).toBase58(),
        },
      });
    }

    return (
      await MetaplexProgram.getProgramAccounts(connection, {
        filters: memcmpFilters,
      })
    ).map((account) => AuctionManager.from(account));
  }

  async getAuction(connection: Connection) {
    assert(this.data != null, 'account data needs to be defined');
    return Auction.load(connection, this.data.auction);
  }

  async getBidRedemptionTickets(connection: Connection, haveWinnerIndex = true) {
    return (
      await MetaplexProgram.getProgramAccounts(connection, {
        filters: [
          // Filter for BidRedemptionTicketV2 by key
          {
            memcmp: {
              offset: 0,
              bytes: bs58.encode(Buffer.from([MetaplexKey.BidRedemptionTicketV2])),
            },
          },
          // Filter for assigned to this auction manager
          {
            memcmp: {
              offset: WINNER_INDEX_OFFSETS[+haveWinnerIndex],
              bytes: this.pubkey.toBase58(),
            },
          },
        ],
      })
    ).map((account) => BidRedemptionTicket.from(account));
  }
}
