import { Connection, Keypair, TransactionInstruction } from '@solana/web3.js';
import {
  loadAccounts,
  MetaplexKey,
  MetaState,
  ParsedAccount,
  programIds,
  SafetyDepositBox,
  sendTransactions,
  sendTransactionWithRetry,
  SequenceType,
  WalletSigner,
} from '@oyster/common';
import { cacheAuctionIndexer } from './cacheAuctionInIndexer';
import { buildListWhileNonZero } from '../hooks';

// This command caches an auction at position 0, page 0, and moves everything up
export async function cacheAllAuctions(
  wallet: WalletSigner,
  connection: Connection,
  tempCache: MetaState,
) {
  if (!programIds().store) {
    return false;
  }
  const store = programIds().store?.toBase58();

  if (tempCache.storeIndexer.length) {
    console.log('----> Previously indexed. Pulling all.');
    // well now we need to pull first.
    tempCache = await loadAccounts(connection);
  }

  let auctionManagersToCache = Object.values(
    tempCache.auctionManagersByAuction,
  ).filter(a => a.info.store == store);

  const alreadyIndexed = Object.values(tempCache.auctionCaches)
    .map(a => a.info.auctionManager)
    .reduce((hash, val) => {
      hash[val] = true;
      return hash;
    }, {});
  auctionManagersToCache = auctionManagersToCache.filter(
    a => !alreadyIndexed[a.pubkey],
  );

  console.log(
    '----> Found ',
    auctionManagersToCache.length,
    'auctions to cache.',
  );

  const batchInstructions: Array<TransactionInstruction[][]> = [];
  const batchSigners: Array<Keypair[][]> = [];
  let currBatchInstructions: TransactionInstruction[][] = [];
  let currBatchSigners: Keypair[][] = [];

  const DESIRED_BATCH_SIZE = 10;
  for (let i = 0; i < auctionManagersToCache.length; i++) {
    const auctionManager = auctionManagersToCache[i];
    const boxes: ParsedAccount<SafetyDepositBox>[] = buildListWhileNonZero(
      tempCache.safetyDepositBoxesByVaultAndIndex,
      auctionManager.info.vault,
    );
    if (auctionManager.info.key === MetaplexKey.AuctionManagerV2) {
      const { instructions, signers } = await cacheAuctionIndexer(
        wallet,
        auctionManager.info.vault,
        auctionManager.info.auction,
        auctionManager.pubkey,
        boxes.map(a => a.info.tokenMint),
        tempCache.storeIndexer,
      );

      if (
        instructions.length + currBatchInstructions.length >
        DESIRED_BATCH_SIZE
      ) {
        batchInstructions.push(currBatchInstructions);
        batchSigners.push(currBatchSigners);
      } else {
        currBatchInstructions = currBatchInstructions.concat(instructions);
        currBatchSigners = currBatchSigners.concat(signers);
      }
    }
  }

  if (currBatchInstructions.length > 0) {
    batchInstructions.push(currBatchInstructions);
    batchSigners.push(currBatchSigners);
  }

  for (let i = 0; i < batchInstructions.length; i++) {
    const instructionBatch = batchInstructions[i];
    const signerBatch = batchSigners[i];
    console.log('Running batch', i);
    if (instructionBatch.length >= 2)
      // Pump em through!
      await sendTransactions(
        connection,
        wallet,
        instructionBatch,
        signerBatch,
        SequenceType.StopOnFailure,
        'max',
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
