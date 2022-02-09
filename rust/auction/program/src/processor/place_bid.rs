//! Places a bid on a running auction, the logic here implements a standard English auction
//! mechanism, once the auction starts, new bids can be made until 10 minutes has passed with no
//! new bid. At this point the auction ends.
//!
//! Possible Attacks to Consider:
//!
//! 1) A user bids many many small bids to fill up the buffer, so that his max bid wins.
//! 2) A user bids a large amount repeatedly to indefinitely delay the auction finishing.
//!
//! A few solutions come to mind: don't allow cancelling bids, and simply prune all bids that
//! are not winning bids from the state.

use borsh::try_to_vec_with_schema;

use crate::{
    errors::AuctionError,
    processor::{
        AuctionData, AuctionDataExtended, AuctionState, Bid, BidderMetadata, BidderPot, PriceFloor,
    },
    utils::{
        assert_derivation, assert_initialized, assert_owned_by, assert_signer,
        assert_token_program_matches_package, create_or_allocate_account_raw, spl_token_transfer,
        TokenTransferParams,
    },
    EXTENDED, PREFIX,
};

use super::BIDDER_METADATA_LEN;

use {
    borsh::{BorshDeserialize, BorshSerialize},
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        entrypoint::ProgramResult,
        msg,
        program::{invoke, invoke_signed},
        program_error::ProgramError,
        program_option::COption,
        program_pack::Pack,
        pubkey::Pubkey,
        rent::Rent,
        system_instruction,
        system_instruction::create_account,
        sysvar::{clock::Clock, Sysvar},
    },
    spl_token::state::Account,
    std::mem,
};

/// Arguments for the PlaceBid instruction discriminant .
#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq)]
pub struct PlaceBidArgs {
    /// Size of the bid being placed. The user must have enough SOL to satisfy this amount.
    pub amount: u64,
    /// Resource being bid on.
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
    payer: &'a AccountInfo<'b>,
    rent: &'a AccountInfo<'b>,
    system: &'a AccountInfo<'b>,
    token_program: &'a AccountInfo<'b>,
    transfer_authority: &'a AccountInfo<'b>,
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
        transfer_authority: next_account_info(account_iter)?,
        payer: next_account_info(account_iter)?,
        clock_sysvar: next_account_info(account_iter)?,
        rent: next_account_info(account_iter)?,
        system: next_account_info(account_iter)?,
        token_program: next_account_info(account_iter)?,
    };

    assert_owned_by(accounts.auction, program_id)?;
    assert_owned_by(accounts.auction_extended, program_id)?;
    assert_owned_by(accounts.bidder_token, &spl_token::id())?;

    if !accounts.bidder_pot.data_is_empty() {
        assert_owned_by(accounts.bidder_pot, program_id)?;
    }
    if !accounts.bidder_meta.data_is_empty() {
        assert_owned_by(accounts.bidder_meta, program_id)?;
    }

    assert_owned_by(accounts.mint, &spl_token::id())?;
    assert_owned_by(accounts.bidder_pot_token, &spl_token::id())?;
    assert_signer(accounts.bidder)?;
    assert_signer(accounts.payer)?;
    assert_signer(accounts.transfer_authority)?;
    assert_token_program_matches_package(accounts.token_program)?;

    if *accounts.token_program.key != spl_token::id() {
        return Err(AuctionError::InvalidTokenProgram.into());
    }

    Ok(accounts)
}

#[allow(clippy::absurd_extreme_comparisons)]
pub fn place_bid<'r, 'b: 'r>(
    program_id: &Pubkey,
    accounts: &'r [AccountInfo<'b>],
    args: PlaceBidArgs,
) -> ProgramResult {
    msg!("+ Processing PlaceBid");
    let accounts = parse_accounts(program_id, accounts)?;

    // Load the auction and verify this bid is valid.
    let mut auction = AuctionData::from_account_info(accounts.auction)?;

    // Load the clock, used for various auction timing.
    let clock = Clock::from_account_info(accounts.clock_sysvar)?;

    // Verify auction has not ended.
    if auction.ended(clock.unix_timestamp)? {
        auction.state = auction.state.end()?;
        auction.serialize(&mut *accounts.auction.data.borrow_mut())?;
        msg!("Auction ended!");
        return Ok(());
    }
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

    // If metadata doesn't exist, create it.
    if accounts.bidder_meta.owner != program_id {
        create_or_allocate_account_raw(
            *program_id,
            accounts.bidder_meta,
            accounts.rent,
            accounts.system,
            accounts.payer,
            // For whatever reason, using Mem function here returns 7, which is wholly wrong for this struct
            // seems to be issues with UnixTimestamp
            BIDDER_METADATA_LEN,
            &[
                PREFIX.as_bytes(),
                program_id.as_ref(),
                accounts.auction.key.as_ref(),
                accounts.bidder.key.as_ref(),
                "metadata".as_bytes(),
                &[metadata_bump],
            ],
        )?;
    } else {
        // Verify the last bid was cancelled before continuing.
        let bidder_metadata: BidderMetadata =
            BidderMetadata::from_account_info(accounts.bidder_meta)?;
        if bidder_metadata.cancelled == false {
            return Err(AuctionError::BidAlreadyActive.into());
        }
    };

    // Derive Pot address, this account wraps/holds an SPL account to transfer tokens into and is
    // also used as the authoriser of the SPL pot.
    let pot_bump = assert_derivation(
        program_id,
        accounts.bidder_pot,
        &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            accounts.auction.key.as_ref(),
            accounts.bidder.key.as_ref(),
        ],
    )?;

    // The account within the pot must be owned by us.
    let actual_account: Account = assert_initialized(accounts.bidder_pot_token)?;
    if actual_account.owner != *accounts.auction.key {
        return Err(AuctionError::BidderPotTokenAccountOwnerMismatch.into());
    }

    if actual_account.delegate != COption::None {
        return Err(AuctionError::DelegateShouldBeNone.into());
    }

    if actual_account.close_authority != COption::None {
        return Err(AuctionError::CloseAuthorityShouldBeNone.into());
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

    // Can't bid on an auction that isn't running.
    if auction.state != AuctionState::Started {
        return Err(AuctionError::InvalidState.into());
    }

    let bump_authority_seeds = &[
        PREFIX.as_bytes(),
        program_id.as_ref(),
        accounts.auction.key.as_ref(),
        accounts.bidder.key.as_ref(),
        &[pot_bump],
    ];

    // If the bidder pot account is empty, we need to generate one.
    if accounts.bidder_pot.data_is_empty() {
        create_or_allocate_account_raw(
            *program_id,
            accounts.bidder_pot,
            accounts.rent,
            accounts.system,
            accounts.payer,
            mem::size_of::<BidderPot>(),
            bump_authority_seeds,
        )?;

        // Attach SPL token address to pot account.
        let mut pot = BidderPot::from_account_info(accounts.bidder_pot)?;
        pot.bidder_pot = *accounts.bidder_pot_token.key;
        pot.bidder_act = *accounts.bidder.key;
        pot.auction_act = *accounts.auction.key;
        pot.serialize(&mut *accounts.bidder_pot.data.borrow_mut())?;
    } else {
        // Already exists, verify that the pot contains the specified SPL address.
        let bidder_pot = BidderPot::from_account_info(accounts.bidder_pot)?;
        if bidder_pot.bidder_pot != *accounts.bidder_pot_token.key {
            return Err(AuctionError::BidderPotTokenAccountOwnerMismatch.into());
        }
    }

    // Update now we have new bid.
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
    let mut auction_extended: AuctionDataExtended =
        AuctionDataExtended::from_account_info(accounts.auction_extended)?;
    auction_extended.total_uncancelled_bids = auction_extended
        .total_uncancelled_bids
        .checked_add(1)
        .ok_or(AuctionError::NumericalOverflowError)?;
    auction_extended.serialize(&mut *accounts.auction_extended.data.borrow_mut())?;

    let mut bid_price = args.amount;

    if let Some(instant_sale_price) = auction_extended.instant_sale_price {
        if args.amount > instant_sale_price {
            msg!("Received amount is more than instant_sale_price so it was reduced to instant_sale_price - {:?}", instant_sale_price);
            bid_price = instant_sale_price;
        }
    }

    // Confirm payers SPL token balance is enough to pay the bid.
    let account: Account = Account::unpack_from_slice(&accounts.bidder_token.data.borrow())?;
    if account.amount.saturating_sub(bid_price) < 0 {
        msg!(
            "Amount is too small: {:?}, compared to account amount of {:?}",
            bid_price,
            account.amount
        );
        return Err(AuctionError::BalanceTooLow.into());
    }

    // Transfer amount of SPL token to bid account.
    spl_token_transfer(TokenTransferParams {
        source: accounts.bidder_token.clone(),
        destination: accounts.bidder_pot_token.clone(),
        authority: accounts.transfer_authority.clone(),
        authority_signer_seeds: bump_authority_seeds,
        token_program: accounts.token_program.clone(),
        amount: bid_price,
    })?;

    // Serialize new Auction State
    auction.last_bid = Some(clock.unix_timestamp);
    auction.place_bid(
        Bid(*accounts.bidder.key, bid_price),
        auction_extended.tick_size,
        auction_extended.gap_tick_size_percentage,
        clock.unix_timestamp,
        auction_extended.instant_sale_price,
    )?;
    auction.serialize(&mut *accounts.auction.data.borrow_mut())?;

    // Update latest metadata with results from the bid.
    BidderMetadata {
        bidder_pubkey: *accounts.bidder.key,
        auction_pubkey: *accounts.auction.key,
        last_bid: bid_price,
        last_bid_timestamp: clock.unix_timestamp,
        cancelled: false,
    }
    .serialize(&mut *accounts.bidder_meta.data.borrow_mut())?;

    Ok(())
}
