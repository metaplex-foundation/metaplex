import { bignum } from '@metaplex-foundation/beet';
import {
  AddSharesToTreasuryInstructionAccounts,
  createAddSharesToTreasuryInstruction,
} from '../generated';

/**
 * Adds the specified amount of shares to the treasury.
 *
 * ### Conditions for {@link AddSharesToTreasuryInstructionAccounts} accounts to add shares
 *
 * _Aside from the conditions outlined in detail in {@link InitVault.initVault}_ the following should hold:
 *
 * #### vault
 *
 * - state: {@link VaultState.Active}
 *
 * ### source
 *
 * - account: initialized
 * - mint: vault.fractionMint
 * - amount: >= numberOfShares
 *
 * NOTE: currently it seems impossible to setup the source account
 *       see ./test/add-shares-to-treasury.ts
 */
export function addSharesToTreasury(
  accounts: AddSharesToTreasuryInstructionAccounts,
  numberOfShares: bignum,
) {
  return createAddSharesToTreasuryInstruction(accounts, { numberOfShareArgs: { numberOfShares } });
}
