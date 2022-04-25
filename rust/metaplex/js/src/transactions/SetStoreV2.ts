/**
 * NOTE: that we ignore @typescript-eslint/no-explicit-any cases in this file.
 * The way to fix this properly is to improve the return type of the
 * @metaplex-foundation/core `struct` and update that library.
 * Given that these parts of the SDK will be re-generated with solita very soon
 * that would be a wasted effort and therefore we make an EXCEPTION here.
 */
import { strict as assert } from 'assert';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionCtorFields,
  TransactionInstruction,
} from '@solana/web3.js';
import { Borsh, Transaction } from '@metaplex-foundation/mpl-core';
import { ParamsWithStore, VaultProgram } from './vault';
import { MetadataProgram } from '@metaplex-foundation/mpl-token-metadata';
import { AuctionProgram } from '@metaplex-foundation/mpl-auction';
import { MetaplexProgram } from '../MetaplexProgram';

export class SetStoreV2Args extends Borsh.Data<{ public: boolean; settingsUri: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static readonly SCHEMA: Map<any, any> = SetStoreV2Args.struct([
    ['instruction', 'u8'],
    ['public', 'u8'],
    ['settingsUri', { kind: 'option', type: 'string' }],
  ]);

  instruction = 23;
  public!: boolean;
  settingsUri!: string | null;
}

type SetStoreV2Params = {
  admin: PublicKey;
  config: PublicKey;
  isPublic: boolean;
  settingsUri: string | null;
};

export class SetStoreV2 extends Transaction {
  constructor(options: TransactionCtorFields, params: ParamsWithStore<SetStoreV2Params>) {
    super(options);
    const { feePayer } = options;
    assert(feePayer != null, 'need to provide feePayer');

    const { admin, store, config, isPublic, settingsUri } = params;

    const data = SetStoreV2Args.serialize({ public: isPublic, settingsUri });

    this.add(
      new TransactionInstruction({
        keys: [
          {
            pubkey: store,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: config,
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
