//! Module provide runtime utilities

use crate::{id, ErrorCode};
use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke_signed, system_instruction},
};

pub const NAME_MAX_LEN: usize = 40; // max len of a string buffer in bytes
pub const NAME_DEFAULT_SIZE: usize = 4 + NAME_MAX_LEN; // max lenght of serialized string (str_len + <buffer>)
pub const DESCRIPTION_MAX_LEN: usize = 60;
pub const DESCRIPTION_DEFAULT_SIZE: usize = 4 + DESCRIPTION_MAX_LEN;
pub const HOLDER_PREFIX: &str = "holder";
pub const HISTORY_PREFIX: &str = "history";
pub const VAULT_OWNER_PREFIX: &str = "mt_vault";
pub const PAYOUT_TICKET_PREFIX: &str = "payout_ticket";
pub const PRIMARY_METADATA_CREATORS_PREFIX: &str = "primary_creators";
pub const FLAG_ACCOUNT_SIZE: usize = 1; // Size for flag account to indicate something
pub const MAX_PRIMARY_CREATORS_LEN: usize = 5; // Total allowed creators in `PrimaryMetadataCreators`

/// Runtime derivation check
pub fn assert_derivation(program_id: &Pubkey, account: &AccountInfo, path: &[&[u8]]) -> Result<u8> {
    let (key, bump) = Pubkey::find_program_address(path, program_id);
    if key != *account.key {
        return Err(ErrorCode::DerivedKeyInvalid.into());
    }
    Ok(bump)
}

/// Return `treasury_owner` Pubkey and bump seed.
pub fn find_treasury_owner_address(
    treasury_mint: &Pubkey,
    selling_resource: &Pubkey,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            HOLDER_PREFIX.as_bytes(),
            treasury_mint.as_ref(),
            selling_resource.as_ref(),
        ],
        &id(),
    )
}

/// Return `vault_owner` `Pubkey` and bump seed.
pub fn find_vault_owner_address(resource_mint: &Pubkey, store: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            VAULT_OWNER_PREFIX.as_bytes(),
            resource_mint.as_ref(),
            store.as_ref(),
        ],
        &id(),
    )
}

/// Return `TradeHistory` `Pubkey` and bump seed.
pub fn find_trade_history_address(wallet: &Pubkey, market: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[HISTORY_PREFIX.as_bytes(), wallet.as_ref(), market.as_ref()],
        &id(),
    )
}

/// Return payout ticket `Pubkey` and bump seed.
pub fn find_payout_ticket_address(market: &Pubkey, funder: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            PAYOUT_TICKET_PREFIX.as_bytes(),
            market.as_ref(),
            funder.as_ref(),
        ],
        &id(),
    )
}

/// Return `PrimaryMetadataCreators` `Pubkey` and bump seed.
pub fn find_primary_metadata_creators(metadata: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            PRIMARY_METADATA_CREATORS_PREFIX.as_bytes(),
            metadata.as_ref(),
        ],
        &id(),
    )
}

/// Wrapper of `create_account` instruction from `system_program` program
#[inline(always)]
pub fn sys_create_account<'a>(
    from: &AccountInfo<'a>,
    to: &AccountInfo<'a>,
    lamports: u64,
    space: usize,
    owner: &Pubkey,
    signer_seeds: &[&[u8]],
) -> Result<()> {
    invoke_signed(
        &system_instruction::create_account(from.key, to.key, lamports, space as u64, owner),
        &[from.clone(), to.clone()],
        &[&signer_seeds],
    )?;

    Ok(())
}

/// Wrapper of `transfer` instruction from `system_program` program
#[inline(always)]
pub fn sys_transfer<'a>(
    from: &AccountInfo<'a>,
    to: &AccountInfo<'a>,
    lamports: u64,
    signer_seeds: &[&[u8]],
) -> Result<()> {
    invoke_signed(
        &system_instruction::transfer(from.key, to.key, lamports),
        &[from.clone(), to.clone()],
        &[&signer_seeds],
    )?;

    Ok(())
}

/// Wrapper of `mint_new_edition_from_master_edition_via_token` instruction from `mpl_token_metadata` program
#[inline(always)]
pub fn mpl_mint_new_edition_from_master_edition_via_token<'a>(
    new_metadata: &AccountInfo<'a>,
    new_edition: &AccountInfo<'a>,
    new_mint: &AccountInfo<'a>,
    new_mint_authority: &AccountInfo<'a>,
    user_wallet: &AccountInfo<'a>,
    token_account_owner: &AccountInfo<'a>,
    token_account: &AccountInfo<'a>,
    master_metadata: &AccountInfo<'a>,
    master_edition: &AccountInfo<'a>,
    metadata_mint: &Pubkey,
    edition_marker: &AccountInfo<'a>,
    token_program: &AccountInfo<'a>,
    system_program: &AccountInfo<'a>,
    rent: &AccountInfo<'a>,
    edition: u64,
    signers_seeds: &[&[u8]],
) -> Result<()> {
    let tx = mpl_token_metadata::instruction::mint_new_edition_from_master_edition_via_token(
        mpl_token_metadata::id(),
        *new_metadata.key,
        *new_edition.key,
        *master_edition.key,
        *new_mint.key,
        *new_mint_authority.key,
        *user_wallet.key,
        *token_account_owner.key,
        *token_account.key,
        *user_wallet.key,
        *master_metadata.key,
        *metadata_mint,
        edition,
    );

    invoke_signed(
        &tx,
        &[
            new_metadata.clone(),
            new_edition.clone(),
            master_edition.clone(),
            new_mint.clone(),
            edition_marker.clone(),
            new_mint_authority.clone(),
            user_wallet.clone(),
            token_account_owner.clone(),
            token_account.clone(),
            user_wallet.clone(),
            master_metadata.clone(),
            token_program.clone(),
            system_program.clone(),
            rent.clone(),
        ],
        &[&signers_seeds],
    )?;

    Ok(())
}

/// Wrapper of `update_primary_sale_happened_via_token` instruction from `mpl_token_metadata` program
#[inline(always)]
pub fn mpl_update_primary_sale_happened_via_token<'a>(
    metadata: &AccountInfo<'a>,
    owner: &AccountInfo<'a>,
    token: &AccountInfo<'a>,
    signers_seeds: &[&[u8]],
) -> Result<()> {
    let tx = mpl_token_metadata::instruction::update_primary_sale_happened_via_token(
        mpl_token_metadata::id(),
        metadata.key(),
        owner.key(),
        token.key(),
    );

    invoke_signed(
        &tx,
        &[metadata.clone(), owner.clone(), token.clone()],
        &[&signers_seeds],
    )?;

    Ok(())
}

/// Wrapper of `update_metadata_accounts_v2` instruction from `mpl_token_metadata` program
#[inline(always)]
pub fn mpl_update_metadata_accounts_v2<'a>(
    metadata: &AccountInfo<'a>,
    update_authority: &AccountInfo<'a>,
    new_update_authority: Option<Pubkey>,
    data: Option<mpl_token_metadata::state::DataV2>,
    primary_sale_happened: Option<bool>,
    is_mutable: Option<bool>,
    signers_seeds: &[&[u8]],
) -> Result<()> {
    let tx = mpl_token_metadata::instruction::update_metadata_accounts_v2(
        mpl_token_metadata::id(),
        metadata.key(),
        update_authority.key(),
        new_update_authority,
        data,
        primary_sale_happened,
        is_mutable,
    );

    invoke_signed(
        &tx,
        &[metadata.clone(), update_authority.clone()],
        &[&signers_seeds],
    )?;

    Ok(())
}

/// Add zeroes to the end of the String.
/// This allows to have the size of allocated for this string memory fixed.
pub fn puffed_out_string(s: String, size: usize) -> String {
    s.to_string() + std::str::from_utf8(&vec![0u8; size - s.len()]).unwrap()
}

/// Two keys equivalence check
pub fn assert_keys_equal(key1: Pubkey, key2: Pubkey) -> Result<()> {
    if key1 != key2 {
        Err(ErrorCode::PublicKeyMismatch.into())
    } else {
        Ok(())
    }
}

pub fn calculate_primary_shares_for_creator(total_amount: u64, shares: u64) -> Result<u64> {
    Ok(total_amount
        .checked_mul(shares)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(100)
        .ok_or(ErrorCode::MathOverflow)?)
}

pub fn calculate_secondary_shares_for_creator(
    total_amount: u64,
    seller_fee_basis_points: u64,
    shares: u64,
) -> Result<u64> {
    Ok((total_amount
        .checked_mul(seller_fee_basis_points)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(10000)
        .ok_or(ErrorCode::MathOverflow)?)
    .checked_mul(shares)
    .ok_or(ErrorCode::MathOverflow)?
    .checked_div(100)
    .ok_or(ErrorCode::MathOverflow)?)
}

pub fn calculate_secondary_shares_for_market_owner(
    total_amount: u64,
    seller_fee_basis_points: u64,
) -> Result<u64> {
    Ok(total_amount
        .checked_sub(
            total_amount
                .checked_mul(seller_fee_basis_points)
                .ok_or(ErrorCode::MathOverflow)?
                .checked_div(10000)
                .ok_or(ErrorCode::MathOverflow)?,
        )
        .ok_or(ErrorCode::MathOverflow)?)
}
