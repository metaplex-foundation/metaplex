use crate::{
    deprecated_state::{AuctionManagerV1, ParticipationStateV1},
    error::MetaplexError,
    state::{AuctionManagerStatus, Store},
    utils::{
        assert_at_least_one_creator_matches_or_store_public_and_all_verified,
        assert_authority_correct, assert_derivation, assert_initialized, assert_owned_by,
        assert_rent_exempt, assert_store_safety_vault_manager_match,
    },
};
use borsh::BorshSerialize;
use mpl_token_metadata::state::{MasterEditionV1, Metadata};
use mpl_token_vault::state::{SafetyDepositBox, Vault};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    program_option::COption,
    pubkey::Pubkey,
    rent::Rent,
    sysvar::Sysvar,
};
use spl_token::state::Account;

pub fn process_deprecated_validate_participation(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let auction_manager_info = next_account_info(account_info_iter)?;
    let open_edition_metadata_info = next_account_info(account_info_iter)?;
    let open_master_edition_info = next_account_info(account_info_iter)?;
    let printing_authorization_token_account_info = next_account_info(account_info_iter)?;
    let authority_info = next_account_info(account_info_iter)?;
    let whitelisted_creator_info = next_account_info(account_info_iter)?;
    let store_info = next_account_info(account_info_iter)?;
    let safety_deposit_box_info = next_account_info(account_info_iter)?;
    let safety_deposit_box_token_store_info = next_account_info(account_info_iter)?;
    let vault_info = next_account_info(account_info_iter)?;
    let rent_info = next_account_info(account_info_iter)?;
    let rent = &Rent::from_account_info(&rent_info)?;

    let mut auction_manager = AuctionManagerV1::from_account_info(auction_manager_info)?;
    let store = Store::from_account_info(store_info)?;
    let vault = Vault::from_account_info(vault_info)?;
    let safety_deposit_token_store: Account =
        assert_initialized(safety_deposit_box_token_store_info)?;
    let safety_deposit = SafetyDepositBox::from_account_info(safety_deposit_box_info)?;
    let printing_token_account: Account =
        assert_initialized(printing_authorization_token_account_info)?;
    let open_edition_metadata = Metadata::from_account_info(open_edition_metadata_info)?;
    let master_edition = MasterEditionV1::from_account_info(open_master_edition_info)?;

    if vault.authority != *auction_manager_info.key {
        return Err(MetaplexError::VaultAuthorityMismatch.into());
    }

    // top level authority and ownership check
    assert_authority_correct(&auction_manager.authority, authority_info)?;
    assert_owned_by(auction_manager_info, program_id)?;
    assert_owned_by(open_edition_metadata_info, &store.token_metadata_program)?;
    assert_owned_by(open_master_edition_info, &store.token_metadata_program)?;
    assert_owned_by(
        printing_authorization_token_account_info,
        &store.token_program,
    )?;
    if *whitelisted_creator_info.key != solana_program::system_program::id() {
        if whitelisted_creator_info.data_is_empty() {
            return Err(MetaplexError::Uninitialized.into());
        }
        assert_owned_by(whitelisted_creator_info, program_id)?;
    }
    assert_owned_by(store_info, program_id)?;
    assert_owned_by(safety_deposit_box_info, &store.token_vault_program)?;
    assert_owned_by(safety_deposit_box_token_store_info, &store.token_program)?;
    assert_owned_by(vault_info, &store.token_vault_program)?;
    // is it the right vault, safety deposit, and token store?
    assert_store_safety_vault_manager_match(
        &auction_manager.vault,
        &safety_deposit_box_info,
        vault_info,
        &store.token_vault_program,
    )?;

    // do the vault and store belong to this AM?
    if auction_manager.store != *store_info.key {
        return Err(MetaplexError::AuctionManagerStoreMismatch.into());
    }

    if auction_manager.vault != *vault_info.key {
        return Err(MetaplexError::AuctionManagerVaultMismatch.into());
    }
    // Check creators
    assert_at_least_one_creator_matches_or_store_public_and_all_verified(
        program_id,
        &auction_manager,
        &open_edition_metadata,
        whitelisted_creator_info,
        store_info,
    )?;

    // Make sure master edition is the right master edition for this metadata given
    assert_derivation(
        &store.token_metadata_program,
        open_master_edition_info,
        &[
            mpl_token_metadata::state::PREFIX.as_bytes(),
            store.token_metadata_program.as_ref(),
            &open_edition_metadata.mint.as_ref(),
            mpl_token_metadata::state::EDITION.as_bytes(),
        ],
    )?;

    // Assert the holding account for authorization tokens is rent filled, owned correctly, and ours
    assert_owned_by(
        printing_authorization_token_account_info,
        &store.token_program,
    )?;
    assert_rent_exempt(rent, printing_authorization_token_account_info)?;

    if printing_token_account.owner != *auction_manager_info.key {
        return Err(MetaplexError::IncorrectOwner.into());
    }

    if printing_token_account.mint != master_edition.printing_mint {
        return Err(MetaplexError::PrintingTokenAccountMintMismatch.into());
    }

    if printing_token_account.delegate != COption::None {
        return Err(MetaplexError::DelegateShouldBeNone.into());
    }

    if printing_token_account.close_authority != COption::None {
        return Err(MetaplexError::CloseAuthorityShouldBeNone.into());
    }

    if master_edition.max_supply.is_some() {
        return Err(MetaplexError::CantUseLimitedSupplyEditionsWithOpenEditionAuction.into());
    }

    if master_edition.one_time_printing_authorization_mint != safety_deposit_token_store.mint {
        return Err(MetaplexError::MasterEditionOneTimeAuthorizationMintMismatch.into());
    }

    if let Some(participation_config) = &auction_manager.settings.participation_config {
        if participation_config.safety_deposit_box_index > vault.token_type_count {
            return Err(MetaplexError::InvalidSafetyDepositBox.into());
        }

        if participation_config.safety_deposit_box_index != safety_deposit.order {
            return Err(MetaplexError::SafetyDepositIndexMismatch.into());
        }

        if let Some(state) = auction_manager.state.participation_state {
            if state.validated {
                return Err(MetaplexError::AlreadyValidated.into());
            }

            auction_manager.state.participation_state = Some(ParticipationStateV1 {
                collected_to_accept_payment: state.collected_to_accept_payment,
                primary_sale_happened: open_edition_metadata.primary_sale_happened,
                validated: true,
                printing_authorization_token_account: Some(
                    *printing_authorization_token_account_info.key,
                ),
            });
        }

        if auction_manager.settings.winning_configs.is_empty() {
            auction_manager.state.status = AuctionManagerStatus::Validated;
        }
        auction_manager.serialize(&mut *auction_manager_info.data.borrow_mut())?;
    }

    Ok(())
}
