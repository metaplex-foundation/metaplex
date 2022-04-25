import { Test } from 'tape';
import { Connection } from '@solana/web3.js';
import spok from 'spok';
import { InitVaultInstructionAccounts, Key, Vault, VaultState } from '../../src/generated';
import { spokSameBignum, spokSamePubkey } from './asserts';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

export async function assertInactiveVault(
  t: Test,
  connection: Connection,
  initVaultAccounts: InitVaultInstructionAccounts,
  args: { allowFurtherShareCreation?: boolean; tokenTypeCount?: number } = {},
) {
  return assertVault(t, connection, initVaultAccounts, { ...args, state: VaultState.Inactive });
}

export async function assertActiveVault(
  t: Test,
  connection: Connection,
  initVaultAccounts: InitVaultInstructionAccounts,
  args: { allowFurtherShareCreation?: boolean; tokenTypeCount?: number } = {},
) {
  return assertVault(t, connection, initVaultAccounts, { ...args, state: VaultState.Active });
}

export async function assertCombinedVault(
  t: Test,
  connection: Connection,
  initVaultAccounts: InitVaultInstructionAccounts,
  args: { allowFurtherShareCreation?: boolean; tokenTypeCount?: number } = {},
) {
  return assertVault(t, connection, initVaultAccounts, { ...args, state: VaultState.Combined });
}

export async function assertDeactivatedVault(
  t: Test,
  connection: Connection,
  initVaultAccounts: InitVaultInstructionAccounts,
  args: { allowFurtherShareCreation?: boolean; tokenTypeCount?: number } = {},
) {
  return assertVault(t, connection, initVaultAccounts, { ...args, state: VaultState.Deactivated });
}

async function assertVault(
  t: Test,
  connection: Connection,
  initVaultAccounts: InitVaultInstructionAccounts,
  args: { allowFurtherShareCreation?: boolean; tokenTypeCount?: number; state: VaultState } = {
    state: VaultState.Inactive,
  },
) {
  const { allowFurtherShareCreation = false, tokenTypeCount = 0, state } = args;
  const {
    vault,
    authority: vaultAuthority,
    fractionMint,
    fractionTreasury,
    redeemTreasury,
    pricingLookupAddress,
  } = initVaultAccounts;

  const vaultAccount = await Vault.fromAccountAddress(connection, vault);

  spok(t, vaultAccount, {
    $topic: 'vaultAccount',
    key: Key.VaultV1,
    tokenProgram: spokSamePubkey(TOKEN_PROGRAM_ID),
    fractionMint: spokSamePubkey(fractionMint),
    redeemTreasury: spokSamePubkey(redeemTreasury),
    fractionTreasury: spokSamePubkey(fractionTreasury),
    pricingLookupAddress: spokSamePubkey(pricingLookupAddress),
    authority: spokSamePubkey(vaultAuthority),
    allowFurtherShareCreation,
    tokenTypeCount,
    state,
    lockedPricePerShare: spokSameBignum(0),
  });
}
