use mem::size_of;

use crate::{
    errors::AuctionError,
    processor::create_auction::*,
    processor::{
        AuctionData, AuctionDataExtended, AuctionName, AuctionState, Bid, BidState, PriceFloor,
        WinnerLimit, BASE_AUCTION_DATA_SIZE, MAX_AUCTION_DATA_EXTENDED_SIZE,
    },
    utils::{assert_derivation, assert_owned_by, create_or_allocate_account_raw},
    EXTENDED, PREFIX,
};

use {
    borsh::{BorshDeserialize, BorshSerialize},
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        clock::UnixTimestamp,
        entrypoint::ProgramResult,
        msg,
        program_error::ProgramError,
        pubkey::Pubkey,
    },
    std::mem,
};

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq)]
pub struct CreateAuctionArgsV2 {
    /// How many winners are allowed for this auction. See AuctionData.
    pub winners: WinnerLimit,
    /// End time is the cut-off point that the auction is forced to end by. See AuctionData.
    pub end_auction_at: Option<UnixTimestamp>,
    /// Gap time is how much time after the previous bid where the auction ends. See AuctionData.
    pub end_auction_gap: Option<UnixTimestamp>,
    /// Token mint for the SPL token used for bidding.
    pub token_mint: Pubkey,
    /// Authority
    pub authority: Pubkey,
    /// The resource being auctioned. See AuctionData.
    pub resource: Pubkey,
    /// Set a price floor.
    pub price_floor: PriceFloor,
    /// Add a tick size increment
    pub tick_size: Option<u64>,
    /// Add a minimum percentage increase each bid must meet.
    pub gap_tick_size_percentage: Option<u8>,
    /// Add a instant sale price.
    pub instant_sale_price: Option<u64>,
    /// Auction name
    pub name: Option<AuctionName>,
}

struct Accounts<'a, 'b: 'a> {
    auction: &'a AccountInfo<'b>,
    auction_extended: &'a AccountInfo<'b>,
    payer: &'a AccountInfo<'b>,
    rent: &'a AccountInfo<'b>,
    system: &'a AccountInfo<'b>,
}

fn parse_accounts<'a, 'b: 'a>(
    program_id: &Pubkey,
    accounts: &'a [AccountInfo<'b>],
) -> Result<Accounts<'a, 'b>, ProgramError> {
    let account_iter = &mut accounts.iter();
    let accounts = Accounts {
        payer: next_account_info(account_iter)?,
        auction: next_account_info(account_iter)?,
        auction_extended: next_account_info(account_iter)?,
        rent: next_account_info(account_iter)?,
        system: next_account_info(account_iter)?,
    };
    Ok(accounts)
}

pub fn create_auction_v2(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    args: CreateAuctionArgsV2,
) -> ProgramResult {
    create_auction(
        program_id,
        accounts,
        CreateAuctionArgs {
            winners: args.winners,
            end_auction_at: args.end_auction_at,
            end_auction_gap: args.end_auction_gap,
            token_mint: args.token_mint,
            authority: args.authority,
            resource: args.resource,
            price_floor: args.price_floor,
            tick_size: args.tick_size,
            gap_tick_size_percentage: args.gap_tick_size_percentage,
        },
        args.instant_sale_price,
        args.name,
    )
}
