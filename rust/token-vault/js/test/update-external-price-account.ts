import test from 'tape';
import spok from 'spok';

import {
  addressLabels,
  assertIsNotNull,
  init,
  killStuckProcess,
  spokSameBignum,
  spokSamePubkey,
} from './utils';
import { Transaction } from '@solana/web3.js';
import { assertConfirmedTransaction, assertTransactionSummary } from '@metaplex-foundation/amman';
import { ExternalPriceAccount, Key, QUOTE_MINT } from '../src/mpl-token-vault';
import { createExternalPriceAccount } from '../src/instructions/create-external-price-account';

killStuckProcess();

test('external account: create', async (t) => {
  const { transactionHandler, connection, payer } = await init();
  const [priceMint] = addressLabels.genKeypair('priceMint');
  addressLabels.addLabel('priceMint', priceMint);

  const [instructions, signers, { externalPriceAccount }] = await createExternalPriceAccount(
    connection,
    payer,
  );
  addressLabels.addLabel('externalPriceAccount', externalPriceAccount);

  const tx = new Transaction().add(...instructions);
  const res = await transactionHandler.sendAndConfirmTransaction(tx, signers);

  assertConfirmedTransaction(t, res.txConfirmed);
  assertTransactionSummary(t, res.txSummary, {
    msgRx: [/Update External Price Account/i, /success/],
  });

  const externalPriceAccountInfo = await connection.getAccountInfo(externalPriceAccount);
  assertIsNotNull(t, externalPriceAccountInfo);
  const [externalPriceAccountData] = ExternalPriceAccount.fromAccountInfo(externalPriceAccountInfo);

  spok(t, externalPriceAccountData, {
    $topic: 'externalPriceAccount',
    key: Key.ExternalAccountKeyV1,
    pricePerShare: spokSameBignum(0),
    priceMint: spokSamePubkey(QUOTE_MINT),
    allowedToCombine: true,
  });
});
