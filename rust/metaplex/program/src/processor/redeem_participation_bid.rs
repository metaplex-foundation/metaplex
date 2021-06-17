use {
    crate::{
        error::MetaplexError,
        state::{
            NonWinningConstraint, ParticipationConfig, ParticipationState, WinningConstraint,
            PREFIX,
        },
        utils::{
            assert_initialized, assert_owned_by, common_redeem_checks, common_redeem_finish,
            spl_token_transfer, CommonRedeemCheckArgs, CommonRedeemFinishArgs, CommonRedeemReturn,
        },
    },
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        entrypoint::ProgramResult,
        pubkey::Pubkey,
    },
    spl_token::state::Account,
};

#[allow(clippy::unnecessary_cast)]
#[allow(clippy::absurd_extreme_comparisons)]
pub fn process_redeem_participation_bid<'a>(
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
    // We keep it here to keep API base identical to the other redeem calls for ease of use by callers
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
    let transfer_authority_info = next_account_info(account_info_iter)?;
    let accept_payment_info = next_account_info(account_info_iter)?;
    let bidder_token_account_info = next_account_info(account_info_iter)?;
    let participation_printing_holding_account_info = next_account_info(account_info_iter)?;

    let CommonRedeemReturn {
        mut auction_manager,
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
        is_participation: true,
        overwrite_win_index: None,
    })?;

    assert_owned_by(accept_payment_info, token_program_info.key)?;
    assert_owned_by(bidder_token_account_info, token_program_info.key)?;
    assert_owned_by(
        participation_printing_holding_account_info,
        token_program_info.key,
    )?;

    let participation_printing_account: Account =
        assert_initialized(participation_printing_holding_account_info)?;

    if participation_printing_account.amount == 0 {
        return Err(MetaplexError::ParticipationPrintingEmpty.into());
    }

    if let Some(state) = &auction_manager.state.participation_state {
        if let Some(token) = state.printing_authorization_token_account {
            if *participation_printing_holding_account_info.key != token {
                return Err(MetaplexError::PrintingAuthorizationTokenAccountMismatch.into());
            }
        }
    }

    let bidder_token: Account = assert_initialized(bidder_token_account_info)?;

    if bidder_token.mint != auction.token_mint {
        return Err(MetaplexError::AcceptPaymentMintMismatch.into());
    }

    if *accept_payment_info.key != auction_manager.accept_payment {
        return Err(MetaplexError::AcceptPaymentMismatch.into());
    }
    let config: &ParticipationConfig;
    if let Some(part_config) = &auction_manager.settings.participation_config {
        config = part_config
    } else {
        return Err(MetaplexError::NotEligibleForParticipation.into());
    }

    let mut gets_participation =
        config.non_winning_constraint != NonWinningConstraint::NoParticipationPrize;

    if !bidder_metadata.cancelled {
        if let Some(winning_index) = auction.is_winner(bidder_info.key) {
            if winning_index < auction_manager.settings.winning_configs.len() {
                // Okay, so they placed in the auction winning prizes section!
                gets_participation =
                    config.winner_constraint == WinningConstraint::ParticipationPrizeGiven;
            }
        }
    }

    if gets_participation {
        let seeds = &[PREFIX.as_bytes(), &auction_manager.auction.as_ref()];
        let (_, bump_seed) = Pubkey::find_program_address(seeds, &program_id);
        let mint_seeds = &[
            PREFIX.as_bytes(),
            &auction_manager.auction.as_ref(),
            &[bump_seed],
        ];

        spl_token_transfer(
            participation_printing_holding_account_info.clone(),
            destination_info.clone(),
            1,
            auction_manager_info.clone(),
            mint_seeds,
            token_program_info.clone(),
        )?;

        let mut price: u64 = 0;
        if win_index.is_none() {
            if let Some(fixed_price) = config.fixed_price {
                price = fixed_price;
            } else if config.non_winning_constraint == NonWinningConstraint::GivenForBidPrice {
                price = bidder_metadata.last_bid;
            }
        }

        if bidder_token.amount.saturating_sub(price) < 0 as u64 {
            return Err(MetaplexError::NotEnoughBalanceForParticipation.into());
        }

        if price > 0 {
            if let Some(state) = &auction_manager.state.participation_state {
                // Can't really edit something behind an Option reference...
                // just make new one.
                auction_manager.state.participation_state = Some(ParticipationState {
                    collected_to_accept_payment: state
                        .collected_to_accept_payment
                        .checked_add(price)
                        .ok_or(MetaplexError::NumericalOverflowError)?,
                    primary_sale_happened: state.primary_sale_happened,
                    validated: state.validated,
                    printing_authorization_token_account: state
                        .printing_authorization_token_account,
                });
            }

            spl_token_transfer(
                bidder_token_account_info.clone(),
                accept_payment_info.clone(),
                price,
                transfer_authority_info.clone(),
                &[],
                token_program_info.clone(),
            )?;
        }
    } else {
        return Err(MetaplexError::NotEligibleForParticipation.into());
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
        winning_index: None,
        redemption_bump_seed,
        bid_redeemed: false,
        participation_redeemed: true,
        winning_item_index: None,
        overwrite_win_index: None,
    })?;
    Ok(())
}
