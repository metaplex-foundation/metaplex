use {
    crate::{
        error::MetaplexError,
        state::{get_auction_manager, AuctionManagerStatus, Store, PREFIX},
        utils::{assert_derivation, assert_owned_by},
    },
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        entrypoint::ProgramResult,
        program::invoke_signed,
        pubkey::Pubkey,
    },
    spl_auction::{
        instruction::claim_bid_instruction,
        processor::{claim_bid::ClaimBidArgs, AuctionData, AuctionState, BidderPot, AuctionDataExtended},
    },
};

#[allow(clippy::too_many_arguments)]
pub fn issue_claim_bid<'a>(
    auction_program: AccountInfo<'a>,
    auction: AccountInfo<'a>,
    auction_extended: Option<AccountInfo<'a>>,
    accept_payment: AccountInfo<'a>,
    authority: AccountInfo<'a>,
    bidder: AccountInfo<'a>,
    bidder_pot: AccountInfo<'a>,
    bidder_pot_token_acct: AccountInfo<'a>,
    token_mint: AccountInfo<'a>,
    clock: AccountInfo<'a>,
    token_program: AccountInfo<'a>,
    vault: Pubkey,
    signer_seeds: &[&[u8]],
) -> ProgramResult {
    let mut account_infos = vec![
        auction_program.clone(),
        authority.clone(),
        auction,
        clock,
        token_mint.clone(),
        bidder.clone(),
        bidder_pot_token_acct.clone(),
        bidder_pot,
        accept_payment.clone(),
        token_program,
    ];

    let mut auction_extended_key: Option<Pubkey> = None;
    if let Some(auction_extended_account) = auction_extended {
        auction_extended_key = Some(*auction_extended_account.key);
        account_infos.push(auction_extended_account);
    }
    invoke_signed(
        &claim_bid_instruction(
            *auction_program.key,
            *accept_payment.key,
            *authority.key,
            *bidder.key,
            *bidder_pot_token_acct.key,
            *token_mint.key,
            auction_extended_key,
            ClaimBidArgs { resource: vault },
        ),
        account_infos.as_ref(),
        &[&signer_seeds],
    )?;

    Ok(())
}

pub fn process_claim_bid(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let accept_payment_info = next_account_info(account_info_iter)?;
    let bidder_pot_token_info = next_account_info(account_info_iter)?;
    let bidder_pot_info = next_account_info(account_info_iter)?;
    let mut auction_manager_info = next_account_info(account_info_iter)?;
    let auction_info = next_account_info(account_info_iter)?;
    let bidder_info = next_account_info(account_info_iter)?;
    let token_mint_info = next_account_info(account_info_iter)?;
    let vault_info = next_account_info(account_info_iter)?;
    let store_info = next_account_info(account_info_iter)?;
    let auction_program_info = next_account_info(account_info_iter)?;
    let clock_info = next_account_info(account_info_iter)?;
    let token_program_info = next_account_info(account_info_iter)?;
    let auction_extended_info = next_account_info(account_info_iter).ok();

    let mut auction_manager = get_auction_manager(auction_manager_info)?;
    let store = Store::from_account_info(store_info)?;
    let auction = AuctionData::from_account_info(auction_info)?;
    let token_pot_info = BidderPot::from_account_info(bidder_pot_info)?;

    assert_owned_by(auction_info, &store.auction_program)?;
    assert_owned_by(auction_manager_info, program_id)?;
    assert_owned_by(accept_payment_info, &spl_token::id())?;
    assert_owned_by(bidder_pot_token_info, &spl_token::id())?;
    assert_owned_by(bidder_pot_info, &store.auction_program)?;
    assert_owned_by(token_mint_info, &spl_token::id())?;
    assert_owned_by(vault_info, &store.token_vault_program)?;
    assert_owned_by(store_info, program_id)?;
    if let Some(auction_extended) = auction_extended_info {
        assert_owned_by(auction_extended, &store.auction_program)?;
    }

    if auction_manager.store() != *store_info.key {
        return Err(MetaplexError::AuctionManagerStoreMismatch.into());
    }

    if auction_manager.auction() != *auction_info.key {
        return Err(MetaplexError::AuctionManagerAuctionMismatch.into());
    }

    if store.auction_program != *auction_program_info.key {
        return Err(MetaplexError::AuctionManagerAuctionProgramMismatch.into());
    }

    if store.token_program != *token_program_info.key {
        return Err(MetaplexError::AuctionManagerTokenProgramMismatch.into());
    }

    if auction_manager.accept_payment() != *accept_payment_info.key {
        return Err(MetaplexError::AcceptPaymentMismatch.into());
    }

    if auction_manager.vault() != *vault_info.key {
        return Err(MetaplexError::AuctionManagerVaultMismatch.into());
    }

    let mut instant_sale_price: Option<u64> = None;
    if let Some(auction_extended) = auction_extended_info {
        instant_sale_price = AuctionDataExtended::get_instant_sale_price(&auction_extended.data.borrow());
    }
    if !instant_sale_price.is_some() {
        if auction.state != AuctionState::Ended {
            return Err(MetaplexError::AuctionHasNotEnded.into());
        }
    }

    if auction_manager.status() != AuctionManagerStatus::Disbursing
        && auction_manager.status() != AuctionManagerStatus::Finished
    {
        auction_manager.set_status(AuctionManagerStatus::Disbursing);
    }

    if let Some(winner_index) = auction.is_winner(bidder_info.key) {
        if !token_pot_info.emptied {
            auction_manager.mark_bid_as_claimed(winner_index)?;
        }
    }

    let bump_seed = assert_derivation(
        program_id,
        auction_manager_info,
        &[PREFIX.as_bytes(), &auction_manager.auction().as_ref()],
    )?;
    let auction_key = auction_manager.auction();
    let authority_seeds = &[PREFIX.as_bytes(), auction_key.as_ref(), &[bump_seed]];

    issue_claim_bid(
        auction_program_info.clone(),
        auction_info.clone(),
        auction_extended_info.map_or(None, |acc| Some(acc.clone())),
        accept_payment_info.clone(),
        auction_manager_info.clone(),
        bidder_info.clone(),
        bidder_pot_info.clone(),
        bidder_pot_token_info.clone(),
        token_mint_info.clone(),
        clock_info.clone(),
        token_program_info.clone(),
        *vault_info.key,
        authority_seeds,
    )?;

    // Note do not move this above the assert_derivation ... it does something to auction manager
    // that causes assert_derivation to get caught in infinite loop...borsh sucks.
    auction_manager.save(&mut auction_manager_info)?;
    Ok(())
}
