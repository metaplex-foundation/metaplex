import test from 'tape';
import { killStuckProcess } from './utils';

import {
  mintNFT,
  createStore,
  createPrerequisites,
  initSellingResource,
  createMarket,
} from './actions';
import { CreateMarketInstructionArgs } from '../src';

killStuckProcess();

test('create-market: success', async (t) => {
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

  const { sellingResource } = await initSellingResource({
    test: t,
    transactionHandler,
    payer,
    connection,
    store: store.publicKey,
    maxSupply: 100,
  });

  const { mint: treasuryMint } = await mintNFT({
    transactionHandler,
    payer,
    connection,
  });

  const startDate = Math.round(Date.now() / 1000) + 5;
  const params: Omit<CreateMarketInstructionArgs, 'treasuryOwnerBump'> = {
    name: 'Market',
    description: '',
    startDate,
    endDate: startDate + 5 * 20,
    mutable: true,
    price: 0.001,
    piecesInOneWallet: 1,
    gatingConfig: null,
  };

  await createMarket({
    test: t,
    transactionHandler,
    payer,
    connection,
    store: store.publicKey,
    sellingResource: sellingResource.publicKey,
    treasuryMint: treasuryMint.publicKey,
    params,
  });
});
