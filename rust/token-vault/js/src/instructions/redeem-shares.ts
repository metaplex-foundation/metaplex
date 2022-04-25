import { createRedeemSharesInstruction, RedeemSharesInstructionAccounts } from '../generated';

/**
 * Redeems the shares from the treasury.
 *
 * ### Conditions for {@link RedeemSharesInstructionAccounts} accounts to add shares
 *
 * _Aside from the conditions outlined in detail in {@link InitVault.initVault}_ the following should hold:
 *
 * #### vault
 *
 * - state: {@link VaultState.Combined}
 *
 * NOTE: currently it seems impossible to add shares and thus redeeming is as well
 *   see:
 *    ./add-shares-to-treasury.ts
 *    ./test/add-shares-to-treasury.ts
 */
export function redeemShares(accounts: RedeemSharesInstructionAccounts) {
  return createRedeemSharesInstruction(accounts);
}
