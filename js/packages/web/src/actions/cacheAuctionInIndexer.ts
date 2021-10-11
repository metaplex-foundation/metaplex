import { Keypair, TransactionInstruction } from '@solana/web3.js';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { ParsedAccount, StringPublicKey, WalletSigner } from '@oyster/common';
import { getSafetyDepositBoxAddress } from '@oyster/common/dist/lib/actions/vault';
import {
  StoreIndexer,
  getStoreIndexer,
  getAuctionCache,
  MAX_INDEXED_ELEMENTS,
} from '@oyster/common/dist/lib/models/metaplex/index';
import { setStoreIndex } from '@oyster/common/dist/lib/models/metaplex/setStoreIndex';
import { setAuctionCache } from '@oyster/common/dist/lib/models/metaplex/setAuctionCache';
import BN from 'bn.js';

// This command caches an auction at position 0, page 0, and moves everything up
export async function cacheAuctionIndexer(
  wallet: WalletSigner,
  vault: StringPublicKey,
  auction: StringPublicKey,
  auctionManager: StringPublicKey,
  tokenMints: StringPublicKey[],
  storeIndexer: ParsedAccount<StoreIndexer>[],
  skipCache?: boolean,
): Promise<{
  instructions: TransactionInstruction[][];
  signers: Keypair[][];
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
    auctionManager,
    tokenMints,
  );

  let above =
    storeIndexer.length == 0
      ? undefined
      : storeIndexer[0].info.auctionCaches[0];

  const storeIndexKey = await getStoreIndexer(0);
  await setStoreIndex(
    storeIndexKey,
    auctionCache,
    payer,
    new BN(0),
    new BN(0),
    instructions,
    undefined,
    above,
  );

  const { instructions: propagationInstructions, signers: propagationSigners } =
    await propagateIndex(wallet, storeIndexer);

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
  };
}

const INDEX_TRANSACTION_SIZE = 10;
async function propagateIndex(
  wallet: WalletSigner,
  storeIndexer: ParsedAccount<StoreIndexer>[],
): Promise<{ instructions: TransactionInstruction[][]; signers: Keypair[][] }> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const payer = wallet.publicKey.toBase58();

  let currSignerBatch: Array<Keypair[]> = [];
  let currInstrBatch: Array<TransactionInstruction[]> = [];

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

  let currSignerBatch: Array<Keypair[]> = [];
  let currInstrBatch: Array<TransactionInstruction[]> = [];

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
