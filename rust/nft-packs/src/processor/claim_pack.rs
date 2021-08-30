//! Claim pack instruction processing

use crate::{
    error::NFTPacksError,
    find_pack_card_program_address,
    state::{DistributionType, PackCard, PackSet, ProvingProcess},
    utils::*,
    PRECISION,
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    program::invoke_signed,
    program_error::ProgramError,
    program_pack::Pack,
    pubkey::Pubkey,
    sysvar::{rent::Rent, Sysvar},
};
use spl_token_metadata::state::{Creator, Edition, Metadata};

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
pub fn claim_pack(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
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

    assert_owned_by(pack_set_account, program_id)?;
    assert_owned_by(pack_card_account, program_id)?;

    assert_rent_exempt(&rent, &pack_set_account)?;

    assert_signer(&user_wallet_account)?;

    let pack_set = PackSet::unpack(&pack_set_account.data.borrow())?;
    let mut proving_process = ProvingProcess::unpack(&proving_process_account.data.borrow_mut())?;
    let index = proving_process.claimed_cards + 1;

    assert_account_key(pack_set_account, &proving_process.pack_set)?;
    assert_account_key(user_wallet_account, &proving_process.user_wallet)?;

    // Validate PackCard
    let (valid_pack_card, _) =
        find_pack_card_program_address(program_id, pack_set_account.key, index);
    assert_account_key(pack_card_account, &valid_pack_card)?;

    let pack_card = PackCard::unpack(&pack_card_account.data.borrow())?;
    assert_account_key(pack_set_account, &pack_card.pack_set)?;

    // Check if user have enough proves
    if pack_set.pack_vouchers != proving_process.proved_vouchers {
        return Err(NFTPacksError::ProvedVouchersMismatchPackVouchers.into());
    }

    // Obtain edition instance
    let edition = Edition::from_account_info(edition_account)?;

    // Obtain master metadata instance
    let master_metadata = Metadata::from_account_info(metadata_account)?;

    // Check metadata mint
    assert_account_key(metadata_mint_account, &master_metadata.mint)?;

    // Obtain master metadata mint instance
    let master_mint = spl_token::state::Mint::unpack(&metadata_mint_account.data.borrow())?;

    // Initialize mint
    spl_initialize_mint(
        new_mint_account.clone(),
        new_mint_authority_account.clone(),
        rent_account.clone(),
        master_mint.decimals,
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

    match pack_card.distribution_type {
        DistributionType::FixedNumber => {
            // Check if user already open pack
            if proving_process.claimed_card_editions as u64 == pack_card.number_in_pack {
                return Err(NFTPacksError::PackIsAlreadyOpen.into());
            }

            proving_process.claimed_card_editions += 1;

            // Check if this pack is last for user
            if proving_process.claimed_card_editions as u64 == pack_card.number_in_pack {
                proving_process.claimed_cards += 1;
                proving_process.claimed_card_editions = 0;
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
        }
        DistributionType::ProbabilityBased => {
            // Calculate probability number
            let probability = pack_card.number_in_pack as u128 * PRECISION
                / (pack_card.number_in_pack as u128 + PRECISION);

            // From oracle
            let (oracle_random_value, _slot) =
                randomness_oracle_program::read_value(randomness_oracle_account)?;

            // Convert oracle random byte array to number
            let mut random_value: [u8; 4] = [0u8; 4];
            random_value.copy_from_slice(&oracle_random_value);
            let random_value = u32::from_le_bytes(random_value);

            let random_value = (random_value as u128) * PRECISION / (u32::MAX as u128);

            // If user win
            if random_value <= probability {
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
            } else {
                // User lose
                proving_process.claimed_cards += 1;
                proving_process.claimed_card_editions = 0;
            }
        }
    };

    // Update state
    ProvingProcess::pack(proving_process, *proving_process_account.data.borrow_mut())?;

    Ok(())
}
