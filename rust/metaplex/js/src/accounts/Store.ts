/**
 * NOTE: that we ignore @typescript-eslint/no-explicit-any cases in this file.
 * The way to fix this properly is to improve the return type of the
 * @metaplex-foundation/core `struct` and update that library.
 * Given that these parts of the SDK will be re-generated with solita very soon
 * that would be a wasted effort and therefore we make an EXCEPTION here.
 */
import { strict as assert } from 'assert';
import {
  AnyPublicKey,
  StringPublicKey,
  Account,
  ERROR_INVALID_ACCOUNT_DATA,
  ERROR_INVALID_OWNER,
  Borsh,
} from '@metaplex-foundation/mpl-core';
import { MetaplexProgram, MetaplexKey } from '../MetaplexProgram';
import { AccountInfo, Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { WhitelistedCreator } from './WhitelistedCreator';
import { AuctionManager } from './AuctionManager';
import { Buffer } from 'buffer';

type Args = {
  public: boolean;
  auctionProgram: StringPublicKey;
  tokenVaultProgram: StringPublicKey;
  tokenMetadataProgram: StringPublicKey;
  tokenProgram: StringPublicKey;
};
export class StoreData extends Borsh.Data<Args> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static readonly SCHEMA: Map<any, any> = StoreData.struct([
    ['key', 'u8'],
    ['public', 'u8'],
    ['auctionProgram', 'pubkeyAsString'],
    ['tokenVaultProgram', 'pubkeyAsString'],
    ['tokenMetadataProgram', 'pubkeyAsString!'],
    ['tokenProgram', 'pubkeyAsString'],
  ]);

  key: MetaplexKey = MetaplexKey.StoreV1;
  public = true;
  auctionProgram!: StringPublicKey;
  tokenVaultProgram!: StringPublicKey;
  tokenMetadataProgram!: StringPublicKey;
  tokenProgram!: StringPublicKey;

  constructor(args: Args) {
    super(args);
    this.key = MetaplexKey.StoreV1;
  }
}

export class Store extends Account<StoreData> {
  constructor(pubkey: AnyPublicKey, info: AccountInfo<Buffer>) {
    super(pubkey, info);

    if (!this.assertOwner(MetaplexProgram.PUBKEY)) {
      throw ERROR_INVALID_OWNER();
    }

    assert(this.info != null, 'account info needs to be defined');
    if (!Store.isCompatible(this.info.data)) {
      throw ERROR_INVALID_ACCOUNT_DATA();
    }

    this.data = StoreData.deserialize(this.info.data);
  }

  static isCompatible(data: Buffer) {
    return data[0] === MetaplexKey.StoreV1;
  }

  static async getPDA(owner: AnyPublicKey) {
    return MetaplexProgram.findProgramAddress([
      Buffer.from(MetaplexProgram.PREFIX),
      MetaplexProgram.PUBKEY.toBuffer(),
      new PublicKey(owner).toBuffer(),
    ]);
  }

  // TODO: we need some filter for current store
  async getWhitelistedCreators(connection: Connection) {
    return (
      await MetaplexProgram.getProgramAccounts(connection, {
        filters: [
          // Filter for WhitelistedCreatorV1 keys
          {
            memcmp: {
              offset: 0,
              bytes: bs58.encode(Buffer.from([MetaplexKey.WhitelistedCreatorV1])),
            },
          },
        ],
      })
    ).map((account) => WhitelistedCreator.from(account));
  }

  async getAuctionManagers(connection: Connection) {
    return (
      await MetaplexProgram.getProgramAccounts(connection, {
        filters: [
          // Filter for AuctionManagerV2 by key
          {
            memcmp: {
              offset: 0,
              bytes: bs58.encode(Buffer.from([MetaplexKey.AuctionManagerV2])),
            },
          },
          // Filter for assigned to this store
          {
            memcmp: {
              offset: 1,
              bytes: this.pubkey.toBase58(),
            },
          },
        ],
      })
    ).map((account) => AuctionManager.from(account));
  }
}
