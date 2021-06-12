use {
    crate::{
        error::MetaplexError,
        state::{AuctionManager, AuctionManagerStatus, Store, PREFIX},
        utils::{assert_derivation, assert_owned_by},
    },
    borsh::BorshSerialize,
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        entrypoint::ProgramResult,
        program::invoke_signed,
        pubkey::Pubkey,
    },
    spl_auction::{
        instruction::claim_bid_instruction,
        processor::{claim_bid::ClaimBidArgs, AuctionData, AuctionState},
    },
};

#[allow(clippy::too_many_arguments)]
pub fn issue_claim_bid<'a>(
    auction_program: AccountInfo<'a>,
    auction: AccountInfo<'a>,
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
    invoke_signed(
        &claim_bid_instruction(
            *auction_program.key,
            *accept_payment.key,
            *authority.key,
            *bidder.key,
            *bidder_pot_token_acct.key,
            *token_mint.key,
            ClaimBidArgs { resource: vault },
        ),
        &[
            auction_program,
            authority,
            auction,
            clock,
            token_mint,
            bidder,
            bidder_pot_token_acct,
            bidder_pot,
            accept_payment,
            token_program,
        ],
        &[&signer_seeds],
    )?;

    Ok(())
}

pub fn process_claim_bid(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let accept_payment_info = next_account_info(account_info_iter)?;
    let bidder_pot_token_info = next_account_info(account_info_iter)?;
    let bidder_pot_info = next_account_info(account_info_iter)?;
    let auction_manager_info = next_account_info(account_info_iter)?;
    let auction_info = next_account_info(account_info_iter)?;
    let bidder_info = next_account_info(account_info_iter)?;
    let token_mint_info = next_account_info(account_info_iter)?;
    let vault_info = next_account_info(account_info_iter)?;
    let store_info = next_account_info(account_info_iter)?;
    let auction_program_info = next_account_info(account_info_iter)?;
    let clock_info = next_account_info(account_info_iter)?;
    let token_program_info = next_account_info(account_info_iter)?;

    let mut auction_manager = AuctionManager::from_account_info(auction_manager_info)?;
    let store = Store::from_account_info(store_info)?;
    let auction = AuctionData::from_account_info(auction_info)?;

    assert_owned_by(auction_info, &store.auction_program)?;
    assert_owned_by(auction_manager_info, program_id)?;
    assert_owned_by(accept_payment_info, &spl_token::id())?;
    assert_owned_by(bidder_pot_token_info, &spl_token::id())?;
    assert_owned_by(bidder_pot_info, &store.auction_program)?;
    assert_owned_by(token_mint_info, &spl_token::id())?;
    assert_owned_by(vault_info, &store.token_vault_program)?;
    assert_owned_by(store_info, program_id)?;

    if auction_manager.store != *store_info.key {
        return Err(MetaplexError::AuctionManagerStoreMismatch.into());
    }

    if auction_manager.auction != *auction_info.key {
        return Err(MetaplexError::AuctionManagerAuctionMismatch.into());
    }

    if store.auction_program != *auction_program_info.key {
        return Err(MetaplexError::AuctionManagerAuctionProgramMismatch.into());
    }

    if store.token_program != *token_program_info.key {
        return Err(MetaplexError::AuctionManagerTokenProgramMismatch.into());
    }

    if auction_manager.accept_payment != *accept_payment_info.key {
        return Err(MetaplexError::AcceptPaymentMismatch.into());
    }

    if auction_manager.vault != *vault_info.key {
        return Err(MetaplexError::AuctionManagerVaultMismatch.into());
    }
    if auction.state != AuctionState::Ended {
        return Err(MetaplexError::AuctionHasNotEnded.into());
    }

    if auction_manager.state.status != AuctionManagerStatus::Disbursing
        && auction_manager.state.status != AuctionManagerStatus::Finished
    {
        auction_manager.state.status = AuctionManagerStatus::Disbursing;
    }

    if let Some(winner_index) = auction.is_winner(bidder_info.key) {
        auction_manager.state.winning_config_states[winner_index].money_pushed_to_accept_payment =
            true;
    }

    let bump_seed = assert_derivation(
        program_id,
        auction_manager_info,
        &[PREFIX.as_bytes(), &auction_manager.auction.as_ref()],
    )?;
    let authority_seeds = &[
        PREFIX.as_bytes(),
        &auction_manager.auction.as_ref(),
        &[bump_seed],
    ];

    issue_claim_bid(
        auction_program_info.clone(),
        auction_info.clone(),
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
    auction_manager.serialize(&mut *auction_manager_info.data.borrow_mut())?;
    Ok(())
}
