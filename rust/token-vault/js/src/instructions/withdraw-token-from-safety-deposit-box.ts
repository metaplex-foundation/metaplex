import { pdaForVault } from '../common/helpers';
import {
  createWithdrawTokenFromSafetyDepositBoxInstruction,
  WithdrawTokenFromSafetyDepositBoxInstructionAccounts,
} from '../generated';
import { bignum } from '@metaplex-foundation/beet';
import { setupDestinationTokenAccount } from '../common';

/**
 * Sets up a token account and required instructions that can be used as the
 * {@link WithdrawSharesFromTreasuryInstructionAccounts.destination}.
 */
export const setupWithdrawFromSafetyDestinationAccount = setupDestinationTokenAccount;

export type WithdrawTokenFromSafetyDepositBoxAccounts = Omit<
  WithdrawTokenFromSafetyDepositBoxInstructionAccounts,
  'transferAuthority'
>;

/**
 * // TODO(thlorenz): Update this fully
 * Withdraw shares from the {@link WithdrawTokenFromSafetyDepositBox.store}.
 *
 * ### Conditions for {@link WithdrawTokenFromSafetyDepositBoxInstructionAccounts} accounts
 *
 * _Aside from the conditions outlined in detail in {@link InitVault.initVault}_ the following should hold:
 *
 * #### vault
 *
 * - state: {@link VaultState.Combined}
 *
 * #### safetyDeposit
 *
 * - vault: vault address
 * - store: store address
 *
 * #### fractionMint
 *
 * - adddress: vault.fractionMint
 *
 * #### store
 *
 * - amount: > 0 and >= amount
 *
 * #### destination
 *
 * - mint: safetyDeposit.tokenMint
 *
 *
 * _set this up via {@link setupWithdrawFromSafetyDestinationAccount}_
 *
 * ### Updates as a result of completing the Transaction
 *
 * #### destination
 *
 * - credit {@link amount}
 *
 * #### store
 *
 * - debit {@link amount}
 *
 * #### vault
 *
 * - tokenTypeCount: decremented if safety deposit emptied out
 * - state: if tokenTypeCount == 0 and fractionMint.supply == 0 -> {@link VaultState.Deactivated}
 *
 * @param accounts needed to withdraw
 * @param amount to withdraw
 *
 * NOTE: that the {@link WithdrawTokenFromSafetyDepositBoxInstructionAccounts.transferAuthority} account is
 * derived from the {@link WithdrawTokenFromSafetyDepositBoxInstructionAccounts.vault} and does
 * not need to be provided
 */
export async function withdrawTokenFromSafetyDepositBox(
  accounts: WithdrawTokenFromSafetyDepositBoxAccounts,
  amount: bignum,
) {
  const transferAuthority = await pdaForVault(accounts.vault);
  return createWithdrawTokenFromSafetyDepositBoxInstruction(
    { ...accounts, transferAuthority },
    { amountArgs: { amount } },
  );
}
