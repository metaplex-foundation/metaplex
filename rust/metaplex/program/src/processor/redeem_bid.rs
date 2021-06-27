use {
    crate::{
        error::MetaplexError,
        state::{AuctionManager, WinningConfigItem, WinningConfigType, PREFIX},
        utils::{
            assert_derivation, common_redeem_checks, common_redeem_finish,
            common_winning_config_checks, transfer_safety_deposit_box_items, CommonRedeemCheckArgs,
            CommonRedeemFinishArgs, CommonRedeemReturn, CommonWinningConfigCheckReturn,
        },
    },
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        entrypoint::ProgramResult,
        program::invoke_signed,
        pubkey::Pubkey,
    },
    spl_auction::processor::AuctionData,
    spl_token_metadata::{
        instruction::set_reservation_list,
        state::{get_reservation_list, Reservation},
    },
};

fn set_reservation_list_wrapper<'a>(
    program_id: &'a Pubkey,
    master_edition_info: &AccountInfo<'a>,
    reservation_list_info: &AccountInfo<'a>,
    auction_manager_info: &AccountInfo<'a>,
    signer_seeds: &[&[u8]],
    reservations: Vec<Reservation>,
    total_reservation_spots: Option<u64>,
    offset: u64,
    total_spot_offset: u64,
) -> ProgramResult {
    invoke_signed(
        &set_reservation_list(
            *program_id,
            *master_edition_info.key,
            *reservation_list_info.key,
            *auction_manager_info.key,
            reservations,
            total_reservation_spots,
            offset,
            total_spot_offset,
        ),
        &[
            master_edition_info.clone(),
            reservation_list_info.clone(),
            auction_manager_info.clone(),
        ],
        &[&signer_seeds],
    )?;

    Ok(())
}

pub fn calc_spots(
    winning_config_item: &WinningConfigItem,
    auction_manager: &AuctionManager,
    n: usize,
) -> u64 {
    auction_manager.settings.winning_configs[n]
        .items
        .iter()
        .filter(|i| i.safety_deposit_box_index == winning_config_item.safety_deposit_box_index)
        .map(|i| i.amount as u64)
        .sum()
}

#[allow(clippy::too_many_arguments)]
pub fn reserve_list_if_needed<'a>(
    program_id: &'a Pubkey,
    auction_manager: &AuctionManager,
    auction: &AuctionData,
    winning_config_item: &WinningConfigItem,
    winning_index: usize,
    bidder_info: &AccountInfo<'a>,
    master_edition_info: &AccountInfo<'a>,
    reservation_list_info: &AccountInfo<'a>,
    auction_manager_info: &AccountInfo<'a>,
    signer_seeds: &[&[u8]],
) -> ProgramResult {
    let reservation_list = get_reservation_list(reservation_list_info)?;

    let total_reservation_spot_opt: Option<u64>;

    // Auction specifically does not expose internal state workings as it may change someday,
    // but it does expose a point get-winner-at-index method. Right now this is just array access
    // but may be invocation someday. It's inefficient style but better for the interface maintenance
    // in the long run if we move to better storage solutions (so that this action doesnt need to change if
    // storage does.)

    let mut total_reservation_spots: u64 = 0;
    let mut total_spot_offset: u64 = 0;
    for n in 0..auction_manager.settings.winning_configs.len() {
        match auction.winner_at(n) {
            Some(_) => {
                let spots: u64 = calc_spots(winning_config_item, auction_manager, n);
                total_reservation_spots = total_reservation_spots
                    .checked_add(spots)
                    .ok_or(MetaplexError::NumericalOverflowError)?;
                if n < winning_index {
                    total_spot_offset = total_spot_offset
                        .checked_add(spots)
                        .ok_or(MetaplexError::NumericalOverflowError)?;
                }
            }
            None => break,
        }
    }

    if reservation_list.supply_snapshot().is_none() {
        total_reservation_spot_opt = Some(total_reservation_spots)
    } else {
        total_reservation_spot_opt = None
    }

    let my_spots: u64 = calc_spots(winning_config_item, auction_manager, winning_index);
    set_reservation_list_wrapper(
        program_id,
        master_edition_info,
        reservation_list_info,
        auction_manager_info,
        signer_seeds,
        vec![Reservation {
            address: *bidder_info.key,
            spots_remaining: my_spots,
            total_spots: my_spots,
        }],
        total_reservation_spot_opt,
        winning_index as u64,
        total_spot_offset,
    )?;

    Ok(())
}
pub fn process_redeem_bid<'a>(
    program_id: &'a Pubkey,
    accounts: &'a [AccountInfo<'a>],
    // If present, means an auctioneer is collecting this bid and we should disregard bidder metadata
    // and just collect the prize. Can only be set through an inner call with redeem_unused_winning_config_items.
    overwrite_win_index: Option<usize>,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let auction_manager_info = next_account_info(account_info_iter)?;
    let safety_deposit_token_store_info = next_account_info(account_info_iter)?;
    let destination_info = next_account_info(account_info_iter)?;
    let bid_redemption_info = next_account_info(account_info_iter)?;
    let safety_deposit_info = next_account_info(account_info_iter)?;
    let vault_info = next_account_info(account_info_iter)?;
    let fraction_mint_info = next_account_info(account_info_iter)?;
    let auction_info = next_account_info(account_info_iter)?;
    let bidder_metadata_info = next_account_info(account_info_iter)?;
    let bidder_info = next_account_info(account_info_iter)?;
    let payer_info = next_account_info(account_info_iter)?;
    let token_program_info = next_account_info(account_info_iter)?;
    let token_vault_program_info = next_account_info(account_info_iter)?;
    let token_metadata_program_info = next_account_info(account_info_iter)?;
    let store_info = next_account_info(account_info_iter)?;
    let system_info = next_account_info(account_info_iter)?;
    let rent_info = next_account_info(account_info_iter)?;

    let transfer_authority_info = next_account_info(account_info_iter)?;

    let CommonRedeemReturn {
        auction_manager,
        redemption_bump_seed,
        bidder_metadata,
        auction,
        rent: _rent,
        win_index,
        token_metadata_program: _t,
    } = common_redeem_checks(CommonRedeemCheckArgs {
        program_id,
        auction_manager_info,
        safety_deposit_token_store_info,
        destination_info,
        bid_redemption_info,
        safety_deposit_info,
        vault_info,
        auction_info,
        bidder_metadata_info,
        bidder_info,
        token_program_info,
        token_vault_program_info,
        token_metadata_program_info,
        rent_info,
        store_info,
        is_participation: false,
        overwrite_win_index,
    })?;

    let mut winning_item_index = None;
    if !bidder_metadata.cancelled {
        if let Some(winning_index) = win_index {
            if winning_index < auction_manager.settings.winning_configs.len() {
                // Okay, so they placed in the auction winning prizes section!

                let CommonWinningConfigCheckReturn {
                    winning_config_item,
                    winning_item_index: wii,
                } = common_winning_config_checks(
                    &auction_manager,
                    &safety_deposit_info,
                    winning_index,
                )?;
                winning_item_index = wii;
                if winning_config_item.winning_config_type != WinningConfigType::TokenOnlyTransfer
                    && winning_config_item.winning_config_type != WinningConfigType::Printing
                {
                    return Err(MetaplexError::WrongBidEndpointForPrize.into());
                }

                let auction_bump_seed = assert_derivation(
                    program_id,
                    auction_manager_info,
                    &[PREFIX.as_bytes(), &auction_manager.auction.as_ref()],
                )?;

                let auction_auth_seeds = &[
                    PREFIX.as_bytes(),
                    &auction_manager.auction.as_ref(),
                    &[auction_bump_seed],
                ];

                if winning_config_item.winning_config_type == WinningConfigType::Printing {
                    let master_edition_info = next_account_info(account_info_iter)?;
                    let reservation_list_info = next_account_info(account_info_iter)?;

                    reserve_list_if_needed(
                        token_metadata_program_info.key,
                        &auction_manager,
                        &auction,
                        &winning_config_item,
                        winning_index,
                        bidder_info,
                        master_edition_info,
                        reservation_list_info,
                        auction_manager_info,
                        auction_auth_seeds,
                    )?;
                }

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
                    winning_config_item.amount as u64,
                    auction_auth_seeds,
                )?;
            }
        }
    }

    common_redeem_finish(CommonRedeemFinishArgs {
        program_id,
        auction_manager,
        auction_manager_info,
        bidder_metadata_info,
        rent_info,
        system_info,
        payer_info,
        bid_redemption_info,
        winning_index: win_index,
        redemption_bump_seed,
        bid_redeemed: true,
        participation_redeemed: false,
        winning_item_index,
        overwrite_win_index,
    })?;
    Ok(())
}
