/**
 * NOTE: that we ignore @typescript-eslint/no-explicit-any cases in this file.
 * The way to fix this properly is to improve the return type of the
 * @metaplex-foundation/core `struct` and update that library.
 * Given that these parts of the SDK will be re-generated with solita very soon
 * that would be a wasted effort and therefore we make an EXCEPTION here.
 */
import { Borsh, Transaction } from '@metaplex-foundation/mpl-core';
import { PublicKey, TransactionCtorFields, TransactionInstruction } from '@solana/web3.js';
import { AuctionProgram } from '../AuctionProgram';

export class SetAuctionAuthorityArgs extends Borsh.Data {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static readonly SCHEMA: Map<any, any> = SetAuctionAuthorityArgs.struct([['instruction', 'u8']]);

  instruction = 5;
}

type SetAuctionAuthorityParams = {
  auction: PublicKey;
  currentAuthority: PublicKey;
  newAuthority: PublicKey;
};

export class SetAuctionAuthority extends Transaction {
  constructor(options: TransactionCtorFields, params: SetAuctionAuthorityParams) {
    super(options);
    const { auction, currentAuthority, newAuthority } = params;

    const data = SetAuctionAuthorityArgs.serialize();

    this.add(
      new TransactionInstruction({
        keys: [
          {
            pubkey: auction,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: currentAuthority,
            isSigner: true,
            isWritable: false,
          },
          {
            pubkey: newAuthority,
            isSigner: false,
            isWritable: false,
          },
        ],
        programId: AuctionProgram.PUBKEY,
        data,
      }),
    );
  }
}
