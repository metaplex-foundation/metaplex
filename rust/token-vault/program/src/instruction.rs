use crate::state::{ExternalPriceAccount, Key};
use borsh::{BorshDeserialize, BorshSerialize};
use shank::ShankInstruction;
use solana_program::{
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    sysvar,
};

#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub struct InitVaultArgs {
    pub allow_further_share_creation: bool,
}

#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub struct AmountArgs {
    pub amount: u64,
}

#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub struct NumberOfShareArgs {
    pub number_of_shares: u64,
}

#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct MintEditionProxyArgs {
    pub edition: u64,
}

/// Instructions supported by the Fraction program.
#[derive(BorshSerialize, BorshDeserialize, Clone, ShankInstruction)]
#[rustfmt::skip]
pub enum VaultInstruction {
    /// Initialize a token vault, starts inactivate. Add tokens in subsequent instructions, then activate.
    #[account(0, writable, name="fraction_mint",
              desc="Initialized fractional share mint with 0 tokens in supply, authority on mint must be pda of program with seed [prefix, programid]")]
    #[account(1, writable, name="redeem_treasury",
            desc = "Initialized redeem treasury token account with 0 tokens in supply, owner of account must be pda of program like above")]
    #[account(2, writable, name="fraction_treasury",
            desc = "Initialized fraction treasury token account with 0 tokens in supply, owner of account must be pda of program like above")]
    #[account(3, writable, name="vault",
            desc = "Uninitialized vault account")]
    #[account(4, name="authority",
            desc = "Authority on the vault")]
    #[account(5, name="pricing_lookup_address",
            desc = "Pricing Lookup Address")]
    #[account(6, name="token_program",
            desc = "Token program")]
    #[account(7, name="rent",
            desc = "Rent sysvar")]
    InitVault(InitVaultArgs),

    /// Add a token to a inactive token vault
    #[account(0, writable, name="safety_deposit_account",
            desc = "Uninitialized safety deposit box account address (will be created and allocated by this endpoint) Address should be pda with seed of [PREFIX, vault_address, token_mint_address]")]
    #[account(1, writable, name="token_account",
            desc = "Initialized Token account")]
    #[account(2, writable, name="store",
            desc = "Initialized Token store account with authority of this program, this will get set on the safety deposit box")]
    #[account(3, writable, name="vault", desc = "Initialized inactive fractionalized token vault")]
    #[account(4, signer, name="vault_authority", desc = "Authority on the vault")]
    #[account(5, signer, name="payer", desc = "Payer")]
    #[account(6, signer, name="transfer_authority",
            desc = "Transfer Authority to move desired token amount from token account to safety deposit")]
    #[account(7, name="token_program", desc = "Token program")]
    #[account(8, name="rent", desc = "Rent sysvar")]
    #[account(9, name="system_account", desc = "System account sysvar")]
    AddTokenToInactiveVault(AmountArgs),

    /// Activates the vault, distributing initial shares into the fraction treasury.
    /// Tokens can no longer be removed in this state until Combination.
    #[account(0, writable, name="vault", desc = "Initialized inactivated fractionalized token vault")]
    #[account(1, writable, name="fraction_mint", desc = "Fraction mint")]
    #[account(2, writable, name="fraction_treasury", desc = "Fraction treasury")]
    #[account(3, name="fraction_mint_authority", desc = "Fraction mint authority for the program - seed of [PREFIX, program_id]")]
    #[account(4, signer, name="vault_authority", desc = "Authority on the vault")]
    #[account(5, name="token_program", desc = "Token program")]
    ActivateVault(NumberOfShareArgs),

    /// This act checks the external pricing oracle for permission to combine and the price of the circulating market cap to do so.
    /// If you can afford it, this amount is charged and placed into the redeem treasury for shareholders to redeem at a later time.
    /// The treasury then unlocks into Combine state and you can remove the tokens.
    #[account(0, writable, name="vault", desc = "Initialized activated token vault")]
    #[account(1, writable, name="your_outstanding_shares",
            desc = "Token account containing your portion of the outstanding fraction shares")]
    #[account(2, writable, name="your_payment",
            desc = "Token account of the redeem_treasury mint type that you will pay with")]
    #[account(3, writable, name="fraction_mint", desc = "Fraction mint")]
    #[account(4, writable, name="fraction_treasury", desc = "Fraction treasury account")]
    #[account(5, writable, name="redeem_treasury", desc = "Redeem treasury account")]
    #[account(6, name="new_vault_authority", desc = "New authority on the vault going forward - can be same authority if you want")]
    #[account(7, signer, name="vault_authority", desc = "Authority on the vault")]
    #[account(8, signer, name="transfer_authority",
            desc = "Transfer authority for the token account and outstanding fractional shares account you're transferring from")]
    #[account(9, name="fraction_burn_authority",
            desc = "PDA-based Burn authority for the fraction treasury account containing the uncirculated shares seed [PREFIX, program_id]")]
    #[account(10, name="external_pricing",
            desc = "External pricing lookup address")]
    #[account(11, name="token_program", desc = "Token program")]
    CombineVault,

    /// If in the combine state, shareholders can hit this endpoint to burn shares in exchange for monies from the treasury.
    /// Once fractional supply is zero and all tokens have been removed this action will take vault to Deactivated
    #[account(0, writable, name="outstanding_shares",
            desc = "Initialized Token account containing your fractional shares")]
    #[account(1, writable, name="destination",
            desc = "Initialized Destination token account where you wish your proceeds to arrive")]
    #[account(2, writable, name="fraction_mint", desc = "Fraction mint")]
    #[account(3, writable, name="redeem_treasury", desc = "Redeem treasury account")]
    #[account(4, name="transfer_authority", desc = "PDA-based Transfer authority for the transfer of proceeds from redeem treasury to destination seed [PREFIX, program_id]")]
    #[account(5, signer, name="burn_authority", desc = "Burn authority for the burning of your shares")]
    #[account(6, name="vault", desc = "Combined token vault")]
    #[account(7, name="token_program", desc = "Token program")]
    #[account(8, name="rent", desc = "Rent sysvar")]
    RedeemShares,

    /// If in combine state, authority on vault can hit this to withdrawal some of a token type from a safety deposit box.
    /// Once fractional supply is zero and all tokens have been removed this action will take vault to Deactivated
    #[account(0, writable, name="destination",
            desc = "Initialized Destination account for the tokens being withdrawn")]
    #[account(1, writable, name="safety_deposit",
            desc = "The safety deposit box account key for the tokens")]
    #[account(2, writable, name="store",
            desc = "The store key on the safety deposit box account")]
    #[account(3, writable, name="vault",
            desc = "The initialized combined token vault")]
    #[account(4, name="fraction_mint",
            desc = "Fraction mint")]
    #[account(5, signer, name="vault_authority",
            desc = "Authority of vault")]
    #[account(6, name="transfer_authority",
            desc = "PDA-based Transfer authority to move the tokens from the store to the destination seed [PREFIX, program_id]")]
    #[account(7, name="token_program", desc = "Token program")]
    #[account(8, name="rent", desc = "Rent sysvar")]
    WithdrawTokenFromSafetyDepositBox(AmountArgs),

    /// Self explanatory - mint more fractional shares if the vault is configured to allow such.
    #[account(0, writable, name="fraction_treasury",
            desc = "Fraction treasury")]
    #[account(1, writable, name="fraction_mint",
            desc = "Fraction mint")]
    #[account(2, name="vault",
            desc = "The initialized active token vault")]
    #[account(3, name="mint_authority",
            desc = "PDA-based Mint authority to mint tokens to treasury[PREFIX, program_id]")]
    #[account(4, signer, name="vault_authority",
            desc = "Authority of vault")]
    #[account(5, name="token_program", desc = "Token program")]
    MintFractionalShares(NumberOfShareArgs),

    /// Withdraws shares from the treasury to a desired account.
    #[account(0, writable, name="destination",
            desc = "Initialized Destination account for the shares being withdrawn")]
    #[account(1, writable, name="fraction_treasury", desc = "Fraction treasury")]
    #[account(2, name="vault", desc = "The initialized active token vault")]
    #[account(3, name="transfer_authority",
            desc = "PDA-based Transfer authority to move tokens from treasury to your destination[PREFIX, program_id]")]
    #[account(4, signer, name="vault_authority", desc = "Authority of vault")]
    #[account(5, name="token_program", desc = "Token program")]
    #[account(6, name="rent", desc = "Rent sysvar")]
    WithdrawSharesFromTreasury(NumberOfShareArgs),

    /// Returns shares to the vault if you wish to remove them from circulation.
    #[account(0, writable, name="source",
            desc = "Initialized account from which shares will be withdrawn")]
    #[account(1, writable, name="fraction_treasury",
            desc = "Fraction treasury")]
    #[account(2, name="vault",
            desc = "The initialized active token vault")]
    #[account(3, signer, name="transfer_authority",
            desc = "Transfer authority to move tokens from your account to treasury")]
    #[account(4, signer, name="vault_authority",
            desc = "Authority of vault")]
    #[account(5, name="token_program", desc = "Token program")]
    AddSharesToTreasury(NumberOfShareArgs),

    /// Helpful method that isn't necessary to use for main users of the app, but allows one to create/update
    /// existing external price account fields if they are signers of this account.
    /// Useful for testing purposes, and the CLI makes use of it as well so that you can verify logic.
    #[account(0, writable, name="external_price_account", desc = "External price account")]
    UpdateExternalPriceAccount(ExternalPriceAccount),

    /// Sets the authority of the vault to a new authority.
    ///
    #[account(0, writable, name="vault", desc = "Vault")]
    #[account(1, signer, name="current_authority", desc = "Vault authority")]
    #[account(2, name="new_authority", desc = "New authority")]
    SetAuthority,
}

/// Creates an InitVault instruction
#[allow(clippy::too_many_arguments)]
pub fn create_init_vault_instruction(
    program_id: Pubkey,
    fraction_mint: Pubkey,
    redeem_treasury: Pubkey,
    fraction_treasury: Pubkey,
    vault: Pubkey,
    vault_authority: Pubkey,
    external_price_account: Pubkey,
    allow_further_share_creation: bool,
) -> Instruction {
    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(fraction_mint, false),
            AccountMeta::new(redeem_treasury, false),
            AccountMeta::new(fraction_treasury, false),
            AccountMeta::new(vault, false),
            AccountMeta::new_readonly(vault_authority, false),
            AccountMeta::new_readonly(external_price_account, false),
            AccountMeta::new_readonly(spl_token::id(), false),
            AccountMeta::new_readonly(sysvar::rent::id(), false),
        ],
        data: VaultInstruction::InitVault(InitVaultArgs {
            allow_further_share_creation,
        })
        .try_to_vec()
        .unwrap(),
    }
}

/// Creates an UpdateExternalPriceAccount instruction
#[allow(clippy::too_many_arguments)]
pub fn create_update_external_price_account_instruction(
    program_id: Pubkey,
    external_price_account: Pubkey,
    price_per_share: u64,
    price_mint: Pubkey,
    allowed_to_combine: bool,
) -> Instruction {
    Instruction {
        program_id,
        accounts: vec![AccountMeta::new(external_price_account, true)],
        data: VaultInstruction::UpdateExternalPriceAccount(ExternalPriceAccount {
            key: Key::ExternalAccountKeyV1,
            price_per_share,
            price_mint,
            allowed_to_combine,
        })
        .try_to_vec()
        .unwrap(),
    }
}

/// Creates an AddTokenToInactiveVault instruction
#[allow(clippy::too_many_arguments)]
pub fn create_add_token_to_inactive_vault_instruction(
    program_id: Pubkey,
    safety_deposit_box: Pubkey,
    token_account: Pubkey,
    store: Pubkey,
    vault: Pubkey,
    vault_authority: Pubkey,
    payer: Pubkey,
    transfer_authority: Pubkey,
    amount: u64,
) -> Instruction {
    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(safety_deposit_box, false),
            AccountMeta::new(token_account, false),
            AccountMeta::new(store, false),
            AccountMeta::new(vault, false),
            AccountMeta::new(vault_authority, true),
            AccountMeta::new(payer, true),
            AccountMeta::new_readonly(transfer_authority, true),
            AccountMeta::new_readonly(spl_token::id(), false),
            AccountMeta::new_readonly(sysvar::rent::id(), false),
            AccountMeta::new_readonly(solana_program::system_program::id(), false),
        ],
        data: VaultInstruction::AddTokenToInactiveVault(AmountArgs { amount })
            .try_to_vec()
            .unwrap(),
    }
}

/// Creates an ActivateVault instruction
#[allow(clippy::too_many_arguments)]
pub fn create_activate_vault_instruction(
    program_id: Pubkey,
    vault: Pubkey,
    fraction_mint: Pubkey,
    fraction_treasury: Pubkey,
    fraction_mint_authority: Pubkey,
    vault_authority: Pubkey,
    number_of_shares: u64,
) -> Instruction {
    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(vault, false),
            AccountMeta::new(fraction_mint, false),
            AccountMeta::new(fraction_treasury, false),
            AccountMeta::new_readonly(fraction_mint_authority, false),
            AccountMeta::new_readonly(vault_authority, true),
            AccountMeta::new_readonly(spl_token::id(), false),
        ],
        data: VaultInstruction::ActivateVault(NumberOfShareArgs { number_of_shares })
            .try_to_vec()
            .unwrap(),
    }
}

/// Creates an CombineVault instruction
#[allow(clippy::too_many_arguments)]
pub fn create_combine_vault_instruction(
    program_id: Pubkey,
    vault: Pubkey,
    outstanding_share_token_account: Pubkey,
    paying_token_account: Pubkey,
    fraction_mint: Pubkey,
    fraction_treasury: Pubkey,
    redeem_treasury: Pubkey,
    new_authority: Pubkey,
    vault_authority: Pubkey,
    paying_transfer_authority: Pubkey,
    uncirculated_burn_authority: Pubkey,
    external_pricing_account: Pubkey,
) -> Instruction {
    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(vault, false),
            AccountMeta::new(outstanding_share_token_account, false),
            AccountMeta::new(paying_token_account, false),
            AccountMeta::new(fraction_mint, false),
            AccountMeta::new(fraction_treasury, false),
            AccountMeta::new(redeem_treasury, false),
            AccountMeta::new(new_authority, false),
            AccountMeta::new_readonly(vault_authority, true),
            AccountMeta::new_readonly(paying_transfer_authority, true),
            AccountMeta::new_readonly(uncirculated_burn_authority, false),
            AccountMeta::new_readonly(external_pricing_account, false),
            AccountMeta::new_readonly(spl_token::id(), false),
        ],
        data: VaultInstruction::CombineVault.try_to_vec().unwrap(),
    }
}

/// Creates an RedeemShares instruction
#[allow(clippy::too_many_arguments)]
pub fn create_redeem_shares_instruction(
    program_id: Pubkey,
    outstanding_shares_account: Pubkey,
    proceeds_account: Pubkey,
    fraction_mint: Pubkey,
    redeem_treasury: Pubkey,
    transfer_authority: Pubkey,
    burn_authority: Pubkey,
    vault: Pubkey,
) -> Instruction {
    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(outstanding_shares_account, false),
            AccountMeta::new(proceeds_account, false),
            AccountMeta::new(fraction_mint, false),
            AccountMeta::new(redeem_treasury, false),
            AccountMeta::new_readonly(transfer_authority, false),
            AccountMeta::new_readonly(burn_authority, true),
            AccountMeta::new_readonly(vault, false),
            AccountMeta::new_readonly(spl_token::id(), false),
            AccountMeta::new_readonly(sysvar::rent::id(), false),
        ],
        data: VaultInstruction::RedeemShares.try_to_vec().unwrap(),
    }
}

#[allow(clippy::too_many_arguments)]
pub fn create_withdraw_tokens_instruction(
    program_id: Pubkey,
    destination: Pubkey,
    safety_deposit_box: Pubkey,
    store: Pubkey,
    vault: Pubkey,
    fraction_mint: Pubkey,
    vault_authority: Pubkey,
    transfer_authority: Pubkey,
    amount: u64,
) -> Instruction {
    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(destination, false),
            AccountMeta::new(safety_deposit_box, false),
            AccountMeta::new(store, false),
            AccountMeta::new(vault, false),
            AccountMeta::new_readonly(fraction_mint, false),
            AccountMeta::new_readonly(vault_authority, true),
            AccountMeta::new_readonly(transfer_authority, false),
            AccountMeta::new_readonly(spl_token::id(), false),
            AccountMeta::new_readonly(sysvar::rent::id(), false),
        ],
        data: VaultInstruction::WithdrawTokenFromSafetyDepositBox(AmountArgs { amount })
            .try_to_vec()
            .unwrap(),
    }
}

#[allow(clippy::too_many_arguments)]
pub fn create_mint_shares_instruction(
    program_id: Pubkey,
    fraction_treasury: Pubkey,
    fraction_mint: Pubkey,
    vault: Pubkey,
    fraction_mint_authority: Pubkey,
    vault_authority: Pubkey,
    number_of_shares: u64,
) -> Instruction {
    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(fraction_treasury, false),
            AccountMeta::new(fraction_mint, false),
            AccountMeta::new_readonly(vault, false),
            AccountMeta::new_readonly(fraction_mint_authority, false),
            AccountMeta::new_readonly(vault_authority, true),
            AccountMeta::new_readonly(spl_token::id(), false),
        ],
        data: VaultInstruction::MintFractionalShares(NumberOfShareArgs { number_of_shares })
            .try_to_vec()
            .unwrap(),
    }
}

#[allow(clippy::too_many_arguments)]
pub fn create_withdraw_shares_instruction(
    program_id: Pubkey,
    destination: Pubkey,
    fraction_treasury: Pubkey,
    vault: Pubkey,
    transfer_authority: Pubkey,
    vault_authority: Pubkey,
    number_of_shares: u64,
) -> Instruction {
    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(destination, false),
            AccountMeta::new(fraction_treasury, false),
            AccountMeta::new_readonly(vault, false),
            AccountMeta::new_readonly(transfer_authority, false),
            AccountMeta::new_readonly(vault_authority, true),
            AccountMeta::new_readonly(spl_token::id(), false),
            AccountMeta::new_readonly(sysvar::rent::id(), false),
        ],
        data: VaultInstruction::WithdrawSharesFromTreasury(NumberOfShareArgs { number_of_shares })
            .try_to_vec()
            .unwrap(),
    }
}

#[allow(clippy::too_many_arguments)]
pub fn create_add_shares_instruction(
    program_id: Pubkey,
    source: Pubkey,
    fraction_treasury: Pubkey,
    vault: Pubkey,
    transfer_authority: Pubkey,
    vault_authority: Pubkey,
    number_of_shares: u64,
) -> Instruction {
    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(source, false),
            AccountMeta::new(fraction_treasury, false),
            AccountMeta::new_readonly(vault, false),
            AccountMeta::new_readonly(transfer_authority, true),
            AccountMeta::new_readonly(vault_authority, true),
            AccountMeta::new_readonly(spl_token::id(), false),
            AccountMeta::new_readonly(sysvar::rent::id(), false),
        ],
        data: VaultInstruction::AddSharesToTreasury(NumberOfShareArgs { number_of_shares })
            .try_to_vec()
            .unwrap(),
    }
}

pub fn create_set_authority_instruction(
    program_id: Pubkey,
    vault: Pubkey,
    current_authority: Pubkey,
    new_authority: Pubkey,
) -> Instruction {
    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(vault, false),
            AccountMeta::new_readonly(current_authority, true),
            AccountMeta::new_readonly(new_authority, false),
        ],
        data: VaultInstruction::SetAuthority.try_to_vec().unwrap(),
    }
}
