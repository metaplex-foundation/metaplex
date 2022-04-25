import { bignum } from '@metaplex-foundation/beet';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { setupDestinationTokenAccount } from '../common';
import { pdaForVault } from '../common/helpers';
import {
  createWithdrawSharesFromTreasuryInstruction,
  WithdrawSharesFromTreasuryInstructionAccounts,
  WithdrawSharesFromTreasuryInstructionArgs,
} from '../generated';
import { InstructionsWithAccounts } from '../types';

/**
 * Sets up a token account and required instructions that can be used as the
 * {@link WithdrawSharesFromTreasuryInstructionAccounts.destination}.
 */
export async function setupWithdrawSharesDestinationAccount(
  connection: Connection,
  args: {
    payer: PublicKey;
    fractionMint: PublicKey;
  },
): Promise<InstructionsWithAccounts<{ destination: PublicKey; destinationPair: Keypair }>> {
  return setupDestinationTokenAccount(connection, {
    payer: args.payer,
    mint: args.fractionMint,
  });
}

export type WithdrawSharesFromTreasuryAccounts = Omit<
  WithdrawSharesFromTreasuryInstructionAccounts,
  'transferAuthority'
>;
/**
 * Withdraw shares from the {@link WithdrawSharesFromTreasuryInstructionAccounts.fractionTreasury}.
 *
 * ### Conditions for {@link WithdrawSharesFromTreasuryInstructionAccounts} accounts
 *
 * _Aside from the conditions outlined in detail in {@link InitVault.initVault}_ the following should hold:
 *
 * #### vault
 *
 * - state: {@link VaultState.Active}
 * - allowFurtherShareCreation: true
 *
 * #### fractionTreasury
 *
 * - address: vault.fractionTreasury
 * - amount: >= {@link numberOfShares}
 *
 * #### destination
 *
 * - mint: vault.fractionMint
 *
 * _set this up via {@link setupWithdrawSharesDestinationAccount}_
 *
 * #### fractionMint
 *
 * - adddress: vault.fractionMint
 *
 * ### Updates as a result of completing the Transaction
 *
 * #### fractionTreasury
 *
 * - amount: increased by {@link numberOfShares}
 *
 * @param accounts needed to withdraw shares
 *
 * NOTE: that the {@link WithdrawSharesFromTreasuryInstructionAccounts.transferAuthority} account is
 * derived from the {@link WithdrawSharesFromTreasuryInstructionAccounts.vault} and does
 * not need to be provided
 */
export async function withdrawSharesFromTreasury(
  accounts: Omit<WithdrawSharesFromTreasuryInstructionAccounts, 'transferAuthority'>,
  numberOfShares: bignum,
) {
  const args: WithdrawSharesFromTreasuryInstructionArgs = { numberOfShareArgs: { numberOfShares } };
  const transferAuthority = await pdaForVault(accounts.vault);

  return createWithdrawSharesFromTreasuryInstruction({ ...accounts, transferAuthority }, args);
}
