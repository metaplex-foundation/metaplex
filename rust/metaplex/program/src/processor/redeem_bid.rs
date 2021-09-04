use {
    crate::{
        error::MetaplexError,
        state::{CommonWinningIndexChecks, CommonWinningIndexReturn, WinningConfigType, PREFIX},
        utils::{
            assert_derivation, common_redeem_checks, common_redeem_finish,
            get_amount_from_token_account, transfer_safety_deposit_box_items,
            CommonRedeemCheckArgs, CommonRedeemFinishArgs, CommonRedeemReturn,
        },
    },
    arrayref::array_ref,
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        entrypoint::ProgramResult,
        program::invoke_signed,
        program_error::ProgramError,
        pubkey::Pubkey,
    },
    spl_auction::processor::AuctionData,
    spl_token_metadata::{
        deprecated_instruction::deprecated_set_reservation_list, state::Reservation,
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
        &deprecated_set_reservation_list(
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

fn get_supply_snapshot_off_reservation_list(
    reservation_list_info: &AccountInfo,
) -> Result<Option<u64>, ProgramError> {
    let data = reservation_list_info.try_borrow_data()?;
    // this is an option, 9 bytes, first is 0 means is none
    if data[33] == 0 {
        Ok(None)
    } else {
        let amount_data = array_ref![data, 34, 8];
        Ok(Some(u64::from_le_bytes(*amount_data)))
    }
}

#[allow(clippy::too_many_arguments)]
pub fn reserve_list_if_needed<'a>(
    program_id: &'a Pubkey,
    winning_index: usize,
    auction_info: &AccountInfo<'a>,
    bidder_info: &AccountInfo<'a>,
    master_edition_info: &AccountInfo<'a>,
    reservation_list_info: &AccountInfo<'a>,
    auction_manager_info: &AccountInfo<'a>,
    safety_deposit_token_store_info: &AccountInfo<'a>,
    signer_seeds: &[&[u8]],
) -> ProgramResult {
    let total_reservation_spot_opt: Option<u64>;

    // This math will explicitly be off in custom cases where you are giving away multiple editions to a single
    // person. However these are rare. This optimization will literally break this case because
    // there will be fewer reservation spots than those available. However I'm switching to it
    // because we need to support those 50 person legacy auctions out there which are mostly limited editions
    // and get them redeemed so we can move to the newer system which works.

    let total_spot_offset: u64 = winning_index as u64;

    if get_supply_snapshot_off_reservation_list(reservation_list_info)?.is_none() {
        total_reservation_spot_opt = Some(std::cmp::min(
            get_amount_from_token_account(safety_deposit_token_store_info)?,
            AuctionData::get_num_winners(auction_info) as u64,
        ));
    } else {
        total_reservation_spot_opt = None
    }

    let my_spots: u64 = 1;

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
        // Note this logic is explicitly wrong in cases of tiered auctions where the edition
        // is not present in every single winning config. But that would require iteration to figure out,
        // and we are optimizing for the 99.8% case in this legacy logic.
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

    let safety_deposit_config_info = next_account_info(account_info_iter).ok();

    let CommonRedeemReturn {
        auction_manager,
        redemption_bump_seed,
        cancelled,
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
        safety_deposit_config_info,
        is_participation: false,
        user_provided_win_index: None,
        overwrite_win_index,
        assert_bidder_signer: true,
        ignore_bid_redeemed_item_check: false,
    })?;

    let mut winning_item_index = None;
    if !cancelled {
        if let Some(winning_index) = win_index {
            // Okay, so they placed in the auction winning prizes section!

            let CommonWinningIndexReturn {
                amount,
                winning_config_type,
                winning_config_item_index,
            } = auction_manager.common_winning_index_checks(CommonWinningIndexChecks {
                safety_deposit_info,
                winning_index,
                auction_manager_v1_ignore_claim: false,
                safety_deposit_config_info,
            })?;

            winning_item_index = winning_config_item_index;
            if winning_config_type != WinningConfigType::TokenOnlyTransfer
                && winning_config_type != WinningConfigType::PrintingV1
            {
                return Err(MetaplexError::WrongBidEndpointForPrize.into());
            }

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

            if winning_config_type == WinningConfigType::PrintingV1 && overwrite_win_index.is_none()
            {
                let master_edition_info = match safety_deposit_config_info {
                    Some(val) => val,
                    None => return Err(ProgramError::NotEnoughAccountKeys),
                };
                let reservation_list_info = next_account_info(account_info_iter)?;

                reserve_list_if_needed(
                    token_metadata_program_info.key,
                    winning_index,
                    auction_info,
                    bidder_info,
                    master_edition_info,
                    reservation_list_info,
                    auction_manager_info,
                    safety_deposit_token_store_info,
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
                amount as u64,
                auction_auth_seeds,
            )?;
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
        safety_deposit_config_info,
        vault_info,
        winning_index: win_index,
        redemption_bump_seed,
        bid_redeemed: true,
        participation_redeemed: false,
        winning_item_index,
        overwrite_win_index,
    })?;
    Ok(())
}
