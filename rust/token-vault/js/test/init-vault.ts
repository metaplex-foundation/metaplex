import test from 'tape';

import { assertInactiveVault, init, initVaultSetup, killStuckProcess } from './utils';
import {
  assertConfirmedTransaction,
  assertError,
  assertTransactionSummary,
} from '@metaplex-foundation/amman';
import { Transaction } from '@solana/web3.js';
import { initVault } from '../src/instructions/init-vault';
import { AlreadyInitializedError } from '../src/generated';
import { cusper } from '../src/errors';

killStuckProcess();

test('init-vault: init vault allowing further share creation', async (t) => {
  const { transactionHandler, connection, payer, vaultAuthority } = await init();
  const vaultSetup = await initVaultSetup(t, connection, transactionHandler, payer, vaultAuthority);

  const initVaultIx = initVault(vaultSetup, true);

  const initVaulTx = new Transaction().add(initVaultIx);
  const initVaultRes = await transactionHandler.sendAndConfirmTransaction(initVaulTx, []);

  assertConfirmedTransaction(t, initVaultRes.txConfirmed);
  assertTransactionSummary(t, initVaultRes.txSummary, {
    msgRx: [/Init Vault/, /success/],
  });

  await assertInactiveVault(t, connection, vaultSetup.getAccounts(), {
    allowFurtherShareCreation: true,
    tokenTypeCount: 0,
  });
});

test('init-vault: init vault not allowing further share creation', async (t) => {
  const { transactionHandler, connection, payer, vaultAuthority } = await init();
  const vaultSetup = await initVaultSetup(t, connection, transactionHandler, payer, vaultAuthority);

  const initVaultIx = initVault(vaultSetup, false);

  const initVaulTx = new Transaction().add(initVaultIx);
  const initVaultRes = await transactionHandler.sendAndConfirmTransaction(initVaulTx, []);

  assertConfirmedTransaction(t, initVaultRes.txConfirmed);
  assertTransactionSummary(t, initVaultRes.txSummary, {
    msgRx: [/Init Vault/, /success/],
  });

  await assertInactiveVault(t, connection, vaultSetup.getAccounts(), {
    allowFurtherShareCreation: false,
    tokenTypeCount: 0,
  });
});

test('init-vault: init vault twice for same account', async (t) => {
  const { transactionHandler, connection, payer, vaultAuthority } = await init();
  const vaultSetup = await initVaultSetup(t, connection, transactionHandler, payer, vaultAuthority);

  {
    const initVaultIx = initVault(vaultSetup, true);
    const initVaulTx = new Transaction().add(initVaultIx);
    await transactionHandler.sendAndConfirmTransaction(initVaulTx, []);
  }
  {
    const initVaultIx = initVault(vaultSetup, true);
    const initVaulTx = new Transaction().add(initVaultIx);
    try {
      await transactionHandler.sendAndConfirmTransaction(initVaulTx, []);
    } catch (err) {
      assertError(t, err, [/Init Vault/i, /Already initialized/i]);
      const cusperError = cusper.errorFromProgramLogs(err.logs);
      t.ok(cusperError instanceof AlreadyInitializedError, 'is AlreadyInitializedError');
    }
  }
});
