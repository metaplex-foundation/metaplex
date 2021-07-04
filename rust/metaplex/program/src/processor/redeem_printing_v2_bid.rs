use {
    crate::{
        error::MetaplexError,
        state::{
            Key, PrizeTrackingTicket, WinningConfigType, MAX_PRIZE_TRACKING_TICKET_SIZE, PREFIX,
        },
        utils::{
            assert_derivation, assert_owned_by, common_redeem_checks, common_redeem_finish,
            common_winning_config_checks, create_or_allocate_account_raw, CommonRedeemCheckArgs,
            CommonRedeemFinishArgs, CommonRedeemReturn, CommonWinningConfigCheckReturn,
        },
    },
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        entrypoint::ProgramResult,
        pubkey::Pubkey,
    },
    spl_token_metadata::{
        instruction::mint_new_edition_from_master_edition_via_token,
        state::{get_master_edition, Metadata},
    },
    spl_token_vault::state::SafetyDepositBox,
};
pub fn process_redeem_printing_v2_bid<'a>(
    program_id: &'a Pubkey,
    accounts: &'a [AccountInfo<'a>],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let auction_manager_info = next_account_info(account_info_iter)?;
    let safety_deposit_token_store_info = next_account_info(account_info_iter)?;
    let destination_info = next_account_info(account_info_iter)?;
    let bid_redemption_info = next_account_info(account_info_iter)?;
    let safety_deposit_info = next_account_info(account_info_iter)?;
    let vault_info = next_account_info(account_info_iter)?;
    let _fraction_mint_info = next_account_info(account_info_iter)?;
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

    let prize_tracking_ticket_info = next_account_info(account_info_iter)?;
    let new_metadata_account_info = next_account_info(account_info_iter)?;
    let new_edition_account_info = next_account_info(account_info_iter)?;
    let master_edition_account_info = next_account_info(account_info_iter)?;
    let mint_info = next_account_info(account_info_iter)?;
    let edition_marker_info = next_account_info(account_info_iter)?;
    let mint_authority_info = next_account_info(account_info_iter)?;
    let metadata_account_info = next_account_info(account_info_iter)?;
    let vault_authority_info = next_account_info(account_info_iter)?;

    let metadata = Metadata::from_account_info(metadata_account_info)?;

    let bump = assert_derivation(
        program_id,
        prize_tracking_ticket_info,
        &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            auction_manager_info.key.as_ref(),
            metadata.mint.as_ref(),
        ],
    )?;

    assert_derivation(
        token_vault_program_info.key,
        vault_authority_info,
        &[
            spl_token_vault::state::PREFIX.as_bytes(),
            token_vault_program_info.key.as_ref(),
            vault_info.key.as_ref(),
        ],
    )?;

    let CommonRedeemReturn {
        auction_manager,
        redemption_bump_seed,
        bidder_metadata,
        auction: _a,
        rent: _rent,
        win_index,
        token_metadata_program,
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
        store_info,
        rent_info,
        is_participation: false,
        overwrite_win_index: None,
        assert_bidder_signer: false,
    })?;

    assert_owned_by(metadata_account_info, &token_metadata_program)?;

    let mut winning_item_index = None;
    if !bidder_metadata.cancelled {
        if let Some(winning_index) = win_index {
            if winning_index < auction_manager.settings.winning_configs.len() {
                let CommonWinningConfigCheckReturn {
                    winning_config_item,
                    winning_item_index: wii,
                } = common_winning_config_checks(
                    &auction_manager,
                    &safety_deposit_info,
                    winning_index,
                )?;

                winning_item_index = wii;

                if winning_config_item.winning_config_type != WinningConfigType::PrintingV2 {
                    return Err(MetaplexError::WrongBidEndpointForPrize.into());
                }

                let master_edition = get_master_edition(master_edition_account_info)?;

                let mut prize_tracking_ticket: PrizeTrackingTicket;
                if prize_tracking_ticket_info.data_is_empty() {
                    create_or_allocate_account_raw(
                        *program_id,
                        store_info,
                        rent_info,
                        system_info,
                        payer_info,
                        MAX_PRIZE_TRACKING_TICKET_SIZE,
                        &[
                            PREFIX.as_bytes(),
                            program_id.as_ref(),
                            auction_manager_info.key.as_ref(),
                            metadata.mint.as_ref(),
                            &[bump],
                        ],
                    )?;
                    let safety_deposit_box =
                        SafetyDepositBox::from_account_info(safety_deposit_info)?;
                    prize_tracking_ticket =
                        PrizeTrackingTicket::from_account_info(prize_tracking_ticket_info)?;
                    prize_tracking_ticket.key = Key::PrizeTrackingTicketV1;
                    prize_tracking_ticket.metadata = *metadata_account_info.key;
                    prize_tracking_ticket.supply_snapshot = master_edition.supply();
                    prize_tracking_ticket.redemptions = 0;
                    prize_tracking_ticket.expected_redemptions = auction_manager
                        .settings
                        .winning_configs
                        .iter()
                        .map(|c| {
                            c.items
                                .iter()
                                .map(|i| {
                                    if i.safety_deposit_box_index == safety_deposit_box.order {
                                        return i.amount as u64;
                                    } else {
                                        return 0 as u64;
                                    }
                                })
                                .sum()
                        })
                        .sum()
                } else {
                    prize_tracking_ticket =
                        PrizeTrackingTicket::from_account_info(prize_tracking_ticket_info)?;
                    prize_tracking_ticket.redemptions = prize_tracking_ticket
                        .redemptions
                        .checked_add(1)
                        .ok_or(MetaplexError::NumericalOverflowError)?
                }

                mint_new_edition_from_master_edition_via_token(
                    *token_metadata_program_info.key,
                    *new_metadata_account_info.key,
                    *new_edition_account_info.key,
                    *master_edition_account_info.key,
                    *mint_info.key,
                    *mint_authority_info.key,
                    *payer_info.key,
                    *vault_authority_info.key,
                    *safety_deposit_token_store_info.key,
                    *bidder_info.key,
                    *metadata_account_info.key,
                    metadata.mint,
                    master_edition.supply(),
                )?;
            }
        }
    };

    common_redeem_finish(CommonRedeemFinishArgs {
        program_id,
        auction_manager,
        auction_manager_info,
        bidder_metadata_info,
        rent_info,
        system_info,
        payer_info,
        bid_redemption_info,
        redemption_bump_seed,
        winning_index: win_index,
        bid_redeemed: true,
        participation_redeemed: false,
        winning_item_index,
        overwrite_win_index: None,
    })?;

    Ok(())
}
