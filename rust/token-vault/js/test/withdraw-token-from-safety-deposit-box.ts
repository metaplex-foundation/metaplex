import test from 'tape';

import {
  addressLabels,
  assertCombinedVault,
  assertDeactivatedVault,
  getAccount,
  initVault,
  killStuckProcess,
  logDebug,
  spokSameBignum,
  verifyTokenBalance,
} from './utils';
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import {
  assertConfirmedTransaction,
  assertError,
  assertTransactionSummary,
  PayerTransactionHandler,
  TokenBalances,
} from '@metaplex-foundation/amman';
import {
  activateVault,
  addTokenToInactiveVault,
  combineVault,
  CombineVaultSetup,
  SafetyDepositBoxVaultMismatchError,
  SafetyDepositSetup,
  setupWithdrawFromSafetyDestinationAccount,
  StoreLessThanAmountError,
  withdrawTokenFromSafetyDepositBox,
  WithdrawTokenFromSafetyDepositBoxAccounts,
} from '../src/mpl-token-vault';
import spok from 'spok';
import { cusper } from '../src/errors';

killStuckProcess();

test('combined vault: with one safety deposit, withdraw all tokens', async (t) => {
  const TOKEN_AMOUNT = 2;
  const { transactionHandler, connection, safetyDeposit, initVaultAccounts } =
    await combinedVaultWithOneDeposit(t, TOKEN_AMOUNT);

  const {
    payer,
    vault,
    authority: vaultAuthority,
    vaultAuthorityPair,
    fractionMint,
  } = initVaultAccounts;

  const [setupDestinationIxs, setupDestinationSigners, { destination }] =
    await setupWithdrawFromSafetyDestinationAccount(connection, {
      payer,
      mint: safetyDeposit.tokenMint,
    });
  addressLabels.addLabels({ destination });

  const accounts: WithdrawTokenFromSafetyDepositBoxAccounts = {
    destination,
    fractionMint,
    vault,
    vaultAuthority,
    store: safetyDeposit.store,
    safetyDeposit: safetyDeposit.safetyDeposit,
  };
  const withdrawIx = await withdrawTokenFromSafetyDepositBox(accounts, TOKEN_AMOUNT);

  const signers = [...setupDestinationSigners, vaultAuthorityPair];
  const tx = new Transaction().add(...setupDestinationIxs).add(withdrawIx);
  const res = await transactionHandler.sendAndConfirmTransaction(tx, signers);
  assertConfirmedTransaction(t, res.txConfirmed);
  assertTransactionSummary(t, res.txSummary, {
    msgRx: [/Withdraw Token from Safety Deposit Box/i, /Transfer/i, /success/i],
  });

  const tokens = await TokenBalances.forTransaction(
    connection,
    res.txSignature,
    addressLabels,
  ).dump(logDebug);

  await verifyTokenBalance(t, tokens, safetyDeposit.store, safetyDeposit.tokenMint, 2, 0);
  await verifyTokenBalance(t, tokens, destination, safetyDeposit.tokenMint, 0, 2);

  await assertDeactivatedVault(t, connection, initVaultAccounts, {
    allowFurtherShareCreation: true,
  });
});

test('combined vault: with one safety deposit, withdraw half of all tokens', async (t) => {
  const TOKEN_AMOUNT = 2;
  const { transactionHandler, connection, safetyDeposit, initVaultAccounts } =
    await combinedVaultWithOneDeposit(t, TOKEN_AMOUNT);

  const {
    payer,
    vault,
    authority: vaultAuthority,
    vaultAuthorityPair,
    fractionMint,
  } = initVaultAccounts;

  const [setupDestinationIxs, setupDestinationSigners, { destination }] =
    await setupWithdrawFromSafetyDestinationAccount(connection, {
      payer,
      mint: safetyDeposit.tokenMint,
    });
  addressLabels.addLabels({ destination });

  const accounts: WithdrawTokenFromSafetyDepositBoxAccounts = {
    destination,
    fractionMint,
    vault,
    vaultAuthority,
    store: safetyDeposit.store,
    safetyDeposit: safetyDeposit.safetyDeposit,
  };
  const withdrawIx = await withdrawTokenFromSafetyDepositBox(accounts, TOKEN_AMOUNT / 2);

  const signers = [...setupDestinationSigners, vaultAuthorityPair];
  const tx = new Transaction().add(...setupDestinationIxs).add(withdrawIx);
  const res = await transactionHandler.sendAndConfirmTransaction(tx, signers);
  assertConfirmedTransaction(t, res.txConfirmed);
  assertTransactionSummary(t, res.txSummary, {
    msgRx: [/Withdraw Token from Safety Deposit Box/i, /Transfer/i, /success/i],
  });

  const tokens = await TokenBalances.forTransaction(
    connection,
    res.txSignature,
    addressLabels,
  ).dump(logDebug);

  await verifyTokenBalance(t, tokens, safetyDeposit.store, safetyDeposit.tokenMint, 2, 1);
  await verifyTokenBalance(t, tokens, destination, safetyDeposit.tokenMint, 0, 1);

  await assertCombinedVault(t, connection, initVaultAccounts, {
    allowFurtherShareCreation: true,
    tokenTypeCount: 1,
  });
});

test('combined vault: with two safety deposits, repeatedly withdrawing tokens until all are gone', async (t) => {
  const FIRST_TOKEN_AMOUNT = 2;
  const SECOND_TOKEN_AMOUNT = 3;
  const {
    transactionHandler,
    connection,
    firstSafetyDeposit,
    secondSafetyDeposit,
    initVaultAccounts,
  } = await combinedVaultWithTwoDeposits(t, FIRST_TOKEN_AMOUNT, SECOND_TOKEN_AMOUNT);
  const {
    payer,
    vault,
    authority: vaultAuthority,
    vaultAuthorityPair,
    fractionMint,
  } = initVaultAccounts;

  const firstDepositAccounts: Omit<WithdrawTokenFromSafetyDepositBoxAccounts, 'destination'> = {
    fractionMint,
    vault,
    vaultAuthority,
    store: firstSafetyDeposit.store,
    safetyDeposit: firstSafetyDeposit.safetyDeposit,
  };
  const secondDepositAccounts: Omit<WithdrawTokenFromSafetyDepositBoxAccounts, 'destination'> = {
    fractionMint,
    vault,
    vaultAuthority,
    store: secondSafetyDeposit.store,
    safetyDeposit: secondSafetyDeposit.safetyDeposit,
  };
  {
    t.comment('+++ Withdrawing half of first deposit');
    const [setupDestinationIxs, setupDestinationSigners, { destination }] =
      await setupWithdrawFromSafetyDestinationAccount(connection, {
        payer,
        mint: firstSafetyDeposit.tokenMint,
      });
    const withdrawIx = await withdrawTokenFromSafetyDepositBox(
      { ...firstDepositAccounts, destination },
      FIRST_TOKEN_AMOUNT / 2,
    );

    const signers = [...setupDestinationSigners, vaultAuthorityPair];
    const tx = new Transaction().add(...setupDestinationIxs).add(withdrawIx);
    const res = await transactionHandler.sendAndConfirmTransaction(tx, signers);
    assertConfirmedTransaction(t, res.txConfirmed);
    assertTransactionSummary(t, res.txSummary, {
      msgRx: [/Withdraw Token from Safety Deposit Box/i, /Transfer/i, /success/i],
    });

    const tokens = await TokenBalances.forTransaction(
      connection,
      res.txSignature,
      addressLabels,
    ).dump(logDebug);

    await verifyTokenBalance(
      t,
      tokens,
      firstSafetyDeposit.store,
      firstSafetyDeposit.tokenMint,
      2,
      1,
    );
    await verifyTokenBalance(t, tokens, destination, firstSafetyDeposit.tokenMint, 0, 1);
    const storeAccount = await getAccount(connection, firstSafetyDeposit.store);
    spok(t, storeAccount, {
      $topic: 'firstSafetyDeposit: store account',
      mint: firstSafetyDeposit.tokenMint,
      amount: spokSameBignum(1),
    });
    await assertCombinedVault(t, connection, initVaultAccounts, {
      allowFurtherShareCreation: true,
      tokenTypeCount: 2,
    });
  }
  {
    t.comment('+++ Withdrawing all of second deposit');
    const [setupDestinationIxs, setupDestinationSigners, { destination }] =
      await setupWithdrawFromSafetyDestinationAccount(connection, {
        payer,
        mint: secondSafetyDeposit.tokenMint,
      });
    const withdrawIx = await withdrawTokenFromSafetyDepositBox(
      { ...secondDepositAccounts, destination },
      SECOND_TOKEN_AMOUNT,
    );

    const signers = [...setupDestinationSigners, vaultAuthorityPair];
    const tx = new Transaction().add(...setupDestinationIxs).add(withdrawIx);
    const res = await transactionHandler.sendAndConfirmTransaction(tx, signers);
    assertConfirmedTransaction(t, res.txConfirmed);
    assertTransactionSummary(t, res.txSummary, {
      msgRx: [/Withdraw Token from Safety Deposit Box/i, /Transfer/i, /success/i],
    });

    const tokens = await TokenBalances.forTransaction(
      connection,
      res.txSignature,
      addressLabels,
    ).dump(logDebug);

    await verifyTokenBalance(
      t,
      tokens,
      secondSafetyDeposit.store,
      secondSafetyDeposit.tokenMint,
      SECOND_TOKEN_AMOUNT,
      0,
    );
    await verifyTokenBalance(
      t,
      tokens,
      destination,
      secondSafetyDeposit.tokenMint,
      0,
      SECOND_TOKEN_AMOUNT,
    );

    const storeAccount = await getAccount(connection, secondSafetyDeposit.store);
    spok(t, storeAccount, {
      $topic: 'secondSafetyDeposit: store account',
      mint: secondSafetyDeposit.tokenMint,
      amount: spokSameBignum(0),
    });
    await assertCombinedVault(t, connection, initVaultAccounts, {
      allowFurtherShareCreation: true,
      tokenTypeCount: 1,
    });
  }
  {
    t.comment('+++ Withdrawing remaining tokens of first deposit');
    const [setupDestinationIxs, setupDestinationSigners, { destination }] =
      await setupWithdrawFromSafetyDestinationAccount(connection, {
        payer,
        mint: firstSafetyDeposit.tokenMint,
      });
    const withdrawIx = await withdrawTokenFromSafetyDepositBox(
      { ...firstDepositAccounts, destination },
      FIRST_TOKEN_AMOUNT / 2,
    );

    const signers = [...setupDestinationSigners, vaultAuthorityPair];
    const tx = new Transaction().add(...setupDestinationIxs).add(withdrawIx);
    const res = await transactionHandler.sendAndConfirmTransaction(tx, signers);
    assertConfirmedTransaction(t, res.txConfirmed);
    assertTransactionSummary(t, res.txSummary, {
      msgRx: [/Withdraw Token from Safety Deposit Box/i, /Transfer/i, /success/i],
    });

    const tokens = await TokenBalances.forTransaction(
      connection,
      res.txSignature,
      addressLabels,
    ).dump(logDebug);

    await verifyTokenBalance(
      t,
      tokens,
      firstSafetyDeposit.store,
      firstSafetyDeposit.tokenMint,
      1,
      0,
    );
    await verifyTokenBalance(t, tokens, destination, firstSafetyDeposit.tokenMint, 0, 1);
    await assertDeactivatedVault(t, connection, initVaultAccounts, {
      allowFurtherShareCreation: true,
      tokenTypeCount: 0,
    });
  }
});

// -----------------
// Failure cases
// -----------------
test('combined vault: with one safety deposit, withdraw more tokens than it contains, fails', async (t) => {
  const TOKEN_AMOUNT = 2;
  const { transactionHandler, connection, safetyDeposit, initVaultAccounts } =
    await combinedVaultWithOneDeposit(t, TOKEN_AMOUNT);

  const {
    payer,
    vault,
    authority: vaultAuthority,
    vaultAuthorityPair,
    fractionMint,
  } = initVaultAccounts;

  const [setupDestinationIxs, setupDestinationSigners, { destination }] =
    await setupWithdrawFromSafetyDestinationAccount(connection, {
      payer,
      mint: safetyDeposit.tokenMint,
    });
  addressLabels.addLabels({ destination });

  const accounts: WithdrawTokenFromSafetyDepositBoxAccounts = {
    destination,
    fractionMint,
    vault,
    vaultAuthority,
    store: safetyDeposit.store,
    safetyDeposit: safetyDeposit.safetyDeposit,
  };
  const withdrawIx = await withdrawTokenFromSafetyDepositBox(accounts, TOKEN_AMOUNT + 1);

  const signers = [...setupDestinationSigners, vaultAuthorityPair];
  const tx = new Transaction().add(...setupDestinationIxs).add(withdrawIx);
  try {
    await transactionHandler.sendAndConfirmTransaction(tx, signers);
  } catch (err) {
    assertError(t, err, [/Withdraw Token from Safety Deposit Box/i, /Store has less than amount/i]);
    const cusperError = cusper.errorFromProgramLogs(err.logs);
    t.ok(
      cusperError instanceof StoreLessThanAmountError,
      'cusper identifies as StoreLessThanAmountError',
    );
  }

  await assertCombinedVault(t, connection, initVaultAccounts, {
    allowFurtherShareCreation: true,
    tokenTypeCount: 1,
  });
  // Store should not have been debited
  const storeAccount = await getAccount(connection, safetyDeposit.store);
  spok(t, storeAccount, {
    $topic: 'safetyDeposit: store account',
    mint: safetyDeposit.tokenMint,
    amount: spokSameBignum(TOKEN_AMOUNT),
  });
});

test('combined vault: with no safety deposit passing uninitialized one, withdraw tokens, fails', async (t) => {
  const TOKEN_AMOUNT = 2;
  const { transactionHandler, connection, safetyDeposit, initVaultAccounts } =
    await combinedVaultWithOneDeposit(t, TOKEN_AMOUNT, { forgetToMakeDeposit: true });

  const {
    payer,
    vault,
    authority: vaultAuthority,
    vaultAuthorityPair,
    fractionMint,
  } = initVaultAccounts;

  const [setupDestinationIxs, setupDestinationSigners, { destination }] =
    await setupWithdrawFromSafetyDestinationAccount(connection, {
      payer,
      mint: safetyDeposit.tokenMint,
    });
  addressLabels.addLabels({ destination });

  const accounts: WithdrawTokenFromSafetyDepositBoxAccounts = {
    destination,
    fractionMint,
    vault,
    vaultAuthority,
    store: safetyDeposit.store,
    safetyDeposit: safetyDeposit.safetyDeposit,
  };
  const withdrawIx = await withdrawTokenFromSafetyDepositBox(accounts, TOKEN_AMOUNT);

  const signers = [...setupDestinationSigners, vaultAuthorityPair];
  const tx = new Transaction().add(...setupDestinationIxs).add(withdrawIx);
  try {
    const res = await transactionHandler.sendAndConfirmTransaction(tx, signers);
    console.log(res.txSignature);
  } catch (err) {
    assertError(t, err, [/Withdraw Token from Safety Deposit Box/i, /index out of bounds/i]);
  }

  await assertCombinedVault(t, connection, initVaultAccounts, {
    allowFurtherShareCreation: true,
    tokenTypeCount: 0,
  });
});

test('combined vault: with no safety deposit passing one from different vault, withdraw tokens, fails', async (t) => {
  const TOKEN_AMOUNT = 2;
  const { safetyDeposit: otherVaultSafetyDeposit } = await combinedVaultWithOneDeposit(
    t,
    TOKEN_AMOUNT,
  );
  const { transactionHandler, connection, initVaultAccounts } = await combinedVaultWithOneDeposit(
    t,
    TOKEN_AMOUNT,
    { forgetToMakeDeposit: true },
  );

  const {
    payer,
    vault,
    authority: vaultAuthority,
    vaultAuthorityPair,
    fractionMint,
  } = initVaultAccounts;

  const [setupDestinationIxs, setupDestinationSigners, { destination }] =
    await setupWithdrawFromSafetyDestinationAccount(connection, {
      payer,
      mint: otherVaultSafetyDeposit.tokenMint,
    });
  addressLabels.addLabels({ destination });

  const accounts: WithdrawTokenFromSafetyDepositBoxAccounts = {
    destination,
    fractionMint,
    vault,
    vaultAuthority,
    store: otherVaultSafetyDeposit.store,
    safetyDeposit: otherVaultSafetyDeposit.safetyDeposit,
  };
  const withdrawIx = await withdrawTokenFromSafetyDepositBox(accounts, TOKEN_AMOUNT);

  const signers = [...setupDestinationSigners, vaultAuthorityPair];
  const tx = new Transaction().add(...setupDestinationIxs).add(withdrawIx);
  try {
    await transactionHandler.sendAndConfirmTransaction(tx, signers);
  } catch (err) {
    assertError(t, err, [
      /Withdraw Token from Safety Deposit Box/i,
      /safety deposit.+does not belong to this vault/i,
    ]);
    const cusperError = cusper.errorFromProgramLogs(err.logs);
    t.ok(
      cusperError instanceof SafetyDepositBoxVaultMismatchError,
      'is SafetyDepositBoxVaultMismatch error',
    );
  }

  await assertCombinedVault(t, connection, initVaultAccounts, {
    allowFurtherShareCreation: true,
    tokenTypeCount: 0,
  });
  // Store of other vault should not have been debited
  const storeAccount = await getAccount(connection, otherVaultSafetyDeposit.store);
  spok(t, storeAccount, {
    $topic: 'safetyDeposit: store account',
    mint: otherVaultSafetyDeposit.tokenMint,
    amount: spokSameBignum(TOKEN_AMOUNT),
  });
});

// -----------------
// Helpers
// -----------------
async function addSafetyDeposit(
  t: test.Test,
  transactionHandler: PayerTransactionHandler,
  connection: Connection,
  vaultAuthorityPair: Keypair,
  accounts: {
    vault: PublicKey;
    payer: PublicKey;
  },
  mintAmount: number,
  opts: { forgetToMakeDeposit?: boolean } = {},
) {
  const { vault, payer } = accounts;
  const { forgetToMakeDeposit = false } = opts;

  const safetyDepositSetup = await SafetyDepositSetup.create(connection, {
    payer,
    vault,
    mintAmount,
  });

  addressLabels.addLabels(safetyDepositSetup);

  const addTokenIx = await addTokenToInactiveVault(safetyDepositSetup, {
    payer,
    vaultAuthority: vaultAuthorityPair.publicKey,
  });
  const tx = new Transaction().add(...safetyDepositSetup.instructions);
  const signers = [...safetyDepositSetup.signers];
  // Setup the safety deposit, but maybe don't actually add it the vault to create invalid scenarios
  if (!forgetToMakeDeposit) {
    tx.add(addTokenIx);
    signers.push(...[safetyDepositSetup.transferAuthorityPair, vaultAuthorityPair]);
  }

  const res = await transactionHandler.sendAndConfirmTransaction(tx, signers);
  assertConfirmedTransaction(t, res.txConfirmed);

  return safetyDepositSetup;
}

async function activateAndCombineVault(
  t: test.Test,
  transactionHandler: PayerTransactionHandler,
  connection: Connection,
  vaultAuthorityPair: Keypair,
  accounts: {
    vault: PublicKey;
    fractionMint: PublicKey;
    fractionTreasury: PublicKey;
    redeemTreasury: PublicKey;
    priceMint: PublicKey;
    pricingLookupAddress: PublicKey;
    payer: PublicKey;
  },
) {
  const {
    vault,
    fractionMint,
    fractionTreasury,
    redeemTreasury,
    priceMint,
    pricingLookupAddress,
    payer,
  } = accounts;
  const activateVaultIx = await activateVault(
    vault,
    {
      vault,
      vaultAuthority: vaultAuthorityPair.publicKey,
      fractionMint,
      fractionTreasury,
    },
    0,
  );
  const combineSetup: CombineVaultSetup = await CombineVaultSetup.create(connection, {
    vault,
    vaultAuthority: vaultAuthorityPair.publicKey,
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

  const tx = new Transaction()
    .add(activateVaultIx)
    .add(...combineSetup.instructions)
    .add(combineIx);
  const res = await transactionHandler.sendAndConfirmTransaction(tx, [
    ...combineSetup.signers,
    combineSetup.transferAuthorityPair,
    vaultAuthorityPair,
  ]);

  assertConfirmedTransaction(t, res.txConfirmed);
}

async function combinedVaultWithOneDeposit(
  t: test.Test,
  tokenAmount: number,
  opts: { forgetToMakeDeposit?: boolean } = {},
) {
  const {
    transactionHandler,
    connection,
    accounts: initVaultAccounts,
  } = await initVault(t, { allowFurtherShareCreation: true });
  const { vaultAuthorityPair } = initVaultAccounts;

  const safetyDeposit = await addSafetyDeposit(
    t,
    transactionHandler,
    connection,
    vaultAuthorityPair,
    initVaultAccounts,
    tokenAmount,
    opts,
  );

  await activateAndCombineVault(
    t,
    transactionHandler,
    connection,
    vaultAuthorityPair,
    initVaultAccounts,
  );
  return {
    transactionHandler,
    connection,
    safetyDeposit,
    initVaultAccounts,
  };
}

async function combinedVaultWithTwoDeposits(
  t: test.Test,
  firstTokenAmount: number,
  secondTokenAmount: number,
) {
  const {
    transactionHandler,
    connection,
    accounts: initVaultAccounts,
  } = await initVault(t, { allowFurtherShareCreation: true });
  const { vaultAuthorityPair } = initVaultAccounts;

  const firstSafetyDeposit = await addSafetyDeposit(
    t,
    transactionHandler,
    connection,
    vaultAuthorityPair,
    initVaultAccounts,
    firstTokenAmount,
  );

  const secondSafetyDeposit = await addSafetyDeposit(
    t,
    transactionHandler,
    connection,
    vaultAuthorityPair,
    initVaultAccounts,
    secondTokenAmount,
  );

  await activateAndCombineVault(
    t,
    transactionHandler,
    connection,
    vaultAuthorityPair,
    initVaultAccounts,
  );
  return {
    transactionHandler,
    connection,
    firstSafetyDeposit,
    secondSafetyDeposit,
    initVaultAccounts,
  };
}
