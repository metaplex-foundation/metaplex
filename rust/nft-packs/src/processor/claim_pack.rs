//! Claim pack instruction processing

use crate::{
    error::NFTPacksError,
    find_pack_card_program_address, find_program_authority,
    math::SafeMath,
    state::{DistributionType, PackCard, PackSet, ProvingProcess, MAX_LAG_SLOTS, PREFIX},
    utils::*,
    PRECISION,
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program_pack::Pack,
    pubkey::Pubkey,
    sysvar::{rent::Rent, Sysvar},
};
use spl_token_metadata::state::{MasterEditionV2, Metadata};

/// Process ClaimPack instruction
pub fn claim_pack(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let pack_set_account = next_account_info(account_info_iter)?;
    let proving_process_account = next_account_info(account_info_iter)?;
    let user_wallet_account = next_account_info(account_info_iter)?;
    let program_authority_account = next_account_info(account_info_iter)?;
    let pack_card_account = next_account_info(account_info_iter)?;
    let user_token_account = next_account_info(account_info_iter)?;
    let new_metadata_account = next_account_info(account_info_iter)?;
    let new_edition_account = next_account_info(account_info_iter)?;
    let master_edition_account = next_account_info(account_info_iter)?;
    let new_mint_account = next_account_info(account_info_iter)?;
    let new_mint_authority_account = next_account_info(account_info_iter)?;
    let metadata_account = next_account_info(account_info_iter)?;
    let metadata_mint_account = next_account_info(account_info_iter)?;
    let edition_marker_account = next_account_info(account_info_iter)?;
    let rent_account = next_account_info(account_info_iter)?;
    let randomness_oracle_account = next_account_info(account_info_iter)?;
    let _token_metadata_account = next_account_info(account_info_iter)?;
    let token_program_account = next_account_info(account_info_iter)?;
    let system_program_account = next_account_info(account_info_iter)?;
    let clock_info = next_account_info(account_info_iter)?;
    let clock = solana_program::clock::Clock::from_account_info(clock_info)?;
    let _rent = &Rent::from_account_info(rent_account)?;

    // Validate owners
    assert_owned_by(pack_set_account, program_id)?;
    assert_owned_by(pack_card_account, program_id)?;
    assert_owned_by(randomness_oracle_account, &randomness_oracle_program::id())?;

    assert_signer(&user_wallet_account)?;

    let pack_set = PackSet::unpack(&pack_set_account.data.borrow())?;
    let mut proving_process = ProvingProcess::unpack(&proving_process_account.data.borrow_mut())?;
    let index = proving_process.claimed_cards.error_increment()?;

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

    // Obtain master metadata instance
    let master_metadata = Metadata::from_account_info(metadata_account)?;

    let master_edition = MasterEditionV2::from_account_info(master_edition_account)?;

    // Check metadata mint
    assert_account_key(metadata_mint_account, &master_metadata.mint)?;

    let (program_authority_key, bump_seed) = find_program_authority(program_id);
    assert_account_key(program_authority_account, &program_authority_key)?;

    match pack_card.distribution_type {
        DistributionType::FixedNumber => {
            msg!("Fixed number distribution type");
            // Check if user already open pack
            if proving_process.claimed_card_editions as u64 == pack_card.number_in_pack {
                return Err(NFTPacksError::PackIsAlreadyOpen.into());
            }

            proving_process.claimed_card_editions =
                proving_process.claimed_card_editions.error_increment()?;

            // Check if this pack is last for user
            if proving_process.claimed_card_editions as u64 == pack_card.number_in_pack {
                proving_process.claimed_cards = proving_process.claimed_cards.error_increment()?;
                proving_process.claimed_card_editions = 0;
            }

            msg!("Mint NFT for user");

            // Mint token
            spl_token_metadata_mint_new_edition_from_master_edition_via_token(
                new_metadata_account,
                new_edition_account,
                new_mint_account,
                new_mint_authority_account,
                user_wallet_account,
                program_authority_account,
                user_token_account,
                metadata_account,
                master_edition_account,
                metadata_mint_account,
                edition_marker_account,
                token_program_account,
                system_program_account,
                rent_account,
                master_edition.supply.error_increment()?,
                &[PREFIX.as_bytes(), program_id.as_ref(), &[bump_seed]],
            )?;
        }
        DistributionType::ProbabilityBased => {
            msg!("Probability based distribution type");

            // Calculate probability number
            let probability = pack_card.number_in_pack as u128 * PRECISION
                / (pack_card.number_in_pack as u128 + PRECISION);

            // From oracle
            let (oracle_random_value, slot) =
                randomness_oracle_program::read_value(randomness_oracle_account)?;

            if clock.slot.error_sub(slot)? > MAX_LAG_SLOTS {
                return Err(NFTPacksError::RandomOracleOutOfDate.into());
            }

            // Convert oracle random byte array to number
            let mut random_value: [u8; 4] = [0u8; 4];
            random_value.copy_from_slice(&oracle_random_value[..4]);
            let random_value = u32::from_le_bytes(random_value);

            let random_value = (random_value as u128) * PRECISION / (u32::MAX as u128);

            if random_value <= probability {
                msg!("User get NFT");

                proving_process.claimed_card_editions =
                    proving_process.claimed_card_editions.error_increment()?;

                // Mint token
                spl_token_metadata_mint_new_edition_from_master_edition_via_token(
                    new_metadata_account,
                    new_edition_account,
                    new_mint_account,
                    new_mint_authority_account,
                    user_wallet_account,
                    program_authority_account,
                    user_token_account,
                    metadata_account,
                    master_edition_account,
                    metadata_mint_account,
                    edition_marker_account,
                    token_program_account,
                    system_program_account,
                    rent_account,
                    master_edition.supply.error_increment()?,
                    &[PREFIX.as_bytes(), program_id.as_ref(), &[bump_seed]],
                )?;
            } else {
                msg!("User does not get NFT");

                proving_process.claimed_cards = proving_process.claimed_cards.error_increment()?;
                proving_process.claimed_card_editions = 0;
            }
        }
    };

    // Update state
    ProvingProcess::pack(proving_process, *proving_process_account.data.borrow_mut())?;

    Ok(())
}
