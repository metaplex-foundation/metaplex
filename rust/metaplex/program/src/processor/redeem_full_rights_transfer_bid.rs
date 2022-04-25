use crate::{
    error::MetaplexError,
    state::{CommonWinningIndexChecks, CommonWinningIndexReturn, WinningConfigType, PREFIX},
    utils::{
        assert_owned_by, common_redeem_checks, common_redeem_finish, transfer_metadata_ownership,
        transfer_safety_deposit_box_items, CommonRedeemCheckArgs, CommonRedeemFinishArgs,
        CommonRedeemReturn,
    },
};
use mpl_token_metadata::state::Metadata;
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    pubkey::Pubkey,
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

    let safety_deposit_config_info = next_account_info(account_info_iter).ok();
    let auction_extended_info = next_account_info(account_info_iter).ok();

    let CommonRedeemReturn {
        auction_manager,
        redemption_bump_seed,
        cancelled,
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
        auction_extended_info,
        bidder_metadata_info,
        bidder_info,
        token_program_info,
        token_vault_program_info,
        token_metadata_program_info,
        store_info,
        rent_info,
        safety_deposit_config_info,
        is_participation: false,
        user_provided_win_index: None,
        overwrite_win_index,
        assert_bidder_signer: true,
        ignore_bid_redeemed_item_check: false,
    })?;

    assert_owned_by(metadata_info, &token_metadata_program)?;

    let mut winning_item_index = None;
    if !cancelled {
        if let Some(winning_index) = win_index {
            let CommonWinningIndexReturn {
                amount: _a,
                winning_config_type,
                winning_config_item_index,
            } = auction_manager.common_winning_index_checks(CommonWinningIndexChecks {
                safety_deposit_info,
                winning_index,
                auction_manager_v1_ignore_claim: false,
                safety_deposit_config_info,
            })?;

            winning_item_index = winning_config_item_index;

            if winning_config_type != WinningConfigType::FullRightsTransfer {
                return Err(MetaplexError::WrongBidEndpointForPrize.into());
            }
            // Someone is selling off their master edition. We need to transfer it, as well as ownership of their
            // metadata.

            let auction_key = auction_manager.auction();
            let auction_seeds = &[PREFIX.as_bytes(), auction_key.as_ref()];
            let (_, auction_bump_seed) = Pubkey::find_program_address(auction_seeds, &program_id);
            let auction_authority_seeds = &[
                PREFIX.as_bytes(),
                auction_key.as_ref(),
                &[auction_bump_seed],
            ];

            let metadata = Metadata::from_account_info(metadata_info)?;
            if metadata.update_authority == *auction_manager_info.key {
                // If this is a call for a broken auction manager that was forced to disbursing
                // by a distressed auctioneer, the metadata transfer may not have happened, so
                // we wrap in an if statement to avoid a fallout here.
                msg!("Transferring metadata authority!");
                transfer_metadata_ownership(
                    token_metadata_program_info.clone(),
                    metadata_info.clone(),
                    auction_manager_info.clone(),
                    new_metadata_authority_info.clone(),
                    auction_authority_seeds,
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
                1,
                auction_authority_seeds,
            )?;
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
        vault_info,
        safety_deposit_config_info,
        winning_index: win_index,
        bid_redeemed: true,
        participation_redeemed: false,
        winning_item_index,
        overwrite_win_index,
    })?;

    Ok(())
}
