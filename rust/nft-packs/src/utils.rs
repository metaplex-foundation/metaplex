//! Program utils

use solana_program::{
    account_info::AccountInfo,
    entrypoint::ProgramResult,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    program_pack::Pack,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
};

/// Assert signer
pub fn assert_signer(account: &AccountInfo) -> ProgramResult {
    if account.is_signer {
        return Ok(());
    }

    Err(ProgramError::MissingRequiredSignature)
}

/// Assert owned by
pub fn assert_owned_by(account: &AccountInfo, owner: &Pubkey) -> ProgramResult {
    if account.owner != owner {
        Err(ProgramError::IllegalOwner)
    } else {
        Ok(())
    }
}

/// Assert account key
pub fn assert_account_key(account_info: &AccountInfo, key: &Pubkey) -> ProgramResult {
    if *account_info.key != *key {
        Err(ProgramError::InvalidArgument)
    } else {
        Ok(())
    }
}

/// Assert account rent exempt
pub fn assert_rent_exempt(rent: &Rent, account_info: &AccountInfo) -> ProgramResult {
    if !rent.is_exempt(account_info.lamports(), account_info.data_len()) {
        Err(ProgramError::AccountNotRentExempt)
    } else {
        Ok(())
    }
}

/// Initialize SPL mint instruction
pub fn spl_initialize_mint<'a>(
    mint: AccountInfo<'a>,
    mint_authority: AccountInfo<'a>,
    rent: AccountInfo<'a>,
    decimals: u8,
) -> ProgramResult {
    let ix = spl_token::instruction::initialize_mint(
        &spl_token::id(),
        mint.key,
        mint_authority.key,
        None,
        decimals,
    )?;

    invoke(&ix, &[mint, rent])
}

/// Create account (PDA)
#[allow(clippy::too_many_arguments)]
pub fn create_account<'a, S: Pack>(
    program_id: &Pubkey,
    from: AccountInfo<'a>,
    to: AccountInfo<'a>,
    signers_seeds: &[&[&[u8]]],
    rent: &Rent,
) -> ProgramResult {
    let ix = system_instruction::create_account(
        from.key,
        to.key,
        rent.minimum_balance(S::LEN),
        S::LEN as u64,
        program_id,
    );

    invoke_signed(&ix, &[from, to], signers_seeds)
}

/// Function wrap spl_token_metadata -> mint_new_edition_from_master_edition_via_token call.
pub fn spl_token_metadata_mint_new_edition_from_master_edition_via_token<'a>(
    new_metadata_account: &AccountInfo<'a>,
    new_edition_account: &AccountInfo<'a>,
    new_mint_account: &AccountInfo<'a>,
    new_mint_authority_account: &AccountInfo<'a>,
    user_wallet_account: &AccountInfo<'a>,
    user_token_account: &AccountInfo<'a>,
    metadata_account: &AccountInfo<'a>,
    master_edition_account: &AccountInfo<'a>,
    metadata_mint_account: &AccountInfo<'a>,
    edition: u64,
) -> Result<(), ProgramError> {
    let tx = spl_token_metadata::instruction::mint_new_edition_from_master_edition_via_token(
        spl_token_metadata::id(),
        *new_metadata_account.key,
        *new_edition_account.key,
        *master_edition_account.key,
        *new_mint_account.key,
        *new_mint_authority_account.key,
        *user_wallet_account.key,
        *user_wallet_account.key,
        *user_token_account.key,
        *user_wallet_account.key,
        *metadata_account.key,
        *metadata_mint_account.key,
        edition,
    );

    invoke_signed(
        &tx,
        &[
            new_metadata_account.clone(),
            new_edition_account.clone(),
            master_edition_account.clone(),
            new_mint_account.clone(),
            new_mint_authority_account.clone(),
            user_wallet_account.clone(),
            user_wallet_account.clone(),
            user_token_account.clone(),
            user_wallet_account.clone(),
            metadata_account.clone(),
            metadata_mint_account.clone(),
        ],
        &[],
    )?;

    Ok(())
}
