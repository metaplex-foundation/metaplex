import { Keypair, TransactionInstruction } from '@solana/web3.js';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import {
  MetaState,
  ParsedAccount,
  StringPublicKey,
  WalletSigner,
} from '@oyster/common';
import { getSafetyDepositBoxAddress } from '@oyster/common/dist/lib/actions/vault';
import {
  StoreIndexer,
  getStoreIndexer,
  getAuctionCache,
  MAX_INDEXED_ELEMENTS,
  AuctionManagerV1,
  AuctionManagerV2,
} from '@oyster/common/dist/lib/models/metaplex/index';
import { setStoreIndex } from '@oyster/common/dist/lib/models/metaplex/setStoreIndex';
import { setAuctionCache } from '@oyster/common/dist/lib/models/metaplex/setAuctionCache';
import BN from 'bn.js';

// This command caches an auction at position 0, page 0, and moves everything up
export async function cacheAuctionIndexer(
  wallet: WalletSigner,
  vault: StringPublicKey,
  auction: StringPublicKey,
  auctionManager: ParsedAccount<AuctionManagerV1 | AuctionManagerV2>,
  tokenMints: StringPublicKey[],
  storeIndexers: ParsedAccount<StoreIndexer>[],
  tempCache: MetaState,
): Promise<{
  instructions: TransactionInstruction[][];
  signers: Keypair[][];
  updateOnSuccess: () => void;
}> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();
  const payer = wallet.publicKey.toBase58();

  const instructions: TransactionInstruction[] = [];

  const {
    auctionCache,
    instructions: createAuctionCacheInstructions,
    signers: createAuctionCacheSigners,
  } = await createAuctionCache(
    wallet,
    vault,
    auction,
    auctionManager.pubkey,
    tokenMints,
  );

  const storeIndexKey = await getStoreIndexer(0);

  // Find where should this be inserted, because it might not be at the front
  let offset = 0;
  const currentAuctionCachePk = await getAuctionCache(
    auctionManager.info.auction,
  );
  const currentAuctionCache = tempCache.auctionCaches[currentAuctionCachePk];

  for (const auctionCachePk of storeIndexers[0].info.auctionCaches) {
    const auctionCacheAbove = tempCache.auctionCaches[auctionCachePk];
    // If we are newer we break to keep the current offset
    if (currentAuctionCache.info.timestamp > auctionCacheAbove.info.timestamp) {
      break;
    }
    offset++;
  }
  console.log('Offset:', offset);

  const skipCache =
    !!tempCache.auctionCaches[
      await getAuctionCache(auctionManager.info.auction)
    ];

  const auctionCacheBelow =
    offset === 0 ? undefined : storeIndexers[0].info.auctionCaches[offset - 1];
  const auctionCacheAbove = storeIndexers[0].info.auctionCaches[offset];
  console.log(auctionCacheBelow, auctionCacheAbove);
  await setStoreIndex(
    storeIndexKey,
    auctionCache,
    payer,
    new BN(0),
    new BN(offset),
    instructions,
    auctionCacheBelow,
    auctionCacheAbove,
  );

  const { instructions: propagationInstructions, signers: propagationSigners } =
    await propagateIndex(wallet, storeIndexers);

  return {
    instructions: [
      ...(skipCache ? [] : createAuctionCacheInstructions),
      instructions,
      ...propagationInstructions,
    ],
    signers: [
      ...(skipCache ? [] : createAuctionCacheSigners),
      [],
      ...propagationSigners,
    ],
    updateOnSuccess() {
      // Add this auction cache to the store indexer so that the next iteration is up to date
      storeIndexers[0].info.auctionCaches.splice(
        offset,
        0,
        currentAuctionCachePk,
      );
    },
  };
}

const INDEX_TRANSACTION_SIZE = 10;
async function propagateIndex(
  wallet: WalletSigner,
  storeIndexer: ParsedAccount<StoreIndexer>[],
): Promise<{ instructions: TransactionInstruction[][]; signers: Keypair[][] }> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const payer = wallet.publicKey.toBase58();

  const currSignerBatch: Array<Keypair[]> = [];
  const currInstrBatch: Array<TransactionInstruction[]> = [];

  let indexSigners: Keypair[] = [];
  let indexInstructions: TransactionInstruction[] = [];

  let currPage: ParsedAccount<StoreIndexer> | null = storeIndexer[0];
  let lastPage: ParsedAccount<StoreIndexer> | null = null;
  while (
    currPage &&
    currPage.info.auctionCaches.length == MAX_INDEXED_ELEMENTS
  ) {
    const cacheLeavingThePage =
      currPage.info.auctionCaches[currPage.info.auctionCaches.length - 1];
    const nextPage = storeIndexer[currPage.info.page.toNumber() + 1];
    if (nextPage) {
      lastPage = currPage;
      currPage = nextPage;
    } else {
      lastPage = currPage;
      currPage = null;
    }

    const storeIndexKey = currPage
      ? currPage.pubkey
      : await getStoreIndexer(lastPage.info.page.toNumber() + 1);
    const above = currPage ? currPage.info.auctionCaches[0] : undefined;

    await setStoreIndex(
      storeIndexKey,
      cacheLeavingThePage,
      payer,
      lastPage.info.page.add(new BN(1)),
      new BN(0),
      indexInstructions,
      undefined,
      above,
    );

    if (indexInstructions.length >= INDEX_TRANSACTION_SIZE) {
      currSignerBatch.push(indexSigners);
      currInstrBatch.push(indexInstructions);
      indexSigners = [];
      indexInstructions = [];
    }
  }

  if (
    indexInstructions.length < INDEX_TRANSACTION_SIZE &&
    indexInstructions.length > 0
  ) {
    currSignerBatch.push(indexSigners);
    currInstrBatch.push(indexInstructions);
  }

  return {
    instructions: currInstrBatch,
    signers: currSignerBatch,
  };
}

const TRANSACTION_SIZE = 10;

async function createAuctionCache(
  wallet: WalletSigner,
  vault: StringPublicKey,
  auction: StringPublicKey,
  auctionManager: StringPublicKey,
  tokenMints: StringPublicKey[],
): Promise<{
  auctionCache: StringPublicKey;
  instructions: TransactionInstruction[][];
  signers: Keypair[][];
}> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const payer = wallet.publicKey.toBase58();

  const currSignerBatch: Array<Keypair[]> = [];
  const currInstrBatch: Array<TransactionInstruction[]> = [];

  let cacheSigners: Keypair[] = [];
  let cacheInstructions: TransactionInstruction[] = [];
  const auctionCache = await getAuctionCache(auction);

  for (let i = 0; i < tokenMints.length; i++) {
    const safetyDeposit = await getSafetyDepositBoxAddress(
      vault,
      tokenMints[i],
    );

    await setAuctionCache(
      auctionCache,
      payer,
      auction,
      safetyDeposit,
      auctionManager,
      new BN(0),
      cacheInstructions,
    );

    if (cacheInstructions.length >= TRANSACTION_SIZE) {
      currSignerBatch.push(cacheSigners);
      currInstrBatch.push(cacheInstructions);
      cacheSigners = [];
      cacheInstructions = [];
    }
  }

  if (
    cacheInstructions.length < TRANSACTION_SIZE &&
    cacheInstructions.length > 0
  ) {
    currSignerBatch.push(cacheSigners);
    currInstrBatch.push(cacheInstructions);
  }

  return {
    auctionCache,
    instructions: currInstrBatch,
    signers: currSignerBatch,
  };
}
