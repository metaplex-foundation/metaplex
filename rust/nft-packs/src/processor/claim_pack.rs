//! Claim pack instruction processing

use crate::{
    error::NFTPacksError,
    find_pack_card_program_address,
    instruction::InitPackSetArgs,
    state::{InitPackSetParams, PackCard, PackSet, ProbabilityType, ProvingProcess},
    utils::*,
};
use borsh::BorshSerialize;
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    program::invoke_signed,
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack},
    pubkey::Pubkey,
    sysvar::{rent::Rent, Sysvar},
};
use spl_token_metadata::state::{Creator, Edition, Metadata};

/// Function wrap spl_token_metadata -> mint_new_edition_from_master_edition_via_token call.
fn spl_token_metadata_mint_new_edition_from_master_edition_via_token<'a>(
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

/// Function wrap spl_token_metadata -> create_metadata_accounts call.
fn spl_token_metadata_create_metadata_accounts<'a>(
    new_metadata_account: &AccountInfo<'a>,
    new_mint_account: &AccountInfo<'a>,
    new_mint_authority_account: &AccountInfo<'a>,
    user_wallet_account: &AccountInfo<'a>,
    name: String,
    symbol: String,
    uri: String,
    creators: Option<Vec<Creator>>,
    seller_fee_basis_points: u16,
    update_authority_is_signer: bool,
    is_mutable: bool,
) -> Result<(), ProgramError> {
    Ok(invoke_signed(
        &spl_token_metadata::instruction::create_metadata_accounts(
            spl_token_metadata::id(),
            *new_metadata_account.key,
            *new_mint_account.key,
            *new_mint_authority_account.key,
            *user_wallet_account.key,
            *user_wallet_account.key,
            name,
            symbol,
            uri,
            creators,
            seller_fee_basis_points,
            update_authority_is_signer,
            is_mutable,
        ),
        &[
            new_metadata_account.clone(),
            new_mint_account.clone(),
            new_mint_authority_account.clone(),
            user_wallet_account.clone(),
            user_wallet_account.clone(),
        ],
        &[],
    )?)
}

/// Process ClaimPack instruction
pub fn claim_pack(program_id: &Pubkey, accounts: &[AccountInfo], index: u32) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let pack_set_account = next_account_info(account_info_iter)?;
    let proving_process_account = next_account_info(account_info_iter)?;
    let user_wallet_account = next_account_info(account_info_iter)?;
    let pack_card_account = next_account_info(account_info_iter)?;
    let user_token_account = next_account_info(account_info_iter)?;
    let new_metadata_account = next_account_info(account_info_iter)?;
    let new_edition_account = next_account_info(account_info_iter)?;
    let master_edition_account = next_account_info(account_info_iter)?;
    let new_mint_account = next_account_info(account_info_iter)?;
    let new_mint_authority_account = next_account_info(account_info_iter)?;
    let metadata_account = next_account_info(account_info_iter)?;
    let metadata_mint_account = next_account_info(account_info_iter)?;
    let edition_account = next_account_info(account_info_iter)?;
    let rent_account = next_account_info(account_info_iter)?;
    let randomness_oracle_account = next_account_info(account_info_iter)?;
    let rent = &Rent::from_account_info(rent_account)?;

    assert_rent_exempt(&rent, &pack_set_account)?;

    assert_signer(&user_wallet_account)?;

    let pack_set = PackSet::unpack(&pack_set_account.data.borrow_mut())?;
    let mut proving_process = ProvingProcess::unpack(&proving_process_account.data.borrow_mut())?;

    assert_account_key(pack_set_account, &proving_process.pack_set)?;
    assert_account_key(user_wallet_account, &proving_process.user_wallet)?;

    // Validate PackCard
    let (valid_pack_card_account, _) =
        find_pack_card_program_address(program_id, pack_set_account.key, index);
    if valid_pack_card_account != *pack_card_account.key {
        return Err(ProgramError::InvalidArgument);
    }

    let pack_card = PackCard::unpack(&pack_card_account.data.borrow())?;
    assert_account_key(pack_set_account, &pack_card.pack_set)?;

    // Check if user have enough proves
    if pack_set.pack_vouchers != proving_process.proved_vouchers {
        return Err(NFTPacksError::ProvedVouchersMismatchPackVouchers.into());
    }

    // Check if user already open pack
    if proving_process.claimed_card_editions as u64 == pack_card.probability {
        return Err(NFTPacksError::PackIsAlreadyOpen.into());
    }

    // Obtain edition instance
    let edition = Edition::from_account_info(edition_account)?;

    // Obtain master metadata instance
    let master_metadata = Metadata::from_account_info(metadata_account)?;

    // Obtain master metadata mint instance
    let master_mint =
        spl_token::state::Mint::unpack_unchecked(&metadata_mint_account.data.borrow())?;

    // Initialize mint
    invoke_signed(
        &spl_token::instruction::initialize_mint(
            &spl_token::id(),
            new_mint_account.key,
            new_mint_authority_account.key,
            None,
            master_mint.decimals,
        )?,
        &[new_mint_account.clone(), new_mint_authority_account.clone()],
        &[],
    )?;

    // Create new metadata account on-chain from master metadata account
    spl_token_metadata_create_metadata_accounts(
        new_metadata_account,
        new_mint_account,
        new_mint_authority_account,
        user_wallet_account,
        master_metadata.data.name.clone(),
        master_metadata.data.symbol.clone(),
        master_metadata.data.uri.clone(),
        master_metadata.data.creators,
        master_metadata.data.seller_fee_basis_points,
        true,
        master_metadata.is_mutable,
    )?;

    match pack_card.probability_type {
        ProbabilityType::FixedNumber => {
            proving_process.claimed_card_editions += 1;

            // Check if this pack is last for user
            if proving_process.claimed_card_editions as u64 == pack_card.probability {
                proving_process.claimed_cards += 1;
            }

            // Mint token
            spl_token_metadata_mint_new_edition_from_master_edition_via_token(
                new_metadata_account,
                new_edition_account,
                new_mint_account,
                new_mint_authority_account,
                user_wallet_account,
                user_token_account,
                metadata_account,
                master_edition_account,
                metadata_mint_account,
                edition.edition,
            )?;

            Ok(())
        }
        ProbabilityType::ProbabilityBased => {
            // From oracle
            let (oracle_random_value, _slot) =
                randomness_oracle_program::read_value(randomness_oracle_account)?;

            // Convert oracle random byte array to number
            let mut random_value: [u8; 4] = [0u8; 4];
            random_value.copy_from_slice(&oracle_random_value);
            let random_value = u32::from_le_bytes(random_value);

            // If user win
            if random_value as u64 <= pack_card.probability {
                proving_process.claimed_card_editions += 1;

                // Mint new tokens
                spl_token_metadata_mint_new_edition_from_master_edition_via_token(
                    new_metadata_account,
                    new_edition_account,
                    new_mint_account,
                    new_mint_authority_account,
                    user_wallet_account,
                    user_token_account,
                    metadata_account,
                    master_edition_account,
                    metadata_mint_account,
                    edition.edition,
                )?;

                return Ok(());
            } else {
                // User lose
                proving_process.claimed_cards += 1;
                return Ok(());
            }
        }
    }
}
