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
  Borsh,
  Account,
  ERROR_INVALID_ACCOUNT_DATA,
  ERROR_INVALID_OWNER,
} from '@metaplex-foundation/mpl-core';
import { MetaplexProgram, MetaplexKey } from '../MetaplexProgram';
import { Buffer } from 'buffer';
import { AccountInfo, PublicKey } from '@solana/web3.js';

type Args = { address: string; activated: boolean };
export class WhitelistedCreatorData extends Borsh.Data<Args> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static readonly SCHEMA: Map<any, any> = WhitelistedCreatorData.struct([
    ['key', 'u8'],
    ['address', 'pubkeyAsString'],
    ['activated', 'u8'],
  ]);

  key: MetaplexKey = MetaplexKey.WhitelistedCreatorV1;
  address!: StringPublicKey;
  activated = true;

  // Populated from name service
  twitter?: string;
  name?: string;
  image?: string;
  description?: string;

  constructor(args: Args) {
    super(args);
    this.key = MetaplexKey.WhitelistedCreatorV1;
  }
}

export class WhitelistedCreator extends Account<WhitelistedCreatorData> {
  constructor(pubkey: AnyPublicKey, info: AccountInfo<Buffer>) {
    super(pubkey, info);

    if (!this.assertOwner(MetaplexProgram.PUBKEY)) {
      throw ERROR_INVALID_OWNER();
    }

    assert(this.info != null, 'account info needs to be defined');
    if (!WhitelistedCreator.isCompatible(this.info.data)) {
      throw ERROR_INVALID_ACCOUNT_DATA();
    }

    this.data = WhitelistedCreatorData.deserialize(this.info.data);
  }

  static isCompatible(data: Buffer) {
    return data[0] === MetaplexKey.WhitelistedCreatorV1;
  }

  static async getPDA(store: AnyPublicKey, creator: AnyPublicKey) {
    return MetaplexProgram.findProgramAddress([
      Buffer.from(MetaplexProgram.PREFIX),
      MetaplexProgram.PUBKEY.toBuffer(),
      new PublicKey(store).toBuffer(),
      new PublicKey(creator).toBuffer(),
    ]);
  }
}
