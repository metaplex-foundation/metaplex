import BN from 'bn.js';
import test from 'tape';
import {
  assertConfirmedTransaction,
  assertError,
  defaultSendOptions,
} from '@metaplex-foundation/amman';
import { deprecated } from '@metaplex-foundation/mpl-token-metadata';

import { findTradeHistoryAddress } from '../src/utils';
import { createBuyTransaction } from './transactions';
import { killStuckProcess, logDebug, sleep } from './utils';
import {
  createPrerequisites,
  createStore,
  initSellingResource,
  mintNFT,
  createMarket,
  mintTokenToAccount,
} from './actions';
import { CreateMarketInstructionArgs } from '../src';
import { verifyCollection } from './actions/verifyCollection';

killStuckProcess();

test('buy: successful purchase without gating', async (t) => {
  const { payer, connection, transactionHandler } = await createPrerequisites();

  const store = await createStore({
    test: t,
    transactionHandler,
    payer,
    connection,
    params: {
      name: 'Store',
      description: 'Description',
    },
  });

  const { sellingResource, vault, vaultOwner, vaultOwnerBump, resourceMint } =
    await initSellingResource({
      test: t,
      transactionHandler,
      payer,
      connection,
      store: store.publicKey,
      maxSupply: 100,
    });

  const { mint: treasuryMint, tokenAccount: userTokenAcc } = await mintNFT({
    transactionHandler,
    payer,
    connection,
  });

  const startDate = Math.round(Date.now() / 1000);
  const params: Omit<CreateMarketInstructionArgs, 'treasuryOwnerBump'> = {
    name: 'Market',
    description: '',
    startDate,
    endDate: startDate + 5 * 20,
    mutable: true,
    price: 0.001,
    piecesInOneWallet: 1,
    // No gating
    gatingConfig: null,
  };

  const { market, treasuryHolder } = await createMarket({
    test: t,
    transactionHandler,
    payer,
    connection,
    store: store.publicKey,
    sellingResource: sellingResource.publicKey,
    treasuryMint: treasuryMint.publicKey,
    params,
  });

  const [tradeHistory, tradeHistoryBump] = await findTradeHistoryAddress(
    payer.publicKey,
    market.publicKey,
  );

  const { mint: newMint, mintAta } = await mintTokenToAccount({
    connection,
    payer: payer.publicKey,
    transactionHandler,
  });

  logDebug('new mint', newMint.publicKey.toBase58());

  const newMintEdition = await deprecated.Edition.getPDA(newMint.publicKey);
  const newMintMetadata = await deprecated.Metadata.getPDA(newMint.publicKey);

  const resourceMintMasterEdition = await deprecated.Edition.getPDA(resourceMint.publicKey);
  const resourceMintMetadata = await deprecated.Metadata.getPDA(resourceMint.publicKey);
  const resourceMintEditionMarker = await deprecated.EditionMarker.getPDA(
    resourceMint.publicKey,
    new BN(1),
  );

  await sleep(1000);

  const { tx: buyTx } = await createBuyTransaction({
    connection,
    buyer: payer.publicKey,
    userTokenAccount: userTokenAcc.publicKey,
    resourceMintMetadata,
    resourceMintEditionMarker,
    resourceMintMasterEdition,
    sellingResource: sellingResource.publicKey,
    market: market.publicKey,
    marketTreasuryHolder: treasuryHolder.publicKey,
    vaultOwner,
    tradeHistory,
    tradeHistoryBump,
    vault: vault.publicKey,
    vaultOwnerBump,
    newMint: newMint.publicKey,
    newMintEdition,
    newMintMetadata,
    newTokenAccount: mintAta.publicKey,
  });

  const buyRes = await transactionHandler.sendAndConfirmTransaction(
    buyTx,
    [payer],
    defaultSendOptions,
  );

  logDebug('buy:: successful purchase');
  assertConfirmedTransaction(t, buyRes.txConfirmed);
});

test('buy: successful purchase with gating', async (t) => {
  const { payer, connection, transactionHandler } = await createPrerequisites();

  const store = await createStore({
    test: t,
    transactionHandler,
    payer,
    connection,
    params: {
      name: 'Store',
      description: 'Description',
    },
  });

  // Create collection
  const {
    mint: collectionMint,
    metadata: collectionMetadata,
    edition: collectionMasterEditionAccount,
  } = await mintNFT({
    transactionHandler,
    payer,
    connection,
    maxSupply: 0,
  });

  const { sellingResource, vault, vaultOwner, vaultOwnerBump, resourceMint } =
    await initSellingResource({
      test: t,
      transactionHandler,
      payer,
      connection,
      store: store.publicKey,
      maxSupply: 100,
    });

  const { mint: treasuryMint, tokenAccount: userTokenAcc } = await mintNFT({
    transactionHandler,
    payer,
    connection,
  });

  const startDate = Math.round(Date.now() / 1000);
  const params: Omit<CreateMarketInstructionArgs, 'treasuryOwnerBump'> = {
    name: 'Market',
    description: '',
    startDate,
    endDate: startDate + 5 * 20,
    mutable: true,
    price: 0.001,
    piecesInOneWallet: 1,
    // Assign gating to market to use collection
    gatingConfig: {
      collection: collectionMint.publicKey,
      expireOnUse: true,
      gatingTime: null,
    },
  };

  const { market, treasuryHolder } = await createMarket({
    test: t,
    transactionHandler,
    payer,
    connection,
    store: store.publicKey,
    sellingResource: sellingResource.publicKey,
    treasuryMint: treasuryMint.publicKey,
    collectionMint: collectionMint.publicKey,
    params,
  });

  const [tradeHistory, tradeHistoryBump] = await findTradeHistoryAddress(
    payer.publicKey,
    market.publicKey,
  );

  const { mint: newMint, mintAta } = await mintTokenToAccount({
    connection,
    payer: payer.publicKey,
    transactionHandler,
  });

  logDebug('new mint', newMint.publicKey.toBase58());

  const newMintEdition = await deprecated.Edition.getPDA(newMint.publicKey);
  const newMintMetadata = await deprecated.Metadata.getPDA(newMint.publicKey);

  const resourceMintMasterEdition = await deprecated.Edition.getPDA(resourceMint.publicKey);
  const resourceMintMetadata = await deprecated.Metadata.getPDA(resourceMint.publicKey);
  const resourceMintEditionMarker = await deprecated.EditionMarker.getPDA(
    resourceMint.publicKey,
    new BN(1),
  );

  // Create NFT from collection
  const {
    mint: userCollectionTokenMint,
    tokenAccount: userCollectionTokenAcc,
    metadata: userCollectionMetadata,
  } = await mintNFT({
    transactionHandler,
    payer,
    connection,
    collectionMint: collectionMint.publicKey,
  });

  await verifyCollection({
    transactionHandler,
    connection,
    payer,
    metadata: userCollectionMetadata,
    collectionAuthority: payer.publicKey,
    collection: collectionMetadata,
    collectionMint: collectionMint.publicKey,
    collectionMasterEditionAccount,
  });

  await sleep(1000);

  const { tx: buyTx } = await createBuyTransaction({
    connection,
    buyer: payer.publicKey,
    userTokenAccount: userTokenAcc.publicKey,
    resourceMintMetadata,
    resourceMintEditionMarker,
    resourceMintMasterEdition,
    sellingResource: sellingResource.publicKey,
    market: market.publicKey,
    marketTreasuryHolder: treasuryHolder.publicKey,
    vaultOwner,
    tradeHistory,
    tradeHistoryBump,
    vault: vault.publicKey,
    vaultOwnerBump,
    newMint: newMint.publicKey,
    newMintEdition,
    newMintMetadata,
    newTokenAccount: mintAta.publicKey,
    additionalKeys: [
      {
        pubkey: userCollectionTokenAcc.publicKey,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: userCollectionTokenMint.publicKey,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: userCollectionMetadata,
        isSigner: false,
        isWritable: false,
      },
    ],
  });

  const buyRes = await transactionHandler.sendAndConfirmTransaction(
    buyTx,
    [payer],
    defaultSendOptions,
  );

  logDebug('buy:: successful purchase');
  assertConfirmedTransaction(t, buyRes.txConfirmed);
});

test('buy: unsuccessful purchase with gating', async (t) => {
  const { payer, connection, transactionHandler } = await createPrerequisites();

  const store = await createStore({
    test: t,
    transactionHandler,
    payer,
    connection,
    params: {
      name: 'Store',
      description: 'Description',
    },
  });

  // Create collection
  const { mint: collectionMint } = await mintNFT({
    transactionHandler,
    payer,
    connection,
    maxSupply: 0,
  });

  const { sellingResource, vault, vaultOwner, vaultOwnerBump, resourceMint } =
    await initSellingResource({
      test: t,
      transactionHandler,
      payer,
      connection,
      store: store.publicKey,
      maxSupply: 100,
    });

  const { mint: treasuryMint, tokenAccount: userTokenAcc } = await mintNFT({
    transactionHandler,
    payer,
    connection,
  });

  const startDate = Math.round(Date.now() / 1000);
  const params: Omit<CreateMarketInstructionArgs, 'treasuryOwnerBump'> = {
    name: 'Market',
    description: '',
    startDate,
    endDate: startDate + 5 * 20,
    mutable: true,
    price: 0.001,
    piecesInOneWallet: 1,
    // Assign gating to market to use collection
    gatingConfig: {
      collection: collectionMint.publicKey,
      expireOnUse: true,
      gatingTime: null,
    },
  };

  const { market, treasuryHolder } = await createMarket({
    test: t,
    transactionHandler,
    payer,
    connection,
    store: store.publicKey,
    sellingResource: sellingResource.publicKey,
    treasuryMint: treasuryMint.publicKey,
    collectionMint: collectionMint.publicKey,
    params,
  });

  const [tradeHistory, tradeHistoryBump] = await findTradeHistoryAddress(
    payer.publicKey,
    market.publicKey,
  );

  const { mint: newMint, mintAta } = await mintTokenToAccount({
    connection,
    payer: payer.publicKey,
    transactionHandler,
  });

  logDebug('new mint', newMint.publicKey.toBase58());

  const newMintEdition = await deprecated.Edition.getPDA(newMint.publicKey);
  const newMintMetadata = await deprecated.Metadata.getPDA(newMint.publicKey);

  const resourceMintMasterEdition = await deprecated.Edition.getPDA(resourceMint.publicKey);
  const resourceMintMetadata = await deprecated.Metadata.getPDA(resourceMint.publicKey);
  const resourceMintEditionMarker = await deprecated.EditionMarker.getPDA(
    resourceMint.publicKey,
    new BN(1),
  );

  await sleep(1000);

  const { tx: buyTx } = await createBuyTransaction({
    connection,
    buyer: payer.publicKey,
    userTokenAccount: userTokenAcc.publicKey,
    resourceMintMetadata,
    resourceMintEditionMarker,
    resourceMintMasterEdition,
    sellingResource: sellingResource.publicKey,
    market: market.publicKey,
    marketTreasuryHolder: treasuryHolder.publicKey,
    vaultOwner,
    tradeHistory,
    tradeHistoryBump,
    vault: vault.publicKey,
    vaultOwnerBump,
    newMint: newMint.publicKey,
    newMintEdition,
    newMintMetadata,
    newTokenAccount: mintAta.publicKey,
    // User doesn't have gating token
  });

  try {
    await transactionHandler.sendAndConfirmTransaction(buyTx, [payer], defaultSendOptions);
  } catch (err) {
    assertError(t, err, [/GatingTokenMissing/i, /Gating token is missing/i]);
  }
});
