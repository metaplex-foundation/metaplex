import { programIds, VAULT_PREFIX, findProgramAddress } from '@oyster/common';
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import { serialize } from 'borsh';

import {
  getAuctionKeys,
  getBidderKeys,
  ProxyCallAddress,
  RedeemFullRightsTransferBidArgs,
  RedeemUnusedWinningConfigItemsAsAuctioneerArgs,
  SCHEMA,
} from '.';

export async function redeemFullRightsTransferBid(
  vault: PublicKey,
  safetyDepositTokenStore: PublicKey,
  destination: PublicKey,
  safetyDeposit: PublicKey,
  fractionMint: PublicKey,
  bidder: PublicKey,
  payer: PublicKey,
  instructions: TransactionInstruction[],
  masterMetadata: PublicKey,
  newAuthority: PublicKey,
  // If this is an auctioneer trying to reclaim a specific winning index, pass it here,
  // and this will instead call the proxy route instead of the real one, wrapping the original
  // redemption call in an override call that forces the winning index if the auctioneer is authorized.
  auctioneerReclaimIndex?: number,
) {
  const PROGRAM_IDS = programIds();
  const store = PROGRAM_IDS.store;
  if (!store) {
    throw new Error('Store not initialized');
  }

  const { auctionKey, auctionManagerKey } = await getAuctionKeys(vault);

  const { bidRedemption, bidMetadata } = await getBidderKeys(
    auctionKey,
    bidder,
  );

  const transferAuthority: PublicKey = (
    await findProgramAddress(
      [
        Buffer.from(VAULT_PREFIX),
        PROGRAM_IDS.vault.toBuffer(),
        vault.toBuffer(),
      ],
      PROGRAM_IDS.vault,
    )
  )[0];

  const value =
    auctioneerReclaimIndex != undefined
      ? new RedeemUnusedWinningConfigItemsAsAuctioneerArgs({
          winningConfigItemIndex: auctioneerReclaimIndex,
          proxyCall: ProxyCallAddress.RedeemFullRightsTransferBid,
        })
      : new RedeemFullRightsTransferBidArgs();
  const data = Buffer.from(serialize(SCHEMA, value));
  const keys = [
    {
      pubkey: auctionManagerKey,
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
      isWritable: true,
    },
    {
      pubkey: vault,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: fractionMint,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: auctionKey,
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
      isWritable: false,
    },
    {
      pubkey: payer,
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: PROGRAM_IDS.token,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: PROGRAM_IDS.vault,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: PROGRAM_IDS.metadata,
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
      pubkey: masterMetadata,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: newAuthority,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: transferAuthority,
      isSigner: false,
      isWritable: false,
    },
  ];

  instructions.push(
    new TransactionInstruction({
      keys,
      programId: PROGRAM_IDS.metaplex,
      data,
    }),
  );
}
