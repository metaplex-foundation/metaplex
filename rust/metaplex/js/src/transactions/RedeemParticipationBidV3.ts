/**
 * NOTE: that we ignore @typescript-eslint/no-explicit-any cases in this file.
 * The way to fix this properly is to improve the return type of the
 * @metaplex-foundation/core `struct` and update that library.
 * Given that these parts of the SDK will be re-generated with solita very soon
 * that would be a wasted effort and therefore we make an EXCEPTION here.
 */
import { strict as assert } from 'assert';
import { Borsh, Transaction } from '@metaplex-foundation/mpl-core';
import { MetadataProgram } from '@metaplex-foundation/mpl-token-metadata';
import { ParamsWithStore, VaultProgram } from './vault';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionCtorFields,
  TransactionInstruction,
} from '@solana/web3.js';
import BN from 'bn.js';
import { MetaplexProgram } from '../MetaplexProgram';

export class RedeemParticipationBidV3Args extends Borsh.Data<{ winIndex: BN | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static readonly SCHEMA: Map<any, any> = RedeemParticipationBidV3Args.struct([
    ['instruction', 'u8'],
    ['winIndex', { kind: 'option', type: 'u64' }],
  ]);

  instruction = 19;
  winIndex?: BN;
}

type RedeemParticipationBidV3Params = {
  vault: PublicKey;
  auction: PublicKey;
  auctionManager: PublicKey;
  bidRedemption: PublicKey;
  bidMetadata: PublicKey;
  safetyDepositTokenStore: PublicKey;
  destination: PublicKey;
  safetyDeposit: PublicKey;
  bidder: PublicKey;
  safetyDepositConfig: PublicKey;
  auctionExtended: PublicKey;
  metadata: PublicKey;
  prizeTrackingTicket: PublicKey;
  newMetadata: PublicKey;
  newEdition: PublicKey;
  masterEdition: PublicKey;
  newMint: PublicKey;
  editionMark: PublicKey;
  winIndex: BN;
  transferAuthority: PublicKey;
  acceptPaymentAccount: PublicKey;
  tokenPaymentAccount: PublicKey;
};

export class RedeemParticipationBidV3 extends Transaction {
  constructor(
    options: TransactionCtorFields,
    params: ParamsWithStore<RedeemParticipationBidV3Params>,
  ) {
    super(options);
    const { feePayer } = options;
    assert(feePayer != null, 'need to provide feePayer');

    const {
      store,
      vault,
      auction,
      auctionExtended,
      auctionManager,
      bidRedemption,
      bidMetadata,
      safetyDepositTokenStore,
      destination,
      safetyDeposit,
      bidder,
      safetyDepositConfig,
      metadata,
      prizeTrackingTicket,
      newMetadata,
      newEdition,
      masterEdition,
      newMint,
      editionMark,
      winIndex,
      transferAuthority,
      acceptPaymentAccount,
      tokenPaymentAccount,
    } = params;

    const data = RedeemParticipationBidV3Args.serialize({ winIndex });

    this.add(
      new TransactionInstruction({
        keys: [
          {
            pubkey: auctionManager,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: safetyDepositTokenStore,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: destination,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: bidRedemption,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: safetyDeposit,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: vault,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: safetyDepositConfig,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: auction,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: bidMetadata,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: bidder,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: feePayer,
            isSigner: true,
            isWritable: true,
          },
          {
            pubkey: TOKEN_PROGRAM_ID,
            isSigner: false,
            isWritable: false,
          },
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
          {
            pubkey: transferAuthority,
            isSigner: true,
            isWritable: false,
          },
          {
            pubkey: acceptPaymentAccount,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: tokenPaymentAccount,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: prizeTrackingTicket,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: newMetadata,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: newEdition,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: masterEdition,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: newMint,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: editionMark,
            isSigner: false,
            isWritable: true,
          },
          {
            // Mint authority of new mint - THIS WILL TRANSFER AUTHORITY AWAY FROM THIS KEY
            pubkey: feePayer,
            isSigner: true,
            isWritable: false,
          },
          {
            pubkey: metadata,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: auctionExtended,
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
