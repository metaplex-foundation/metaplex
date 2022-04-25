use super::validate_safety_deposit_box_v2::{
    assert_common_checks, assert_supply_logic_check, CommonCheckArgs, SupplyLogicCheckArgs,
};
use crate::{
    deprecated_state::{
        AuctionManagerV1, ParticipationStateV1, SafetyDepositValidationTicket,
        MAX_VALIDATION_TICKET_SIZE,
    },
    error::MetaplexError,
    state::{AuctionManagerStatus, Key, Store, WinningConfigType, PREFIX},
    utils::{assert_derivation, assert_initialized, create_or_allocate_account_raw},
};
use borsh::BorshSerialize;
use mpl_token_metadata::state::Metadata;
use mpl_token_vault::state::{SafetyDepositBox, Vault};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    pubkey::Pubkey,
};
use spl_token::state::Account;
pub fn make_safety_deposit_validation<'a>(
    program_id: &Pubkey,
    auction_manager_info: &AccountInfo<'a>,
    safety_deposit_info: &AccountInfo<'a>,
    safety_deposit_validation_ticket_info: &AccountInfo<'a>,
    payer_info: &AccountInfo<'a>,
    rent_info: &AccountInfo<'a>,
    system_info: &AccountInfo<'a>,
) -> ProgramResult {
    let bump = assert_derivation(
        program_id,
        safety_deposit_validation_ticket_info,
        &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            auction_manager_info.key.as_ref(),
            safety_deposit_info.key.as_ref(),
        ],
    )?;

    create_or_allocate_account_raw(
        *program_id,
        safety_deposit_validation_ticket_info,
        rent_info,
        system_info,
        payer_info,
        MAX_VALIDATION_TICKET_SIZE,
        &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            auction_manager_info.key.as_ref(),
            safety_deposit_info.key.as_ref(),
            &[bump],
        ],
    )?;

    let mut validation =
        SafetyDepositValidationTicket::from_account_info(safety_deposit_validation_ticket_info)?;
    validation.key = Key::SafetyDepositValidationTicketV1;
    validation.address = *safety_deposit_info.key;
    validation.serialize(&mut *safety_deposit_validation_ticket_info.data.borrow_mut())?;

    Ok(())
}

pub fn process_deprecated_validate_safety_deposit_box_v1<'a>(
    program_id: &'a Pubkey,
    accounts: &'a [AccountInfo<'a>],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let safety_deposit_validation_ticket_info = next_account_info(account_info_iter)?;
    let auction_manager_info = next_account_info(account_info_iter)?;
    let metadata_info = next_account_info(account_info_iter)?;
    let original_authority_lookup_info = next_account_info(account_info_iter)?;
    let whitelisted_creator_info = next_account_info(account_info_iter)?;
    let auction_manager_store_info = next_account_info(account_info_iter)?;
    let safety_deposit_info = next_account_info(account_info_iter)?;
    let safety_deposit_token_store_info = next_account_info(account_info_iter)?;
    let mint_info = next_account_info(account_info_iter)?;
    let edition_info = next_account_info(account_info_iter)?;
    let vault_info = next_account_info(account_info_iter)?;
    let authority_info = next_account_info(account_info_iter)?;
    let metadata_authority_info = next_account_info(account_info_iter)?;
    let payer_info = next_account_info(account_info_iter)?;
    let token_metadata_program_info = next_account_info(account_info_iter)?;
    let system_info = next_account_info(account_info_iter)?;
    let rent_info = next_account_info(account_info_iter)?;

    if !safety_deposit_validation_ticket_info.data_is_empty() {
        return Err(MetaplexError::AlreadyValidated.into());
    }

    let mut auction_manager = AuctionManagerV1::from_account_info(auction_manager_info)?;
    let safety_deposit = SafetyDepositBox::from_account_info(safety_deposit_info)?;
    let _safety_deposit_token_store: Account = assert_initialized(safety_deposit_token_store_info)?;
    let metadata = Metadata::from_account_info(metadata_info)?;
    let store = Store::from_account_info(auction_manager_store_info)?;
    // Is it a real vault?
    let vault = Vault::from_account_info(vault_info)?;

    let mut total_amount_requested: u64 = 0;
    // At this point we know we have at least one config and they may have different amounts but all
    // point at the same safety deposit box and so have the same winning config type.
    // We default to TokenOnlyTransfer but this will get set by the loop.
    let mut winning_config_type: WinningConfigType = WinningConfigType::TokenOnlyTransfer;
    let mut winning_config_items_validated: u8 = 0;
    let mut all_winning_config_items: u8 = 0;

    for i in 0..auction_manager.settings.winning_configs.len() {
        let possible_config = &auction_manager.settings.winning_configs[i];

        for j in 0..possible_config.items.len() {
            let possible_item = &possible_config.items[j];
            all_winning_config_items = all_winning_config_items
                .checked_add(1)
                .ok_or(MetaplexError::NumericalOverflowError)?;

            if possible_item.safety_deposit_box_index == safety_deposit.order {
                winning_config_type = possible_item.winning_config_type;

                winning_config_items_validated = winning_config_items_validated
                    .checked_add(1)
                    .ok_or(MetaplexError::NumericalOverflowError)?;

                // Build array to sum total amount
                total_amount_requested = total_amount_requested
                    .checked_add(possible_item.amount.into())
                    .ok_or(MetaplexError::NumericalOverflowError)?;
                // Record that primary sale happened at time of validation for later royalties reconcilation
                auction_manager.state.winning_config_states[i].items[j].primary_sale_happened =
                    metadata.primary_sale_happened;
            }
        }
    }

    if let Some(participation_config) = &auction_manager.settings.participation_config {
        if participation_config.safety_deposit_box_index == safety_deposit.order {
            // Really it's unknown how many prints will be made
            // but we set it to 1 since that's how many master edition tokens are in there.
            total_amount_requested = total_amount_requested
                .checked_add(1)
                .ok_or(MetaplexError::NumericalOverflowError)?;

            // now that participation configs can be validated through normal safety deposit endpoints, need to flip this boolean
            // here too, until we can deprecate it later.
            if let Some(state) = &auction_manager.state.participation_state {
                auction_manager.state.participation_state = Some(ParticipationStateV1 {
                    collected_to_accept_payment: state.collected_to_accept_payment,
                    primary_sale_happened: state.primary_sale_happened,
                    validated: true,
                    printing_authorization_token_account: state
                        .printing_authorization_token_account,
                })
            }
        }
    }

    if total_amount_requested == 0 {
        return Err(MetaplexError::SafetyDepositBoxNotUsedInAuction.into());
    }

    assert_common_checks(CommonCheckArgs {
        program_id,
        auction_manager_info,
        metadata_info,
        original_authority_lookup_info,
        whitelisted_creator_info,
        safety_deposit_info,
        safety_deposit_token_store_info,
        edition_info,
        vault_info,
        mint_info,
        token_metadata_program_info,
        auction_manager_store_info,
        authority_info,
        store: &store,
        auction_manager: &auction_manager,
        metadata: &metadata,
        safety_deposit: &safety_deposit,
        vault: &vault,
        winning_config_type: &winning_config_type,
    })?;

    assert_supply_logic_check(SupplyLogicCheckArgs {
        program_id,
        auction_manager_info,
        metadata_info,
        edition_info,
        metadata_authority_info,
        original_authority_lookup_info,
        rent_info,
        system_info,
        payer_info,
        token_metadata_program_info,
        auction_manager: &auction_manager,
        winning_config_type: &winning_config_type,
        metadata: &metadata,
        safety_deposit: &safety_deposit,
        store: &store,
        safety_deposit_token_store_info,
        total_amount_requested,
    })?;

    auction_manager.state.winning_config_items_validated = match auction_manager
        .state
        .winning_config_items_validated
        .checked_add(winning_config_items_validated)
    {
        Some(val) => val,
        None => return Err(MetaplexError::NumericalOverflowError.into()),
    };

    if auction_manager.state.winning_config_items_validated == all_winning_config_items {
        let mut participation_okay = true;
        if let Some(state) = &auction_manager.state.participation_state {
            participation_okay = state.validated
        }
        if participation_okay {
            auction_manager.state.status = AuctionManagerStatus::Validated
        }
    }

    auction_manager.serialize(&mut *auction_manager_info.data.borrow_mut())?;

    make_safety_deposit_validation(
        program_id,
        auction_manager_info,
        safety_deposit_info,
        safety_deposit_validation_ticket_info,
        payer_info,
        rent_info,
        system_info,
    )?;

    Ok(())
}
