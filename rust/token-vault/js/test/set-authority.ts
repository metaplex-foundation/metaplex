import test from 'tape';

import {
  addressLabels,
  assertActiveVault,
  assertInactiveVault,
  initAndActivateVault,
  initVault,
  killStuckProcess,
} from './utils';
import { Transaction } from '@solana/web3.js';
import {
  airdrop,
  assertConfirmedTransaction,
  assertError,
  assertTransactionSummary,
} from '@metaplex-foundation/amman';
import {
  createSetAuthorityInstruction,
  SetAuthorityInstructionAccounts,
} from '../src/mpl-token-vault';

killStuckProcess();

test('set authority: inactive vault', async (t) => {
  const {
    transactionHandler,
    connection,
    accounts: initVaultAccounts,
  } = await initVault(t, { allowFurtherShareCreation: true });
  const { vault, authority: vaultAuthority, vaultAuthorityPair } = initVaultAccounts;

  addressLabels.addLabels(initVaultAccounts);

  const [newAuthority] = addressLabels.genKeypair('newAuthority');

  const accounts: SetAuthorityInstructionAccounts = {
    vault,
    currentAuthority: vaultAuthority,
    newAuthority,
  };
  const setAuthorityIx = createSetAuthorityInstruction(accounts);
  const tx = new Transaction().add(setAuthorityIx);

  {
    t.comment('+++ With unfunded new authority');
    try {
      await transactionHandler.sendAndConfirmTransaction(tx, [vaultAuthorityPair]);
    } catch (err) {
      assertError(t, err, [
        /Set Authority/i,
        /Invalid program authority/i,
        // TODO(thlorenz): this message in the program should be improved as it doesn't indicate funding issue
        /disallowing new authority .+ does not exist/i,
      ]);
    }
    await assertInactiveVault(t, connection, initVaultAccounts, {
      allowFurtherShareCreation: true,
    });
  }
  {
    t.comment('+++ With funded new authority');
    await airdrop(connection, newAuthority, 1);
    const res = await transactionHandler.sendAndConfirmTransaction(tx, [vaultAuthorityPair]);
    assertConfirmedTransaction(t, res.txConfirmed);
    assertTransactionSummary(t, res.txSummary, {
      msgRx: [/Set Authority/i, /success/i],
    });

    await assertInactiveVault(
      t,
      connection,
      { ...initVaultAccounts, authority: newAuthority },
      { allowFurtherShareCreation: true },
    );
  }
});

test('set authority: on active vault', async (t) => {
  const {
    transactionHandler,
    connection,
    accounts: initVaultAccounts,
  } = await initAndActivateVault(t, { allowFurtherShareCreation: true });
  const { vault, authority: vaultAuthority, vaultAuthorityPair } = initVaultAccounts;

  addressLabels.addLabels(initVaultAccounts);

  const [newAuthority] = addressLabels.genKeypair('newAuthority');
  await airdrop(connection, newAuthority, 1);

  const accounts: SetAuthorityInstructionAccounts = {
    vault,
    currentAuthority: vaultAuthority,
    newAuthority,
  };
  const setAuthorityIx = createSetAuthorityInstruction(accounts);
  const tx = new Transaction().add(setAuthorityIx);

  const res = await transactionHandler.sendAndConfirmTransaction(tx, [vaultAuthorityPair]);
  assertConfirmedTransaction(t, res.txConfirmed);
  assertTransactionSummary(t, res.txSummary, {
    msgRx: [/Set Authority/i, /success/i],
  });

  await assertActiveVault(
    t,
    connection,
    {
      ...initVaultAccounts,
      authority: newAuthority,
    },
    {
      allowFurtherShareCreation: true,
    },
  );
});
