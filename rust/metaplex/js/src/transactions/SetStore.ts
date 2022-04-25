/**
 * NOTE: that we ignore @typescript-eslint/no-explicit-any cases in this file.
 * The way to fix this properly is to improve the return type of the
 * @metaplex-foundation/core `struct` and update that library.
 * Given that these parts of the SDK will be re-generated with solita very soon
 * that would be a wasted effort and therefore we make an EXCEPTION here.
 */
import { strict as assert } from 'assert';
import { Borsh, Transaction } from '@metaplex-foundation/mpl-core';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionCtorFields,
  TransactionInstruction,
} from '@solana/web3.js';

import { MetadataProgram } from '@metaplex-foundation/mpl-token-metadata';
import { VaultProgram, ParamsWithStore } from './vault';
import { AuctionProgram } from '@metaplex-foundation/mpl-auction';
import { MetaplexProgram } from '../MetaplexProgram';

export class SetStoreArgs extends Borsh.Data<{ public: boolean }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static readonly SCHEMA: Map<any, any> = SetStoreArgs.struct([
    ['instruction', 'u8'],
    ['public', 'u8'],
  ]);

  instruction = 8;
  public!: boolean;
}

type SetStoreParams = {
  admin: PublicKey;
  isPublic: boolean;
};

export class SetStore extends Transaction {
  constructor(options: TransactionCtorFields, params: ParamsWithStore<SetStoreParams>) {
    super(options);
    const { feePayer } = options;
    assert(feePayer != null, 'need to provide feePayer');

    const { admin, store, isPublic } = params;

    const data = SetStoreArgs.serialize({ public: isPublic });

    this.add(
      new TransactionInstruction({
        keys: [
          {
            pubkey: store,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: admin,
            isSigner: true,
            isWritable: false,
          },
          {
            pubkey: feePayer,
            isSigner: true,
            isWritable: false,
          },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          {
            pubkey: VaultProgram.PUBKEY,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: MetadataProgram.PUBKEY,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: AuctionProgram.PUBKEY,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: SYSVAR_RENT_PUBKEY,
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
