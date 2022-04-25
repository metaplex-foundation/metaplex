use solana_program::program_pack::IsInitialized;

use {
    crate::errors::AuctionError,
    solana_program::{
        account_info::AccountInfo,
        entrypoint::ProgramResult,
        msg,
        program::{invoke, invoke_signed},
        program_error::ProgramError,
        program_pack::Pack,
        pubkey::Pubkey,
        system_instruction,
        sysvar::{rent::Rent, Sysvar},
    },
    std::convert::TryInto,
};

pub fn assert_initialized<T: Pack + IsInitialized>(
    account_info: &AccountInfo,
) -> Result<T, ProgramError> {
    let account: T = T::unpack_unchecked(&account_info.data.borrow())?;
    if !account.is_initialized() {
        Err(AuctionError::Uninitialized.into())
    } else {
        Ok(account)
    }
}

pub fn assert_uninitialized<T: Pack + IsInitialized>(account_info: &AccountInfo) -> ProgramResult {
    msg!("assert_uninitialized");
    let err = T::unpack_unchecked(&account_info.data.borrow());
    match err {
        Ok(account) => Err(AuctionError::BidderPotTokenAccountMustBeNew.into()),
        Err(err) => Ok(()),
    }
}

pub fn assert_token_program_matches_package(token_program_info: &AccountInfo) -> ProgramResult {
    if *token_program_info.key != spl_token::id() {
        return Err(AuctionError::InvalidTokenProgram.into());
    }

    Ok(())
}

pub fn assert_owned_by(account: &AccountInfo, owner: &Pubkey) -> ProgramResult {
    if account.owner != owner {
        msg!(
            "{} Owner Invalid, Expected {}, Got {}",
            account.key,
            owner,
            account.owner
        );
        Err(AuctionError::IncorrectOwner.into())
    } else {
        Ok(())
    }
}

pub fn assert_rent_exempt(rent: &Rent, account_info: &AccountInfo) -> ProgramResult {
    if !rent.is_exempt(account_info.lamports(), account_info.data_len()) {
        Err(AuctionError::NotRentExempt.into())
    } else {
        Ok(())
    }
}

pub fn assert_signer(account_info: &AccountInfo) -> ProgramResult {
    if !account_info.is_signer {
        Err(ProgramError::MissingRequiredSignature)
    } else {
        Ok(())
    }
}

pub fn assert_derivation(
    program_id: &Pubkey,
    account: &AccountInfo,
    path: &[&[u8]],
) -> Result<u8, ProgramError> {
    let (key, bump) = Pubkey::find_program_address(&path, program_id);
    if key != *account.key {
        return Err(AuctionError::DerivedKeyInvalid.into());
    }
    Ok(bump)
}

#[inline(always)]
pub fn create_or_allocate_account_raw<'a>(
    program_id: Pubkey,
    new_account_info: &AccountInfo<'a>,
    rent_sysvar_info: &AccountInfo<'a>,
    system_program_info: &AccountInfo<'a>,
    payer_info: &AccountInfo<'a>,
    size: usize,
    signer_seeds: &[&[u8]],
) -> Result<(), ProgramError> {
    let rent = &Rent::from_account_info(rent_sysvar_info)?;
    let required_lamports = rent
        .minimum_balance(size)
        .max(1)
        .saturating_sub(new_account_info.lamports());

    if required_lamports > 0 {
        msg!("Transfer {} lamports to the new account", required_lamports);
        invoke(
            &system_instruction::transfer(&payer_info.key, new_account_info.key, required_lamports),
            &[
                payer_info.clone(),
                new_account_info.clone(),
                system_program_info.clone(),
            ],
        )?;
    }

    msg!("Allocate space for the account");
    invoke_signed(
        &system_instruction::allocate(new_account_info.key, size.try_into().unwrap()),
        &[new_account_info.clone(), system_program_info.clone()],
        &[&signer_seeds],
    )?;

    msg!("Assign the account to the owning program");
    invoke_signed(
        &system_instruction::assign(new_account_info.key, &program_id),
        &[new_account_info.clone(), system_program_info.clone()],
        &[&signer_seeds],
    )?;
    msg!("Completed assignation!");

    Ok(())
}

///TokenTransferParams
pub struct TokenTransferParams<'a: 'b, 'b> {
    /// CHECK: source
    /// source
    pub source: AccountInfo<'a>,
    /// CHECK: destination
    /// destination
    pub destination: AccountInfo<'a>,
    /// CHECK: amount
    /// amount
    pub amount: u64,
    /// CHECK: authority
    /// authority
    pub authority: AccountInfo<'a>,
    /// CHECK: authority_signer_seeds
    /// authority_signer_seeds
    pub authority_signer_seeds: &'b [&'b [u8]],
    /// CHECK: token_program
    /// token_program
    pub token_program: AccountInfo<'a>,
}

#[inline(always)]
pub fn spl_token_transfer(params: TokenTransferParams<'_, '_>) -> ProgramResult {
    let TokenTransferParams {
        source,
        destination,
        authority,
        token_program,
        amount,
        authority_signer_seeds,
    } = params;

    let result = invoke_signed(
        &spl_token::instruction::transfer(
            token_program.key,
            source.key,
            destination.key,
            authority.key,
            &[],
            amount,
        )?,
        &[source, destination, authority, token_program],
        &[authority_signer_seeds],
    );

    result.map_err(|_| AuctionError::TokenTransferFailed.into())
}

pub fn close_token_account<'a>(
    account: AccountInfo<'a>,
    destination: AccountInfo<'a>,
    owner: AccountInfo<'a>,
    signer_seeds: &[&[u8]],
) -> ProgramResult {
    let ix = spl_token::instruction::close_account(
        &spl_token::id(),
        account.key,
        destination.key,
        owner.key,
        &[],
    )?;

    invoke_signed(&ix, &[account, destination, owner], &[signer_seeds])
}

/// TokenMintToParams
pub struct TokenCreateAccount<'a: 'b, 'b> {
    /// CHECK: payer
    /// payer
    pub payer: AccountInfo<'a>,
    /// CHECK: mint
    /// mint
    pub mint: AccountInfo<'a>,
    /// CHECK: account
    /// account
    pub account: AccountInfo<'a>,
    /// CHECK:  authority
    /// authority
    pub authority: AccountInfo<'a>,
    /// CHECK: authority seeds
    /// authority seeds
    pub authority_seeds: &'b [&'b [u8]],
    /// CHECK: token_program
    /// token_program
    pub token_program: AccountInfo<'a>,
    /// CHECK: system_program
    pub system_program: AccountInfo<'a>,
    /// CHECK: rent information
    /// rent information
    pub rent: AccountInfo<'a>,
}

/// Create a new SPL token account.
#[inline(always)]
pub fn spl_token_create_account<'a>(params: TokenCreateAccount<'_, '_>) -> ProgramResult {
    let TokenCreateAccount {
        payer,
        mint,
        account,
        authority,
        authority_seeds,
        token_program,
        system_program,
        rent,
    } = params;
    let acct = &account.key.clone();

    create_or_allocate_account_raw(
        *token_program.key,
        &account,
        &rent,
        &system_program,
        &payer,
        spl_token::state::Account::LEN,
        authority_seeds,
    )?;
    msg!("Created account {}", acct);
    invoke_signed(
        &spl_token::instruction::initialize_account(
            &spl_token::id(),
            acct,
            mint.key,
            authority.key,
        )?,
        &[
            account,
            authority,
            mint,
            token_program,
            system_program,
            rent,
        ],
        &[authority_seeds],
    )?;

    Ok(())
}
