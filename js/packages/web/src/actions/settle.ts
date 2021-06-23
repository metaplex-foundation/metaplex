import {
  Keypair,
  Connection,
  PublicKey,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  ParsedAccount,
  SequenceType,
  sendTransactions,
  sendTransactionWithRetry,
  BidderPot,
  createAssociatedTokenAccountInstruction,
  programIds,
  findProgramAddress,
} from '@oyster/common';

import { AuctionView } from '../hooks';

import { claimBid } from '../models/metaplex/claimBid';
import { emptyPaymentAccount } from '../models/metaplex/emptyPaymentAccount';
import { QUOTE_MINT } from '../constants';

const BATCH_SIZE = 10;
const SETTLE_TRANSACTION_SIZE = 7;
const CLAIM_TRANSACTION_SIZE = 6;
export async function settle(
  connection: Connection,
  wallet: any,
  auctionView: AuctionView,
  bidsToClaim: ParsedAccount<BidderPot>[],
) {
  await claimAllBids(connection, wallet, auctionView, bidsToClaim);
  await emptyPaymentAccountForAllTokens(connection, wallet, auctionView);
}

async function emptyPaymentAccountForAllTokens(
  connection: Connection,
  wallet: any,
  auctionView: AuctionView,
) {
  const PROGRAM_IDS = programIds();
  let signers: Array<Array<Keypair[]>> = [];
  let instructions: Array<Array<TransactionInstruction[]>> = [];

  let currSignerBatch: Array<Keypair[]> = [];
  let currInstrBatch: Array<TransactionInstruction[]> = [];

  let settleSigners: Keypair[] = [];
  let settleInstructions: TransactionInstruction[] = [];
  let ataLookup: Record<string, boolean> = {};
  // TODO replace all this with payer account so user doesnt need to click approve several times.

  // Overall we have 10 parallel txns, of up to 4 settlements per txn
  // That's what this loop is building.
  const prizeArrays = [
    ...auctionView.items,
    ...(auctionView.participationItem ? [[auctionView.participationItem]] : []),
  ];
  for (let i = 0; i < prizeArrays.length; i++) {
    const items = prizeArrays[i];

    for (let j = 0; j < items.length; j++) {
      const item = items[j];
      const creators = item.metadata.info.data.creators;
      const edgeCaseWhereCreatorIsAuctioneer = !!creators
        ?.map(c => c.address)
        .find(
          c =>
            c.toBase58() ===
            auctionView.auctionManager.info.authority.toBase58(),
        );

      const addresses = [
        ...(creators ? creators.map(c => c.address) : []),
        ...[auctionView.auctionManager.info.authority],
      ];

      for (let k = 0; k < addresses.length; k++) {
        const ata = (
          await findProgramAddress(
            [
              addresses[k].toBuffer(),
              PROGRAM_IDS.token.toBuffer(),
              QUOTE_MINT.toBuffer(),
            ],
            PROGRAM_IDS.associatedToken,
          )
        )[0];

        const existingAta = await connection.getAccountInfo(ata);
        console.log('Existing ata?', existingAta);
        if (!existingAta && !ataLookup[ata.toBase58()])
          createAssociatedTokenAccountInstruction(
            settleInstructions,
            ata,
            wallet.publicKey,
            addresses[k],
            QUOTE_MINT,
          );

        ataLookup[ata.toBase58()] = true;

        const creatorIndex = creators
          ? creators
              .map(c => c.address.toBase58())
              .indexOf(addresses[k].toBase58())
          : null;

        await emptyPaymentAccount(
          auctionView.auctionManager.info.acceptPayment,
          ata,
          auctionView.auctionManager.pubkey,
          item.metadata.pubkey,
          item.masterEdition?.pubkey,
          item.safetyDeposit.pubkey,
          item.safetyDeposit.info.vault,
          auctionView.auction.pubkey,
          wallet.publicKey,
          addresses[k],
          item === auctionView.participationItem ? null : i,
          item === auctionView.participationItem ? null : j,
          creatorIndex === -1 ||
            creatorIndex === null ||
            (edgeCaseWhereCreatorIsAuctioneer && k === addresses.length - 1)
            ? null
            : creatorIndex,
          settleInstructions,
        );

        if (settleInstructions.length >= SETTLE_TRANSACTION_SIZE) {
          currSignerBatch.push(settleSigners);
          currInstrBatch.push(settleInstructions);
          settleSigners = [];
          settleInstructions = [];
        }

        if (currInstrBatch.length === BATCH_SIZE) {
          signers.push(currSignerBatch);
          instructions.push(currInstrBatch);
          currSignerBatch = [];
          currInstrBatch = [];
        }
      }
    }
  }

  if (
    settleInstructions.length < SETTLE_TRANSACTION_SIZE &&
    settleInstructions.length > 0
  ) {
    currSignerBatch.push(settleSigners);
    currInstrBatch.push(settleInstructions);
  }

  if (currInstrBatch.length <= BATCH_SIZE && currInstrBatch.length > 0) {
    // add the last one on
    signers.push(currSignerBatch);
    instructions.push(currInstrBatch);
  }

  for (let i = 0; i < instructions.length; i++) {
    const instructionBatch = instructions[i];
    const signerBatch = signers[i];
    if (instructionBatch.length >= 2)
      // Pump em through!
      await sendTransactions(
        connection,
        wallet,
        instructionBatch,
        signerBatch,
        SequenceType.StopOnFailure,
        'single',
      );
    else
      await sendTransactionWithRetry(
        connection,
        wallet,
        instructionBatch[0],
        signerBatch[0],
        'single',
      );
  }
}

async function claimAllBids(
  connection: Connection,
  wallet: any,
  auctionView: AuctionView,
  bids: ParsedAccount<BidderPot>[],
) {
  let signers: Array<Array<Keypair[]>> = [];
  let instructions: Array<Array<TransactionInstruction[]>> = [];

  let currSignerBatch: Array<Keypair[]> = [];
  let currInstrBatch: Array<TransactionInstruction[]> = [];

  let claimBidSigners: Keypair[] = [];
  let claimBidInstructions: TransactionInstruction[] = [];

  // TODO replace all this with payer account so user doesnt need to click approve several times.

  // Overall we have 10 parallel txns, of up to 7 claims in each txn
  // That's what this loop is building.
  for (let i = 0; i < bids.length; i++) {
    const bid = bids[i];
    console.log('Claiming', bid.info.bidderAct.toBase58());
    await claimBid(
      auctionView.auctionManager.info.acceptPayment,
      bid.info.bidderAct,
      bid.info.bidderPot,
      auctionView.vault.pubkey,
      auctionView.auction.info.tokenMint,
      claimBidInstructions,
    );

    if (claimBidInstructions.length === CLAIM_TRANSACTION_SIZE) {
      currSignerBatch.push(claimBidSigners);
      currInstrBatch.push(claimBidInstructions);
      claimBidSigners = [];
      claimBidInstructions = [];
    }

    if (currInstrBatch.length === BATCH_SIZE) {
      signers.push(currSignerBatch);
      instructions.push(currInstrBatch);
      currSignerBatch = [];
      currInstrBatch = [];
    }
  }

  if (
    claimBidInstructions.length < CLAIM_TRANSACTION_SIZE &&
    claimBidInstructions.length > 0
  ) {
    currSignerBatch.push(claimBidSigners);
    currInstrBatch.push(claimBidInstructions);
  }

  if (currInstrBatch.length <= BATCH_SIZE && currInstrBatch.length > 0) {
    // add the last one on
    signers.push(currSignerBatch);
    instructions.push(currInstrBatch);
  }
  console.log('Instructions', instructions);
  for (let i = 0; i < instructions.length; i++) {
    const instructionBatch = instructions[i];
    const signerBatch = signers[i];
    console.log('Running batch', i);
    if (instructionBatch.length >= 2)
      // Pump em through!
      await sendTransactions(
        connection,
        wallet,
        instructionBatch,
        signerBatch,
        SequenceType.StopOnFailure,
        'single',
      );
    else
      await sendTransactionWithRetry(
        connection,
        wallet,
        instructionBatch[0],
        signerBatch[0],
        'single',
      );
    console.log('Done');
  }
}
