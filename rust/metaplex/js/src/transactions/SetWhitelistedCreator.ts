/**
 * NOTE: that we ignore @typescript-eslint/no-explicit-any cases in this file.
 * The way to fix this properly is to improve the return type of the
 * @metaplex-foundation/core `struct` and update that library.
 * Given that these parts of the SDK will be re-generated with solita very soon
 * that would be a wasted effort and therefore we make an EXCEPTION here.
 */
import { strict as assert } from 'assert';
import { Borsh, Transaction } from '@metaplex-foundation/mpl-core';
import { ParamsWithStore } from './vault';
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionCtorFields,
  TransactionInstruction,
} from '@solana/web3.js';
import { MetaplexProgram } from '../MetaplexProgram';

export class SetWhitelistedCreatorArgs extends Borsh.Data<{ activated: boolean }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static readonly SCHEMA: Map<any, any> = SetWhitelistedCreatorArgs.struct([
    ['instruction', 'u8'],
    ['activated', 'u8'],
  ]);

  instruction = 9;
  activated!: boolean;
}

type SetWhitelistedCreatorParams = {
  admin: PublicKey;
  whitelistedCreatorPDA: PublicKey;
  creator: PublicKey;
  activated: boolean;
};

export class SetWhitelistedCreator extends Transaction {
  constructor(
    options: TransactionCtorFields,
    params: ParamsWithStore<SetWhitelistedCreatorParams>,
  ) {
    super(options);
    const { feePayer } = options;
    assert(feePayer != null, 'need to provide feePayer');

    const { admin, whitelistedCreatorPDA, store, creator, activated } = params;

    const data = SetWhitelistedCreatorArgs.serialize({ activated });

    this.add(
      new TransactionInstruction({
        keys: [
          {
            pubkey: whitelistedCreatorPDA,
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
          {
            pubkey: creator,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: store,
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
