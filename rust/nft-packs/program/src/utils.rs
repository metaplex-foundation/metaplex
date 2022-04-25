//! Program utils

use crate::state::ProvingProcess;
use borsh::BorshSerialize;
use solana_program::{
    account_info::AccountInfo,
    clock::Clock,
    entrypoint::ProgramResult,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack},
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
};
use std::collections::hash_map::DefaultHasher;
use std::hash::Hasher;

/// Assert uninitialized
pub fn assert_uninitialized<T: IsInitialized>(account: &T) -> ProgramResult {
    if account.is_initialized() {
        Err(ProgramError::AccountAlreadyInitialized)
    } else {
        Ok(())
    }
}

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

/// Initialize SPL account instruction.
pub fn spl_initialize_account<'a>(
    account: AccountInfo<'a>,
    mint: AccountInfo<'a>,
    authority: AccountInfo<'a>,
    rent: AccountInfo<'a>,
) -> ProgramResult {
    let ix = spl_token::instruction::initialize_account(
        &spl_token::id(),
        account.key,
        mint.key,
        authority.key,
    )?;

    invoke(&ix, &[account, mint, authority, rent])
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

/// SPL transfer instruction.
pub fn spl_token_transfer<'a>(
    source: AccountInfo<'a>,
    destination: AccountInfo<'a>,
    authority: AccountInfo<'a>,
    amount: u64,
    signers_seeds: &[&[&[u8]]],
) -> Result<(), ProgramError> {
    let ix = spl_token::instruction::transfer(
        &spl_token::id(),
        source.key,
        destination.key,
        authority.key,
        &[],
        amount,
    )?;

    invoke_signed(&ix, &[source, destination, authority], signers_seeds)
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

/// Function wrap mpl_token_metadata -> mint_new_edition_from_master_edition_via_token call.
#[allow(clippy::too_many_arguments)]
pub fn spl_token_metadata_mint_new_edition_from_master_edition_via_token<'a>(
    new_metadata_account: &AccountInfo<'a>,
    new_edition_account: &AccountInfo<'a>,
    new_mint_account: &AccountInfo<'a>,
    new_mint_authority_account: &AccountInfo<'a>,
    user_wallet_account: &AccountInfo<'a>,
    program_authority_account: &AccountInfo<'a>,
    user_token_account: &AccountInfo<'a>,
    master_metadata_account: &AccountInfo<'a>,
    master_edition_account: &AccountInfo<'a>,
    master_metadata_mint_account: &AccountInfo<'a>,
    edition_mark_account: &AccountInfo<'a>,
    token_program_account: &AccountInfo<'a>,
    system_program_account: &AccountInfo<'a>,
    rent_program_account: &AccountInfo<'a>,
    edition: u64,
    signers_seeds: &[&[u8]],
) -> Result<(), ProgramError> {
    let tx = mpl_token_metadata::instruction::mint_new_edition_from_master_edition_via_token(
        mpl_token_metadata::id(),
        *new_metadata_account.key,
        *new_edition_account.key,
        *master_edition_account.key,
        *new_mint_account.key,
        *new_mint_authority_account.key,
        *user_wallet_account.key,
        *program_authority_account.key,
        *user_token_account.key,
        *user_wallet_account.key,
        *master_metadata_account.key,
        *master_metadata_mint_account.key,
        edition,
    );

    invoke_signed(
        &tx,
        &[
            new_metadata_account.clone(),
            new_edition_account.clone(),
            master_edition_account.clone(),
            new_mint_account.clone(),
            edition_mark_account.clone(),
            new_mint_authority_account.clone(),
            user_wallet_account.clone(),
            program_authority_account.clone(),
            user_token_account.clone(),
            user_wallet_account.clone(),
            master_metadata_account.clone(),
            token_program_account.clone(),
            system_program_account.clone(),
            rent_program_account.clone(),
        ],
        &[&signers_seeds],
    )?;

    Ok(())
}

/// Burn tokens
pub fn burn_tokens<'a>(
    account: AccountInfo<'a>,
    mint: AccountInfo<'a>,
    authority: AccountInfo<'a>,
    amount: u64,
) -> ProgramResult {
    let ix = spl_token::instruction::burn(
        &spl_token::id(),
        account.key,
        mint.key,
        authority.key,
        &[],
        amount,
    )?;

    invoke(&ix, &[account, mint, authority])
}

/// Close token account
pub fn close_token_account<'a>(
    account: AccountInfo<'a>,
    destination: AccountInfo<'a>,
    owner: AccountInfo<'a>,
) -> ProgramResult {
    let ix = spl_token::instruction::close_account(
        &spl_token::id(),
        account.key,
        destination.key,
        owner.key,
        &[],
    )?;

    invoke(&ix, &[account, destination, owner])
}

/// transfer all the SOL from source to receiver
pub fn empty_account_balance(
    source: &AccountInfo,
    receiver: &AccountInfo,
) -> Result<(), ProgramError> {
    let mut from = source.try_borrow_mut_lamports()?;
    let mut to = receiver.try_borrow_mut_lamports()?;
    **to += **from;
    **from = 0;
    Ok(())
}

/// get random value
pub fn get_random_value(
    recent_slothash: &[u8],
    proving_process: &ProvingProcess,
    clock: &Clock,
) -> Result<u16, ProgramError> {
    // Hash slot, current timestamp and value from last slothash and proving process data and receive new random u16
    let mut hasher = DefaultHasher::new();

    // recent slothash
    hasher.write(recent_slothash);
    // slot
    hasher.write_u64(clock.slot);
    // timestamp
    hasher.write_i64(clock.unix_timestamp);
    // ProvingProcess(to make hash different for each instruction in the same slot)
    hasher.write(proving_process.try_to_vec()?.as_ref());

    let mut random_value: [u8; 2] = [0u8; 2];
    random_value.copy_from_slice(&hasher.finish().to_le_bytes()[..2]);

    Ok(u16::from_le_bytes(random_value))
}
