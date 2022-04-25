/**
 * NOTE: that we ignore @typescript-eslint/no-explicit-any cases in this file.
 * The way to fix this properly is to improve the return type of the
 * @metaplex-foundation/core `struct` and update that library.
 * Given that these parts of the SDK will be re-generated with solita very soon
 * that would be a wasted effort and therefore we make an EXCEPTION here.
 */
import { strict as assert } from 'assert';
import {
  ERROR_INVALID_ACCOUNT_DATA,
  ERROR_INVALID_OWNER,
  AnyPublicKey,
  Borsh,
  Account,
} from '@metaplex-foundation/mpl-core';
import { AccountInfo, PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { MetaplexKey, MetaplexProgram } from '../MetaplexProgram';

type Args = {
  settingsUri: string;
};
export class StoreConfigData extends Borsh.Data<Args> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static readonly SCHEMA: Map<any, any> = StoreConfigData.struct([
    ['key', 'u8'],
    ['settingsUri', { kind: 'option', type: 'string' }],
  ]);

  key: MetaplexKey = MetaplexKey.StoreConfigV1;
  settingsUri!: string;

  constructor(args: Args) {
    super(args);
    this.key = MetaplexKey.StoreConfigV1;
  }
}

export class StoreConfig extends Account<StoreConfigData> {
  constructor(pubkey: AnyPublicKey, info: AccountInfo<Buffer>) {
    super(pubkey, info);

    if (!this.assertOwner(MetaplexProgram.PUBKEY)) {
      throw ERROR_INVALID_OWNER();
    }

    assert(this.info != null, 'account info needs to be defined');
    if (!StoreConfig.isCompatible(this.info.data)) {
      throw ERROR_INVALID_ACCOUNT_DATA();
    }

    this.data = StoreConfigData.deserialize(this.info.data);
  }

  static isCompatible(data: Buffer) {
    return data[0] === MetaplexKey.StoreConfigV1;
  }

  static async getPDA(store: AnyPublicKey) {
    return MetaplexProgram.findProgramAddress([
      Buffer.from(MetaplexProgram.PREFIX),
      MetaplexProgram.PUBKEY.toBuffer(),
      Buffer.from(MetaplexProgram.CONFIG),
      new PublicKey(store).toBuffer(),
    ]);
  }
}
