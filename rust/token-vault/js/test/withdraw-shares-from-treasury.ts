import test from 'tape';

import {
  Account,
  addressLabels,
  getAccount,
  initAndActivateVault,
  initVault,
  killStuckProcess,
  logDebug,
  spokSameBignum,
  spokSamePubkey,
  verifyTokenBalance,
} from './utils';
import { Signer, Transaction } from '@solana/web3.js';
import { assertConfirmedTransaction, assertError, TokenBalances } from '@metaplex-foundation/amman';
import { mintSharesToTreasury } from '../src/instructions/mint-shares-to-treasury';
import {
  MintFractionalSharesInstructionAccounts,
  NotEnoughSharesError,
  VaultShouldBeActiveError,
} from '../src/mpl-token-vault';
import spok, { Specifications } from 'spok';
import { bignum } from '@metaplex-foundation/beet';
import BN from 'bn.js';
import {
  setupWithdrawSharesDestinationAccount,
  withdrawSharesFromTreasury,
  WithdrawSharesFromTreasuryAccounts,
} from '../src/instructions/withdraw-shares-from-treasury';
import { cusper } from '../src/errors';

killStuckProcess();

test('withdraw shares: active vault which minted sufficient shares, withdraw various sizes 0 - 5,000,000,000', async (t) => {
  // -----------------
  // Init and Activate Vault
  // -----------------
  const {
    transactionHandler,
    connection,
    accounts: initVaultAccounts,
  } = await initAndActivateVault(t, { allowFurtherShareCreation: true });
  const {
    payer,
    vault,
    authority: vaultAuthority,
    vaultAuthorityPair,
    fractionMint,
    fractionTreasury,
    fractionMintAuthority,
  } = initVaultAccounts;

  addressLabels.addLabels(initVaultAccounts);

  // -----------------
  // Mint Shares
  // -----------------
  const MINTED_SHARES = new BN('6000000000');
  {
    const accounts: MintFractionalSharesInstructionAccounts = {
      fractionTreasury,
      fractionMint,
      vault,
      vaultAuthority,
      mintAuthority: fractionMintAuthority,
    };
    const signers: Signer[] = [vaultAuthorityPair];
    const mintSharesIx = mintSharesToTreasury(accounts, MINTED_SHARES);

    const tx = new Transaction().add(mintSharesIx);
    const res = await transactionHandler.sendAndConfirmTransaction(tx, signers);
    assertConfirmedTransaction(t, res.txConfirmed);
  }

  // -----------------
  // Create Destination Account
  // -----------------
  const [createDestinationIxs, createDestinationSigners, { destination }] =
    await setupWithdrawSharesDestinationAccount(connection, { payer, fractionMint });
  {
    const tx = new Transaction().add(...createDestinationIxs);
    const res = await transactionHandler.sendAndConfirmTransaction(tx, createDestinationSigners);
    assertConfirmedTransaction(t, res.txConfirmed);
  }

  // -----------------
  // Withdraw Shares
  // -----------------
  const accounts: WithdrawSharesFromTreasuryAccounts = {
    fractionTreasury,
    destination,
    vault,
    vaultAuthority,
  };
  const signers: Signer[] = [vaultAuthorityPair];
  async function runAndVerify(numberOfShares: bignum, previousDelta: bignum) {
    t.comment(`++++++Withdrawing ${numberOfShares} shares`);
    const withdrawSharesIx = await withdrawSharesFromTreasury(accounts, numberOfShares);

    const tx = new Transaction().add(withdrawSharesIx);
    const res = await transactionHandler.sendAndConfirmTransaction(tx, signers);
    assertConfirmedTransaction(t, res.txConfirmed);

    const expectedDestinationTotal = new BN(previousDelta).add(new BN(numberOfShares));
    const expectedTreasuryPreviousTotal = new BN(MINTED_SHARES).sub(new BN(previousDelta));
    const expectedTreasuryTotal = new BN(MINTED_SHARES).sub(expectedDestinationTotal);

    const tokens = await TokenBalances.forTransaction(
      connection,
      res.txSignature,
      addressLabels,
    ).dump(logDebug);

    // -----------------
    // Destination Changes
    // -----------------
    await verifyTokenBalance(
      t,
      tokens,
      destination,
      fractionMint,
      previousDelta,
      expectedDestinationTotal,
    );
    const destinationAccount = await getAccount(connection, destination);
    spok(t, destinationAccount, <Specifications<Partial<Account>>>{
      $topic: 'destinationAccount',
      address: spokSamePubkey(destination),
      mint: spokSamePubkey(fractionMint),
      owner: spokSamePubkey(payer),
      amount: spokSameBignum(expectedDestinationTotal),
    });

    // -----------------
    // Fraction Treasury Changes
    // -----------------
    await verifyTokenBalance(
      t,
      tokens,
      fractionTreasury,
      fractionMint,
      expectedTreasuryPreviousTotal,
      expectedTreasuryTotal,
    );
    const fractionTreasuryAccount = await getAccount(connection, fractionTreasury);
    spok(t, fractionTreasuryAccount, <Specifications<Partial<Account>>>{
      $topic: 'fractionTreasuryAccount',
      address: spokSamePubkey(fractionTreasury),
      mint: spokSamePubkey(fractionMint),
      owner: spokSamePubkey(fractionMintAuthority),
      amount: spokSameBignum(expectedTreasuryTotal),
    });
  }

  await runAndVerify(0, 0);
  await runAndVerify(5, 0);
  await runAndVerify(new BN('5000000000' /* 5,000,000,000 */), 5);
});

// -----------------
// Failure cases
// -----------------
// TODO(thlorenz): Once we can combined a vault add a failure case for that as well
test('withdraw shares: inactive vault, fails', async (t) => {
  // -----------------
  // Init Vault
  // -----------------
  const {
    connection,
    transactionHandler,
    accounts: initVaultAccounts,
  } = await initVault(t, {
    allowFurtherShareCreation: true,
  });
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
  // Create Destination Account
  // -----------------
  const [createDestinationIxs, createDestinationSigners, { destination }] =
    await setupWithdrawSharesDestinationAccount(connection, { payer, fractionMint });
  {
    const tx = new Transaction().add(...createDestinationIxs);
    const res = await transactionHandler.sendAndConfirmTransaction(tx, createDestinationSigners);
    assertConfirmedTransaction(t, res.txConfirmed);
  }

  // -----------------
  // Withdraw Shares
  // -----------------
  const accounts: WithdrawSharesFromTreasuryAccounts = {
    fractionTreasury,
    destination,
    vault,
    vaultAuthority,
  };
  const signers: Signer[] = [vaultAuthorityPair];

  // Withdrawing 0 since we aren't able to mint either, in either case this fails
  // before it even gets to the minted amount checks
  const withdrawSharesIx = await withdrawSharesFromTreasury(accounts, 0);

  const tx = new Transaction().add(withdrawSharesIx);
  try {
    await transactionHandler.sendAndConfirmTransaction(tx, signers);
  } catch (err) {
    assertError(t, err, [/Withdraw fractional shares/i, /vault should be active/i]);
    const cusperError = cusper.errorFromProgramLogs(err.logs);
    t.ok(cusperError instanceof VaultShouldBeActiveError, 'is VaultShouldBeActiveError');
  }
});

test('withdraw shares: active vault which minted 99 shares, withdraw 100', async (t) => {
  // -----------------
  // Init and Activate Vault
  // -----------------
  const {
    transactionHandler,
    connection,
    accounts: initVaultAccounts,
  } = await initAndActivateVault(t, { allowFurtherShareCreation: true });
  const {
    payer,
    vault,
    authority: vaultAuthority,
    vaultAuthorityPair,
    fractionMint,
    fractionTreasury,
    fractionMintAuthority,
  } = initVaultAccounts;

  addressLabels.addLabels(initVaultAccounts);

  // -----------------
  // Mint Shares
  // -----------------
  const MINTED_SHARES = 99;
  {
    const accounts: MintFractionalSharesInstructionAccounts = {
      fractionTreasury,
      fractionMint,
      vault,
      vaultAuthority,
      mintAuthority: fractionMintAuthority,
    };
    const signers: Signer[] = [vaultAuthorityPair];
    const mintSharesIx = mintSharesToTreasury(accounts, MINTED_SHARES);

    const tx = new Transaction().add(mintSharesIx);
    const res = await transactionHandler.sendAndConfirmTransaction(tx, signers);
    assertConfirmedTransaction(t, res.txConfirmed);
  }

  // -----------------
  // Create Destination Account
  // -----------------
  const [createDestinationIxs, createDestinationSigners, { destination }] =
    await setupWithdrawSharesDestinationAccount(connection, { payer, fractionMint });
  {
    const tx = new Transaction().add(...createDestinationIxs);
    const res = await transactionHandler.sendAndConfirmTransaction(tx, createDestinationSigners);
    assertConfirmedTransaction(t, res.txConfirmed);
  }

  // -----------------
  // Withdraw Shares
  // -----------------
  const accounts: WithdrawSharesFromTreasuryAccounts = {
    fractionTreasury,
    destination,
    vault,
    vaultAuthority,
  };
  const signers: Signer[] = [vaultAuthorityPair];
  const withdrawSharesIx = await withdrawSharesFromTreasury(accounts, MINTED_SHARES + 1);

  const tx = new Transaction().add(withdrawSharesIx);
  try {
    await transactionHandler.sendAndConfirmTransaction(tx, signers);
  } catch (err) {
    assertError(t, err, [/Withdraw fractional shares/i, /not enough shares/i]);
    const cusperError = cusper.errorFromProgramLogs(err.logs);
    t.ok(cusperError instanceof NotEnoughSharesError, 'is NotEnoughSharesError');
  }
});
