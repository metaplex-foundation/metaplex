import test from 'tape';

import {
  addressLabels,
  assertActiveVault,
  assertInactiveVault,
  initVault,
  killStuckProcess,
  logDebug,
  verifyTokenBalance,
} from './utils';
import { Transaction } from '@solana/web3.js';
import {
  assertConfirmedTransaction,
  assertError,
  assertTransactionSummary,
  TokenBalances,
} from '@metaplex-foundation/amman';
import {
  activateVault,
  ActivateVaultAccounts,
  addTokenToInactiveVault,
  InvalidAuthorityError,
  SafetyDepositSetup,
} from '../src/mpl-token-vault';
import { cusper } from '../src/errors';

killStuckProcess();

test('activate vault: inactive vault with no tokens added activate 0 number of shares', async (t) => {
  const NUMBER_OF_SHARES = 0;
  const { transactionHandler, connection, accounts: initVaultAccounts } = await initVault(t);
  const {
    vault,
    authority: vaultAuthority,
    vaultAuthorityPair,
    fractionMint,
    fractionTreasury,
  } = initVaultAccounts;

  addressLabels.addLabels(initVaultAccounts);

  const accounts: ActivateVaultAccounts = {
    vault,
    vaultAuthority,
    fractionMint,
    fractionTreasury,
  };

  const activateVaultIx = await activateVault(vault, accounts, NUMBER_OF_SHARES);

  const tx = new Transaction().add(activateVaultIx);
  const signers = [vaultAuthorityPair];

  const res = await transactionHandler.sendAndConfirmTransaction(tx, signers);
  assertConfirmedTransaction(t, res.txConfirmed);
  assertTransactionSummary(t, res.txSummary, {
    msgRx: [/Activate Vault/i, /MintTo/i, /success/i],
  });

  await assertActiveVault(t, connection, initVaultAccounts);

  const tokens = await TokenBalances.forTransaction(
    connection,
    res.txSignature,
    addressLabels,
  ).dump(logDebug);
  await verifyTokenBalance(t, tokens, fractionTreasury, fractionMint, 0, NUMBER_OF_SHARES);
});

test('activate vault: inactive vault with no tokens added activate 1000 number of shares', async (t) => {
  const NUMBER_OF_SHARES = 1000;
  const { transactionHandler, connection, accounts: initVaultAccounts } = await initVault(t);
  const {
    vault,
    authority: vaultAuthority,
    vaultAuthorityPair,
    fractionMint,
    fractionTreasury,
  } = initVaultAccounts;

  addressLabels.addLabels(initVaultAccounts);

  const accounts: ActivateVaultAccounts = {
    vault,
    vaultAuthority,
    fractionMint,
    fractionTreasury,
  };

  const activateVaultIx = await activateVault(vault, accounts, NUMBER_OF_SHARES);

  const tx = new Transaction().add(activateVaultIx);
  const signers = [vaultAuthorityPair];
  const res = await transactionHandler.sendAndConfirmTransaction(tx, signers);
  assertConfirmedTransaction(t, res.txConfirmed);
  assertTransactionSummary(t, res.txSummary, {
    msgRx: [/Activate Vault/i, /MintTo/i, /success/i],
  });

  await assertActiveVault(t, connection, initVaultAccounts);
  const tokens = await TokenBalances.forTransaction(
    connection,
    res.txSignature,
    addressLabels,
  ).dump(logDebug);
  await verifyTokenBalance(t, tokens, fractionTreasury, fractionMint, 0, NUMBER_OF_SHARES);
});

test('activate vault: inactive vault with no tokens added activate providing invalid vaultAuthority', async (t) => {
  const NUMBER_OF_SHARES = 1000;
  const { transactionHandler, connection, accounts: initVaultAccounts } = await initVault(t);
  const {
    vault,
    authority: vaultAuthority,
    vaultAuthorityPair,
    fractionMint,
    fractionTreasury,
    payer,
  } = initVaultAccounts;

  addressLabels.addLabels(initVaultAccounts);

  const accounts: ActivateVaultAccounts = {
    vault,
    vaultAuthority,
    fractionMint,
    fractionTreasury,
    fractionMintAuthority: payer,
  };

  const activateVaultIx = await activateVault(vault, accounts, NUMBER_OF_SHARES);

  const tx = new Transaction().add(activateVaultIx);
  const signers = [vaultAuthorityPair];

  try {
    await transactionHandler.sendAndConfirmTransaction(tx, signers);
  } catch (err) {
    assertError(t, err, [/Activate Vault/i, /Invalid program authority/i]);
    const cusperError = cusper.errorFromProgramLogs(err.logs);
    t.ok(cusperError instanceof InvalidAuthorityError, 'is InvalidAuthorityError');
  }

  await assertInactiveVault(t, connection, initVaultAccounts);
});

test('activate vault: inactive vault with tokens added activate 111 number of shares', async (t) => {
  const NUMBER_OF_SHARES = 111;
  const { transactionHandler, connection, accounts: initVaultAccounts } = await initVault(t);
  const {
    vault,
    payer,
    authority: vaultAuthority,
    vaultAuthorityPair,
    fractionMint,
    fractionTreasury,
  } = initVaultAccounts;

  addressLabels.addLabels(initVaultAccounts);

  // -----------------
  // Add Tokens to vault
  // -----------------
  const TOKEN_AMOUNT = 2;
  {
    t.comment(`++++ 1. Adding tokens with amount ${TOKEN_AMOUNT}`);

    const safetyDepositSetup = await SafetyDepositSetup.create(connection, {
      payer,
      vault,
      mintAmount: TOKEN_AMOUNT,
    });

    const addTokenIx = await addTokenToInactiveVault(safetyDepositSetup, { payer, vaultAuthority });
    const tx = new Transaction().add(...safetyDepositSetup.instructions).add(addTokenIx);
    const signers = [
      ...safetyDepositSetup.signers,
      safetyDepositSetup.transferAuthorityPair,
      vaultAuthorityPair,
    ];

    const res = await transactionHandler.sendAndConfirmTransaction(tx, signers);
    assertConfirmedTransaction(t, res.txConfirmed);

    await assertInactiveVault(t, connection, initVaultAccounts, { tokenTypeCount: 1 });
  }

  // -----------------
  // Activate Vault
  // -----------------
  {
    t.comment(`++++ 2. Activating vault with ${NUMBER_OF_SHARES} number of shares`);
    const accounts: ActivateVaultAccounts = {
      vault,
      vaultAuthority,
      fractionMint,
      fractionTreasury,
    };

    const activateVaultIx = await activateVault(vault, accounts, NUMBER_OF_SHARES);

    const tx = new Transaction().add(activateVaultIx);
    const signers = [vaultAuthorityPair];
    const res = await transactionHandler.sendAndConfirmTransaction(tx, signers);
    assertConfirmedTransaction(t, res.txConfirmed);
    assertTransactionSummary(t, res.txSummary, {
      msgRx: [/Activate Vault/i, /MintTo/i, /success/i],
    });

    await assertActiveVault(t, connection, initVaultAccounts, { tokenTypeCount: 1 });
    const tokens = await TokenBalances.forTransaction(
      connection,
      res.txSignature,
      addressLabels,
    ).dump(logDebug);
    await verifyTokenBalance(t, tokens, fractionTreasury, fractionMint, 0, NUMBER_OF_SHARES);
  }
});
