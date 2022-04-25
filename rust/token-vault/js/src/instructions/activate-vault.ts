import { bignum } from '@metaplex-foundation/beet';
import { PublicKey } from '@solana/web3.js';
import { pdaForVault } from '../common/helpers';
import { ActivateVaultInstructionAccounts, createActivateVaultInstruction } from '../generated';
import type { Optional } from 'utility-types';

/**
 * Same as {@link ActivateVaultInstructionAccounts} except doesn't require
 * fractionalMintAuthority as that will be derived before passing them to
 * {@link createActivateVaultInstruction}.
 *
 * @property [writable] vault Initialized inactivated fractionalized token vault
 * @property [writable] fractionMint Fraction mint
 * @property [writable] fractionTreasury Fraction treasury
 * @property [] fractionalMintAuthority Fraction mint authority for the program
 *           seed of [PREFIX, program_id] (optional)
 * @property [signer] vaultAuthority Authority on the vault
 *
 * @category ActivateVault
 * @category Accounts
 */
export type ActivateVaultAccounts = Optional<
  ActivateVaultInstructionAccounts,
  'fractionMintAuthority'
>;

/**
 * Activates the vault and as part of that mints {@link numberOfShares} to the
 * {@link ActivateVaultInstructionAccounts.fractionTreasury}.
 *
 * Unless provided the {@link ActivateVaultInstructionAccounts.fractionMintAuthority}
 * is derived from the `vault` key
 *
 * ### Conditions for {@link ActivateVaultInstructionAccounts} accounts to add token to vault
 *
 * _Aside from the conditions outlined in detail in {@link InitVault.initVault}_ the following should hold:
 *
 * #### vault
 *
 * - state: {@link VaultState.Inactive}
 *
 * ### fractionalMintAuthority
 *
 * - address: vault PDA (`[PREFIX, PROGRAM_ID, vault_address]`)
 *
 * ### Updates as Result of successfull Transaction
 *
 * #### vault
 *
 * - state: {@link VaultState.Active}
 *
 * ### fractionTreasury
 *
 * - credit {@link numberOfShares} (minted from fractionMint)
 *
 * #### fractionMint
 *
 * - mints {@link numberOfShares} to fractionTreasury
 *
 * @category ActivateVault
 * @category Instructions
 */
export async function activateVault(
  vault: PublicKey,
  accounts: ActivateVaultAccounts,
  numberOfShares: bignum,
) {
  const fractionMintAuthority = accounts.fractionMintAuthority ?? (await pdaForVault(vault));
  return createActivateVaultInstruction(
    { ...accounts, fractionMintAuthority },
    { numberOfShareArgs: { numberOfShares } },
  );
}
