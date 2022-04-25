/**
 * NOTE: that we ignore @typescript-eslint/no-explicit-any cases in this file.
 * The way to fix this properly is to improve the return type of the
 * @metaplex-foundation/core `struct` and update that library.
 * Given that these parts of the SDK will be re-generated with solita very soon
 * that would be a wasted effort and therefore we make an EXCEPTION here.
 */
import { Borsh, Transaction, StringPublicKey } from '@metaplex-foundation/mpl-core';
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionCtorFields,
  TransactionInstruction,
} from '@solana/web3.js';
import BN from 'bn.js';
import { AuctionProgram } from '../AuctionProgram';
import { PriceFloor } from '../accounts/Auction';
import { Args as CreateAuctionArgsType, WinnerLimit } from './CreateAuction';

type Args = CreateAuctionArgsType & {
  instantSalePrice: BN | null;
  name: number[] | null;
};

export class CreateAuctionV2Args extends Borsh.Data<Args> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static readonly SCHEMA: Map<any, any> = new Map([
    ...WinnerLimit.SCHEMA,
    ...PriceFloor.SCHEMA,
    ...CreateAuctionV2Args.struct([
      ['instruction', 'u8'],
      ['winners', WinnerLimit],
      ['endAuctionAt', { kind: 'option', type: 'u64' }],
      ['auctionGap', { kind: 'option', type: 'u64' }],
      ['tokenMint', 'pubkeyAsString'],
      ['authority', 'pubkeyAsString'],
      ['resource', 'pubkeyAsString'],
      ['priceFloor', PriceFloor],
      ['tickSize', { kind: 'option', type: 'u64' }],
      ['gapTickSizePercentage', { kind: 'option', type: 'u8' }],
      ['instantSalePrice', { kind: 'option', type: 'u64' }],
      ['name', { kind: 'option', type: [32] }],
    ]),
  ]);

  instruction = 7;
  /// How many winners are allowed for this auction. See AuctionData.
  winners!: WinnerLimit;
  /// End time is the cut-off point that the auction is forced to end by. See AuctionData.
  endAuctionAt?: BN;
  /// Gap time is how much time after the previous bid where the auction ends. See AuctionData.
  auctionGap?: BN;
  /// Token mint for the SPL token used for bidding.
  tokenMint!: StringPublicKey;
  /// Authority
  authority!: StringPublicKey;
  /// The resource being auctioned. See AuctionData.
  resource!: StringPublicKey;
  /// Set a price floor.
  priceFloor!: PriceFloor;
  /// Add a tick size increment
  tickSize?: BN;
  /// Add a minimum percentage increase each bid must meet.
  gapTickSizePercentage?: number;
  /// Add a instant sale price.
  instantSalePrice?: BN;
  /// Auction name
  name?: number[];
}

type CreateAuctionV2Params = {
  auction: PublicKey;
  auctionExtended: PublicKey;
  creator: PublicKey;
  args: Args;
};

export class CreateAuctionV2 extends Transaction {
  constructor(options: TransactionCtorFields, params: CreateAuctionV2Params) {
    super(options);
    const { args, auction, auctionExtended, creator } = params;

    const data = CreateAuctionV2Args.serialize(args);

    this.add(
      new TransactionInstruction({
        keys: [
          {
            pubkey: creator,
            isSigner: true,
            isWritable: true,
          },
          {
            pubkey: auction,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: auctionExtended,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: SYSVAR_RENT_PUBKEY,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: SystemProgram.programId,
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
