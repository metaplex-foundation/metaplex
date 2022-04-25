use crate::{
    error::MetaplexError,
    state::{get_auction_manager, PrizeTrackingTicket, Store, PREFIX},
    utils::{
        assert_derivation, assert_is_ata, assert_owned_by, assert_rent_exempt,
        assert_safety_deposit_config_valid, assert_store_safety_vault_manager_match,
        transfer_safety_deposit_box_items,
    },
};
use mpl_auction::processor::{AuctionData, AuctionDataExtended, AuctionState};
use mpl_token_vault::state::SafetyDepositBox;
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    pubkey::Pubkey,
    rent::Rent,
    sysvar::Sysvar,
};

pub fn process_withdraw_master_edition<'a>(
    program_id: &'a Pubkey,
    accounts: &'a [AccountInfo<'a>],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let auction_manager_info = next_account_info(account_info_iter)?;
    let safety_deposit_token_store_info = next_account_info(account_info_iter)?;
    let destination_info = next_account_info(account_info_iter)?;
    let safety_deposit_info = next_account_info(account_info_iter)?;
    let vault_info = next_account_info(account_info_iter)?;
    let fraction_mint_info = next_account_info(account_info_iter)?;
    let prize_tracking_ticket_info = next_account_info(account_info_iter)?;
    let transfer_authority_info = next_account_info(account_info_iter)?;
    let auction_info = next_account_info(account_info_iter)?;
    let auction_extended_info = next_account_info(account_info_iter)?;
    let token_program_info = next_account_info(account_info_iter)?;
    let token_vault_program_info = next_account_info(account_info_iter)?;
    let store_info = next_account_info(account_info_iter)?;
    let rent_info = next_account_info(account_info_iter)?;
    let safety_deposit_config_info = next_account_info(account_info_iter).ok();

    let rent = &Rent::from_account_info(&rent_info)?;

    let auction_manager = get_auction_manager(auction_manager_info)?;
    let auction = AuctionData::from_account_info(auction_info)?;
    let auction_data_extended = AuctionDataExtended::from_account_info(auction_extended_info)?;

    let store = Store::from_account_info(store_info)?;
    let safety_deposit_box = SafetyDepositBox::from_account_info(safety_deposit_info)?;

    assert_owned_by(&destination_info, token_program_info.key)?;
    assert_owned_by(&auction_manager_info, &program_id)?;
    assert_owned_by(safety_deposit_token_store_info, token_program_info.key)?;
    assert_owned_by(safety_deposit_info, token_vault_program_info.key)?;
    assert_owned_by(vault_info, token_vault_program_info.key)?;
    assert_owned_by(fraction_mint_info, token_program_info.key)?;
    assert_owned_by(auction_info, &store.auction_program)?;
    assert_owned_by(store_info, &program_id)?;

    assert_store_safety_vault_manager_match(
        &auction_manager.vault(),
        &safety_deposit_info,
        &vault_info,
        token_vault_program_info.key,
    )?;
    assert_safety_deposit_config_valid(
        program_id,
        auction_manager_info,
        safety_deposit_info,
        safety_deposit_config_info,
        &auction_manager.key(),
    )?;

    // looking out for you!
    assert_rent_exempt(rent, &destination_info)?;

    if auction_manager.auction() != *auction_info.key {
        return Err(MetaplexError::AuctionManagerAuctionMismatch.into());
    }

    assert_derivation(
        &store.auction_program,
        auction_extended_info,
        &[
            mpl_auction::PREFIX.as_bytes(),
            store.auction_program.as_ref(),
            vault_info.key.as_ref(),
            mpl_auction::EXTENDED.as_bytes(),
        ],
    )?;

    if *store_info.key != auction_manager.store() {
        return Err(MetaplexError::AuctionManagerStoreMismatch.into());
    }

    if auction.state != AuctionState::Ended {
        return Err(MetaplexError::AuctionHasNotEnded.into());
    }

    if store.token_vault_program != *token_vault_program_info.key {
        return Err(MetaplexError::AuctionManagerTokenVaultProgramMismatch.into());
    }

    if store.token_program != *token_program_info.key {
        return Err(MetaplexError::AuctionManagerTokenProgramMismatch.into());
    }

    assert_rent_exempt(rent, destination_info)?;
    assert_is_ata(
        destination_info,
        &auction_manager.authority(),
        &safety_deposit_box.token_mint,
    )?;

    if prize_tracking_ticket_info.data_is_empty() {
        // Nobody has redeemed yet, we need to figure out if SOMEONE could and if we should
        // stop a withdrawal.

        let max_bids_allowed_before_removal_is_stopped = auction_manager
            .get_max_bids_allowed_before_removal_is_stopped(
                safety_deposit_box.order as u64,
                safety_deposit_config_info,
            )?;
        if auction_data_extended.total_uncancelled_bids
            > max_bids_allowed_before_removal_is_stopped as u64
        {
            return Err(MetaplexError::NotAllBidsClaimed.into());
        }
    } else {
        assert_derivation(
            program_id,
            prize_tracking_ticket_info,
            &[
                PREFIX.as_bytes(),
                program_id.as_ref(),
                auction_manager_info.key.as_ref(),
                safety_deposit_box.token_mint.as_ref(),
            ],
        )?;
        let prize_tracking_ticket =
            PrizeTrackingTicket::from_account_info(prize_tracking_ticket_info)?;
        if prize_tracking_ticket.redemptions < prize_tracking_ticket.expected_redemptions {
            return Err(MetaplexError::NotAllBidsClaimed.into());
        }
    }

    auction_manager.assert_is_valid_master_edition_v2_safety_deposit(
        safety_deposit_box.order as u64,
        safety_deposit_config_info,
    )?;

    let auction_bump_seed = assert_derivation(
        program_id,
        auction_manager_info,
        &[PREFIX.as_bytes(), &auction_manager.auction().as_ref()],
    )?;

    let auction_key = auction_manager.auction();
    let auction_auth_seeds = &[
        PREFIX.as_bytes(),
        auction_key.as_ref(),
        &[auction_bump_seed],
    ];

    transfer_safety_deposit_box_items(
        token_vault_program_info.clone(),
        destination_info.clone(),
        safety_deposit_info.clone(),
        safety_deposit_token_store_info.clone(),
        vault_info.clone(),
        fraction_mint_info.clone(),
        auction_manager_info.clone(),
        transfer_authority_info.clone(),
        rent_info.clone(),
        1,
        auction_auth_seeds,
    )?;

    Ok(())
}
