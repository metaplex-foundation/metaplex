use {
    crate::{
        error::MetaplexError,
        state::{WinningConfigType, PREFIX},
        utils::{
            assert_owned_by, common_redeem_checks, common_redeem_finish,
            common_winning_config_checks, transfer_metadata_ownership,
            transfer_safety_deposit_box_items, CommonRedeemCheckArgs, CommonRedeemFinishArgs,
            CommonRedeemReturn, CommonWinningConfigCheckReturn,
        },
    },
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        entrypoint::ProgramResult,
        pubkey::Pubkey,
    },
};
pub fn process_full_rights_transfer_bid<'a>(
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

    let metadata_info = next_account_info(account_info_iter)?;
    let new_metadata_authority_info = next_account_info(account_info_iter)?;
    let transfer_authority_info = next_account_info(account_info_iter)?;

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
        overwrite_win_index,
    })?;

    assert_owned_by(metadata_info, &token_metadata_program)?;

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

                if winning_config_item.winning_config_type != WinningConfigType::FullRightsTransfer
                {
                    return Err(MetaplexError::WrongBidEndpointForPrize.into());
                }
                // Someone is selling off their master edition. We need to transfer it, as well as ownership of their
                // metadata.

                let auction_seeds = &[PREFIX.as_bytes(), &auction_manager.auction.as_ref()];
                let (_, auction_bump_seed) =
                    Pubkey::find_program_address(auction_seeds, &program_id);
                let auction_authority_seeds = &[
                    PREFIX.as_bytes(),
                    &auction_manager.auction.as_ref(),
                    &[auction_bump_seed],
                ];

                transfer_metadata_ownership(
                    token_metadata_program_info.clone(),
                    metadata_info.clone(),
                    auction_manager_info.clone(),
                    new_metadata_authority_info.clone(),
                    auction_authority_seeds,
                )?;

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
                    auction_authority_seeds,
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
        overwrite_win_index,
    })?;

    Ok(())
}
