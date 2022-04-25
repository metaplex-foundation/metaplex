import test from 'tape';

import {
  addressLabels,
  assertCombinedVault,
  assertInactiveVault,
  initAndActivateVault,
  initVault,
  killStuckProcess,
  logDebug,
  verifyTokenBalance,
} from './utils';
import { Signer, Transaction } from '@solana/web3.js';
import {
  combineVault,
  CombineVaultSetup,
  MintFractionalSharesInstructionAccounts,
  mintSharesToTreasury,
  VaultShouldBeActiveError,
} from '../src/mpl-token-vault';
import {
  assertConfirmedTransaction,
  assertError,
  assertTransactionSummary,
  TokenBalances,
} from '@metaplex-foundation/amman';
import { cusper } from '../src/errors';

killStuckProcess();

test('combine vault: activate vault with 0 shares and then combine it', async (t) => {
  // -----------------
  // Init and Activate Vault
  // -----------------
  const {
    transactionHandler,
    connection,
    accounts: initVaultAccounts,
  } = await initAndActivateVault(t, { allowFurtherShareCreation: false, numberOfShares: 0 });
  const {
    vault,
    authority: vaultAuthority,
    vaultAuthorityPair,
    payer,
    priceMint,
    pricingLookupAddress,
    fractionMint,
    fractionTreasury,
    redeemTreasury,
  } = initVaultAccounts;

  addressLabels.addLabels(initVaultAccounts);

  // -----------------
  // Combine Vault
  // -----------------
  const combineSetup: CombineVaultSetup = await CombineVaultSetup.create(connection, {
    vault,
    vaultAuthority,
    fractionMint,
    fractionTreasury,
    redeemTreasury,
    priceMint,
    externalPricing: pricingLookupAddress,
  });
  await combineSetup.createOutstandingShares(payer);
  await combineSetup.createPayment(payer);
  combineSetup.approveTransfers(payer);
  combineSetup.assertComplete();

  addressLabels.addLabels(combineSetup);

  const combineIx = await combineVault(combineSetup);

  const tx = new Transaction().add(...combineSetup.instructions).add(combineIx);
  const res = await transactionHandler.sendAndConfirmTransaction(tx, [
    ...combineSetup.signers,
    combineSetup.transferAuthorityPair,
    vaultAuthorityPair,
  ]);

  assertConfirmedTransaction(t, res.txConfirmed);
  assertTransactionSummary(t, res.txSummary, {
    msgRx: [/Combine Vault/i, /Transfer/i, /Burn/i, /success/i],
  });

  await assertCombinedVault(t, connection, initVaultAccounts);
  // -----------------
  // Verify token balances
  // -----------------
  const tokens = await TokenBalances.forTransaction(
    connection,
    res.txSignature,
    addressLabels,
  ).dump(logDebug);
  await verifyTokenBalance(t, tokens, combineSetup.fractionTreasury, fractionMint, 0, 0);
  await verifyTokenBalance(t, tokens, combineSetup.redeemTreasury, priceMint, 0, 0);
  await verifyTokenBalance(t, tokens, combineSetup.yourOutstandingShares, fractionMint, 0, 0);
  await verifyTokenBalance(t, tokens, combineSetup.yourPayment, priceMint, 0, 0);
});

test('combine vault: activate vault, mint shares and then combine it', async (t) => {
  // -----------------
  // Init and Activate Vault
  // -----------------
  const {
    transactionHandler,
    connection,
    accounts: initVaultAccounts,
  } = await initAndActivateVault(t, { allowFurtherShareCreation: true, numberOfShares: 0 });
  const {
    vault,
    authority: vaultAuthority,
    vaultAuthorityPair,
    payer,
    priceMint,
    pricingLookupAddress,
    fractionMint,
    fractionTreasury,
    fractionMintAuthority,
    redeemTreasury,
  } = initVaultAccounts;

  addressLabels.addLabels(initVaultAccounts);

  // -----------------
  // Mint Shares
  // -----------------
  const NUMBER_OF_SHARES = 5;
  {
    const accounts: MintFractionalSharesInstructionAccounts = {
      fractionTreasury,
      fractionMint,
      vault,
      vaultAuthority,
      mintAuthority: fractionMintAuthority,
    };
    const mintSharesIx = mintSharesToTreasury(accounts, NUMBER_OF_SHARES);
    const signers: Signer[] = [vaultAuthorityPair];

    const tx = new Transaction().add(mintSharesIx);
    const res = await transactionHandler.sendAndConfirmTransaction(tx, signers);
    assertConfirmedTransaction(t, res.txConfirmed);
  }

  // -----------------
  // Combine Vault
  // -----------------
  const combineSetup: CombineVaultSetup = await CombineVaultSetup.create(connection, {
    vault,
    vaultAuthority,
    fractionMint,
    fractionTreasury,
    redeemTreasury,
    priceMint,
    externalPricing: pricingLookupAddress,
  });
  await combineSetup.createOutstandingShares(payer);
  await combineSetup.createPayment(payer);
  combineSetup.approveTransfers(payer);
  combineSetup.assertComplete();

  addressLabels.addLabels(combineSetup);

  const combineIx = await combineVault(combineSetup);

  const tx = new Transaction().add(...combineSetup.instructions).add(combineIx);
  const res = await transactionHandler.sendAndConfirmTransaction(tx, [
    ...combineSetup.signers,
    combineSetup.transferAuthorityPair,
    vaultAuthorityPair,
  ]);

  assertConfirmedTransaction(t, res.txConfirmed);
  assertTransactionSummary(t, res.txSummary, {
    msgRx: [/Combine Vault/i, /Transfer/i, /Burn/i, /success/i],
  });

  await assertCombinedVault(t, connection, initVaultAccounts, { allowFurtherShareCreation: true });
  // -----------------
  // Verify token balances
  // -----------------
  const tokens = await TokenBalances.forTransaction(
    connection,
    res.txSignature,
    addressLabels,
  ).dump(logDebug);
  await verifyTokenBalance(
    t,
    tokens,
    combineSetup.fractionTreasury,
    fractionMint,
    NUMBER_OF_SHARES,
    0,
  );
  await verifyTokenBalance(t, tokens, combineSetup.redeemTreasury, priceMint, 0, 0);
  await verifyTokenBalance(t, tokens, combineSetup.yourOutstandingShares, fractionMint, 0, 0);
  await verifyTokenBalance(t, tokens, combineSetup.yourPayment, priceMint, 0, 0);
});

// -----------------
// Invalid attempts
// -----------------
test('combine-vault: attempt to combine inactive vault, fails', async (t) => {
  const {
    transactionHandler,
    connection,
    accounts: initVaultAccounts,
  } = await initVault(t, { allowFurtherShareCreation: false });
  const {
    vault,
    authority: vaultAuthority,
    vaultAuthorityPair,
    payer,
    priceMint,
    pricingLookupAddress,
    fractionMint,
    fractionTreasury,
    redeemTreasury,
  } = initVaultAccounts;
  const combineSetup: CombineVaultSetup = await CombineVaultSetup.create(connection, {
    vault,
    vaultAuthority,
    fractionMint,
    fractionTreasury,
    redeemTreasury,
    priceMint,
    externalPricing: pricingLookupAddress,
  });

  await combineSetup.createOutstandingShares(payer);
  await combineSetup.createPayment(payer);
  combineSetup.approveTransfers(payer);
  combineSetup.assertComplete();

  addressLabels.addLabels(combineSetup);

  const combineIx = await combineVault(combineSetup);

  const tx = new Transaction().add(...combineSetup.instructions).add(combineIx);
  try {
    await transactionHandler.sendAndConfirmTransaction(tx, [
      ...combineSetup.signers,
      combineSetup.transferAuthorityPair,
      vaultAuthorityPair,
    ]);
  } catch (err) {
    assertError(t, err, [/Combine Vault/i, /Vault should be active/i]);
    const cusperError = cusper.errorFromProgramLogs(err.logs);
    t.ok(cusperError instanceof VaultShouldBeActiveError, 'is VaultShouldBeActiveError');
  }
  await assertInactiveVault(t, connection, initVaultAccounts);
});

test('combine-vault: attempt to combine vault twice, fails', async (t) => {
  // -----------------
  // Init and Activate Vault
  // -----------------
  const {
    transactionHandler,
    connection,
    accounts: initVaultAccounts,
  } = await initAndActivateVault(t, { allowFurtherShareCreation: false, numberOfShares: 0 });
  const {
    vault,
    authority: vaultAuthority,
    vaultAuthorityPair,
    payer,
    priceMint,
    pricingLookupAddress,
    fractionMint,
    fractionTreasury,
    redeemTreasury,
  } = initVaultAccounts;

  addressLabels.addLabels(initVaultAccounts);

  // -----------------
  // Combine Vault
  // -----------------
  const combineSetup: CombineVaultSetup = await CombineVaultSetup.create(connection, {
    vault,
    vaultAuthority,
    fractionMint,
    fractionTreasury,
    redeemTreasury,
    priceMint,
    externalPricing: pricingLookupAddress,
  });
  await combineSetup.createOutstandingShares(payer);
  await combineSetup.createPayment(payer);
  combineSetup.approveTransfers(payer);
  combineSetup.assertComplete();

  addressLabels.addLabels(combineSetup);

  // 1. time
  {
    const combineIx = await combineVault(combineSetup);

    const tx = new Transaction().add(...combineSetup.instructions).add(combineIx);
    const res = await transactionHandler.sendAndConfirmTransaction(tx, [
      ...combineSetup.signers,
      combineSetup.transferAuthorityPair,
      vaultAuthorityPair,
    ]);

    assertConfirmedTransaction(t, res.txConfirmed);
    assertTransactionSummary(t, res.txSummary, {
      msgRx: [/Combine Vault/i, /Transfer/i, /Burn/i, /success/i],
    });

    await assertCombinedVault(t, connection, initVaultAccounts);
  }

  // 2. time
  {
    const combineIx = await combineVault(combineSetup);

    const tx = new Transaction().add(combineIx);
    try {
      await transactionHandler.sendAndConfirmTransaction(tx, [
        combineSetup.transferAuthorityPair,
        vaultAuthorityPair,
      ]);
    } catch (err) {
      assertError(t, err, [/Combine Vault/i, /Vault should be active/i]);
      const cusperError = cusper.errorFromProgramLogs(err.logs);
      t.ok(cusperError instanceof VaultShouldBeActiveError, 'is VaultShouldBeActiveError');
    }

    await assertCombinedVault(t, connection, initVaultAccounts);
  }
});
