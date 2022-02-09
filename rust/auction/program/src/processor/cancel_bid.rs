//! Cancels an existing bid. This only works in two cases:
//!
//! 1) The auction is still going on, in which case it is possible to cancel a bid at any time.
//! 2) The auction has finished, but the bid did not win. This allows users to claim back their
//!    funds from bid accounts.

use crate::{
    errors::AuctionError,
    processor::{AuctionData, AuctionDataExtended, BidderMetadata, BidderPot},
    utils::{
        assert_derivation, assert_initialized, assert_owned_by, assert_signer,
        assert_token_program_matches_package, create_or_allocate_account_raw, spl_token_transfer,
        TokenTransferParams,
    },
    EXTENDED, PREFIX,
};

use super::AuctionState;

use {
    borsh::{BorshDeserialize, BorshSerialize},
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        entrypoint::ProgramResult,
        msg,
        program::invoke_signed,
        program_error::ProgramError,
        program_pack::Pack,
        pubkey::Pubkey,
        system_instruction,
        sysvar::{clock::Clock, Sysvar},
    },
    spl_token::state::Account,
};

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq)]
pub struct CancelBidArgs {
    pub resource: Pubkey,
}

struct Accounts<'a, 'b: 'a> {
    auction: &'a AccountInfo<'b>,
    auction_extended: &'a AccountInfo<'b>,
    bidder_meta: &'a AccountInfo<'b>,
    bidder_pot: &'a AccountInfo<'b>,
    bidder_pot_token: &'a AccountInfo<'b>,
    bidder: &'a AccountInfo<'b>,
    bidder_token: &'a AccountInfo<'b>,
    clock_sysvar: &'a AccountInfo<'b>,
    mint: &'a AccountInfo<'b>,
    rent: &'a AccountInfo<'b>,
    system: &'a AccountInfo<'b>,
    token_program: &'a AccountInfo<'b>,
}

fn parse_accounts<'a, 'b: 'a>(
    program_id: &Pubkey,
    accounts: &'a [AccountInfo<'b>],
) -> Result<Accounts<'a, 'b>, ProgramError> {
    let account_iter = &mut accounts.iter();
    let accounts = Accounts {
        bidder: next_account_info(account_iter)?,
        bidder_token: next_account_info(account_iter)?,
        bidder_pot: next_account_info(account_iter)?,
        bidder_pot_token: next_account_info(account_iter)?,
        bidder_meta: next_account_info(account_iter)?,
        auction: next_account_info(account_iter)?,
        auction_extended: next_account_info(account_iter)?,
        mint: next_account_info(account_iter)?,
        clock_sysvar: next_account_info(account_iter)?,
        rent: next_account_info(account_iter)?,
        system: next_account_info(account_iter)?,
        token_program: next_account_info(account_iter)?,
    };

    assert_owned_by(accounts.auction, program_id)?;
    assert_owned_by(accounts.auction_extended, program_id)?;
    assert_owned_by(accounts.bidder_meta, program_id)?;
    assert_owned_by(accounts.mint, &spl_token::id())?;
    assert_owned_by(accounts.bidder_pot, program_id)?;
    assert_owned_by(accounts.bidder_pot_token, &spl_token::id())?;
    assert_signer(accounts.bidder)?;
    assert_token_program_matches_package(accounts.token_program)?;

    if *accounts.token_program.key != spl_token::id() {
        return Err(AuctionError::InvalidTokenProgram.into());
    }

    Ok(accounts)
}

pub fn cancel_bid(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    args: CancelBidArgs,
) -> ProgramResult {
    msg!("+ Processing Cancelbid");
    let accounts = parse_accounts(program_id, accounts)?;

    // The account within the pot must be owned by us.
    let actual_account: Account = assert_initialized(accounts.bidder_pot_token)?;
    if actual_account.owner != *accounts.auction.key {
        return Err(AuctionError::BidderPotTokenAccountOwnerMismatch.into());
    }

    // Derive and load Auction.
    let auction_bump = assert_derivation(
        program_id,
        accounts.auction,
        &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            args.resource.as_ref(),
        ],
    )?;

    let auction_seeds = &[
        PREFIX.as_bytes(),
        program_id.as_ref(),
        args.resource.as_ref(),
        &[auction_bump],
    ];

    // Load the auction and verify this bid is valid.
    let mut auction = AuctionData::from_account_info(accounts.auction)?;
    // The mint provided in this bid must match the one the auction was initialized with.
    if auction.token_mint != *accounts.mint.key {
        return Err(AuctionError::IncorrectMint.into());
    }

    // Load auction extended account to check instant_sale_price
    // and update cancelled bids if auction still active
    let mut auction_extended = AuctionDataExtended::from_account_info(accounts.auction_extended)?;

    // Load the clock, used for various auction timing.
    let clock = Clock::from_account_info(accounts.clock_sysvar)?;

    // Derive Metadata key and load it.
    let metadata_bump = assert_derivation(
        program_id,
        accounts.bidder_meta,
        &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            accounts.auction.key.as_ref(),
            accounts.bidder.key.as_ref(),
            "metadata".as_bytes(),
        ],
    )?;

    // If metadata doesn't exist, error, can't cancel a bid that doesn't exist and metadata must
    // exist if a bid was placed.
    if accounts.bidder_meta.owner != program_id {
        return Err(AuctionError::MetadataInvalid.into());
    }

    // Derive Pot address, this account wraps/holds an SPL account to transfer tokens out of.
    let pot_seeds = [
        PREFIX.as_bytes(),
        program_id.as_ref(),
        accounts.auction.key.as_ref(),
        accounts.bidder.key.as_ref(),
    ];

    let pot_bump = assert_derivation(program_id, accounts.bidder_pot, &pot_seeds)?;

    let bump_authority_seeds = &[
        PREFIX.as_bytes(),
        program_id.as_ref(),
        accounts.auction.key.as_ref(),
        accounts.bidder.key.as_ref(),
        &[pot_bump],
    ];

    // If the bidder pot account is empty, this bid is invalid.
    if accounts.bidder_pot.data_is_empty() {
        return Err(AuctionError::BidderPotDoesNotExist.into());
    }

    // Refuse to cancel if the auction ended and this person is a winning account.
    let winner_bid_index = auction.is_winner(accounts.bidder.key);
    if auction.ended(clock.unix_timestamp)? && winner_bid_index.is_some() {
        return Err(AuctionError::InvalidState.into());
    }

    // Refuse to cancel if bidder set price above or equal instant_sale_price
    if let Some(bid_index) = winner_bid_index {
        if let Some(instant_sale_price) = auction_extended.instant_sale_price {
            if auction.bid_state.amount(bid_index) >= instant_sale_price {
                return Err(AuctionError::InvalidState.into());
            }
        }
    }

    // Confirm we're looking at the real SPL account for this bidder.
    let bidder_pot = BidderPot::from_account_info(accounts.bidder_pot)?;
    if bidder_pot.bidder_pot != *accounts.bidder_pot_token.key {
        return Err(AuctionError::BidderPotTokenAccountOwnerMismatch.into());
    }

    // Transfer SPL bid balance back to the user.
    let account: Account = Account::unpack_from_slice(&accounts.bidder_pot_token.data.borrow())?;
    spl_token_transfer(TokenTransferParams {
        source: accounts.bidder_pot_token.clone(),
        destination: accounts.bidder_token.clone(),
        authority: accounts.auction.clone(),
        authority_signer_seeds: auction_seeds,
        token_program: accounts.token_program.clone(),
        amount: account.amount,
    })?;

    // Update Metadata
    let metadata = BidderMetadata::from_account_info(accounts.bidder_meta)?;
    let already_cancelled = metadata.cancelled;
    BidderMetadata {
        cancelled: true,
        ..metadata
    }
    .serialize(&mut *accounts.bidder_meta.data.borrow_mut())?;

    // Update Auction

    if auction.state != AuctionState::Ended {
        // Once ended we want uncancelled bids to retain it's pre-ending count
        assert_derivation(
            program_id,
            accounts.auction_extended,
            &[
                PREFIX.as_bytes(),
                program_id.as_ref(),
                args.resource.as_ref(),
                EXTENDED.as_bytes(),
            ],
        )?;

        msg!("Already cancelled is {:?}", already_cancelled);

        if !already_cancelled && auction_extended.total_uncancelled_bids > 0 {
            auction_extended.total_uncancelled_bids = auction_extended
                .total_uncancelled_bids
                .checked_sub(1)
                .ok_or(AuctionError::NumericalOverflowError)?;
        }
        auction_extended.serialize(&mut *accounts.auction_extended.data.borrow_mut())?;

        // Only cancel the bid if the auction has not ended yet
        auction.bid_state.cancel_bid(*accounts.bidder.key);
        auction.serialize(&mut *accounts.auction.data.borrow_mut())?;
    }

    Ok(())
}
