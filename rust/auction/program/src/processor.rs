use crate::errors::AuctionError;
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::AccountInfo, borsh::try_from_slice_unchecked, clock::UnixTimestamp,
    entrypoint::ProgramResult, hash::Hash, msg, program_error::ProgramError, pubkey::Pubkey,
};
use std::{cmp, mem};

// Declare submodules, each contains a single handler for each instruction variant in the program.
pub mod cancel_bid;
pub mod claim_bid;
pub mod create_auction;
pub mod end_auction;
pub mod place_bid;
pub mod set_authority;
pub mod start_auction;

// Re-export submodules handlers + associated types for other programs to consume.
pub use cancel_bid::*;
pub use claim_bid::*;
pub use create_auction::*;
pub use end_auction::*;
pub use place_bid::*;
pub use set_authority::*;
pub use start_auction::*;

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    input: &[u8],
) -> ProgramResult {
    use crate::instruction::AuctionInstruction;
    match AuctionInstruction::try_from_slice(input)? {
        AuctionInstruction::CancelBid(args) => cancel_bid(program_id, accounts, args),
        AuctionInstruction::ClaimBid(args) => claim_bid(program_id, accounts, args),
        AuctionInstruction::CreateAuction(args) => create_auction(program_id, accounts, args),
        AuctionInstruction::EndAuction(args) => end_auction(program_id, accounts, args),
        AuctionInstruction::PlaceBid(args) => place_bid(program_id, accounts, args),
        AuctionInstruction::SetAuthority => set_authority(program_id, accounts),
        AuctionInstruction::StartAuction(args) => start_auction(program_id, accounts, args),
    }
}

/// Structure with pricing floor data.
#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq, Debug)]
pub enum PriceFloor {
    /// Due to borsh on the front end disallowing different arguments in enums, we have to make sure data is
    /// same size across all three
    /// No price floor, any bid is valid.
    None([u8; 32]),
    /// Explicit minimum price, any bid below this is rejected.
    MinimumPrice([u64; 4]),
    /// Hidden minimum price, revealed at the end of the auction.
    BlindedPrice(Hash),
}

// The two extra 8's are present, one 8 is for the Vec's amount of elements and one is for the max
// usize in bid state.
pub const BASE_AUCTION_DATA_SIZE: usize = 32 + 32 + 9 + 9 + 9 + 9 + 1 + 32 + 1 + 8 + 8 + 8;
#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq, Debug)]
pub struct AuctionData {
    /// Pubkey of the authority with permission to modify this auction.
    pub authority: Pubkey,
    /// Pubkey of the resource being bid on.
    /// TODO try to bring this back some day. Had to remove this due to a stack access violation bug
    /// interactin that happens in metaplex during redemptions due to some low level rust error
    /// that happens when AuctionData has too many fields. This field was the least used.
    ///pub resource: Pubkey,
    /// Token mint for the SPL token being used to bid
    pub token_mint: Pubkey,
    /// The time the last bid was placed, used to keep track of auction timing.
    pub last_bid: Option<UnixTimestamp>,
    /// Slot time the auction was officially ended by.
    pub ended_at: Option<UnixTimestamp>,
    /// End time is the cut-off point that the auction is forced to end by.
    pub end_auction_at: Option<UnixTimestamp>,
    /// Gap time is the amount of time in slots after the previous bid at which the auction ends.
    pub end_auction_gap: Option<UnixTimestamp>,
    /// Minimum price for any bid to meet.
    pub price_floor: PriceFloor,
    /// The state the auction is in, whether it has started or ended.
    pub state: AuctionState,
    /// Auction Bids, each user may have one bid open at a time.
    pub bid_state: BidState,
}

pub const MAX_AUCTION_DATA_EXTENDED_SIZE: usize = 8 + 9 + 2 + 200;
// Further storage for more fields. Would like to store more on the main data but due
// to a borsh issue that causes more added fields to inflict "Access violation" errors
// during redemption in main Metaplex app for no reason, we had to add this nasty PDA.
#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq, Debug)]
pub struct AuctionDataExtended {
    /// Total uncancelled bids
    pub total_uncancelled_bids: u64,
    // Unimplemented fields
    /// Tick size
    pub tick_size: Option<u64>,
    /// gap_tick_size_percentage - two decimal points
    pub gap_tick_size_percentage: Option<u8>,
}

impl AuctionDataExtended {
    pub fn from_account_info(a: &AccountInfo) -> Result<AuctionDataExtended, ProgramError> {
        if a.data_len() != MAX_AUCTION_DATA_EXTENDED_SIZE {
            return Err(AuctionError::DataTypeMismatch.into());
        }

        let auction_extended: AuctionDataExtended = try_from_slice_unchecked(&a.data.borrow_mut())?;

        Ok(auction_extended)
    }
}

impl AuctionData {
    pub fn from_account_info(a: &AccountInfo) -> Result<AuctionData, ProgramError> {
        if (a.data_len() - BASE_AUCTION_DATA_SIZE) % mem::size_of::<Bid>() != 0 {
            return Err(AuctionError::DataTypeMismatch.into());
        }

        let auction: AuctionData = try_from_slice_unchecked(&a.data.borrow_mut())?;

        Ok(auction)
    }

    pub fn ended(&self, now: UnixTimestamp) -> Result<bool, ProgramError> {
        // If there is an end time specified, handle conditions.
        return match (self.ended_at, self.end_auction_gap) {
            // NOTE if changing this, change in auction.ts on front end as well where logic duplicates.
            // Both end and gap present, means a bid can still be placed post-auction if it is
            // within the gap time.
            (Some(end), Some(gap)) => {
                // Check if the bid is within the gap between the last bidder.
                if let Some(last) = self.last_bid {
                    let next_bid_time = match last.checked_add(gap) {
                        Some(val) => val,
                        None => return Err(AuctionError::NumericalOverflowError.into()),
                    };
                    Ok(now > end && now > next_bid_time)
                } else {
                    Ok(now > end)
                }
            }

            // Simply whether now has passed the end.
            (Some(end), None) => Ok(now > end),

            // No other end conditions.
            _ => Ok(false),
        };
    }

    pub fn is_winner(&self, key: &Pubkey) -> Option<usize> {
        let minimum = match self.price_floor {
            PriceFloor::MinimumPrice(min) => min[0],
            _ => 0,
        };
        self.bid_state.is_winner(key, minimum)
    }

    pub fn num_winners(&self) -> u64 {
        let minimum = match self.price_floor {
            PriceFloor::MinimumPrice(min) => min[0],
            _ => 0,
        };
        self.bid_state.num_winners(minimum)
    }

    pub fn num_possible_winners(&self) -> u64 {
        self.bid_state.num_possible_winners()
    }

    pub fn winner_at(&self, idx: usize) -> Option<Pubkey> {
        let minimum = match self.price_floor {
            PriceFloor::MinimumPrice(min) => min[0],
            _ => 0,
        };
        self.bid_state.winner_at(idx, minimum)
    }
}

/// Define valid auction state transitions.
#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq, Debug)]
pub enum AuctionState {
    Created,
    Started,
    Ended,
}

impl AuctionState {
    pub fn create() -> Self {
        AuctionState::Created
    }

    #[inline(always)]
    pub fn start(self) -> Result<Self, ProgramError> {
        match self {
            AuctionState::Created => Ok(AuctionState::Started),
            _ => Err(AuctionError::AuctionTransitionInvalid.into()),
        }
    }

    #[inline(always)]
    pub fn end(self) -> Result<Self, ProgramError> {
        match self {
            AuctionState::Started => Ok(AuctionState::Ended),
            _ => Err(AuctionError::AuctionTransitionInvalid.into()),
        }
    }
}

/// Bids associate a bidding key with an amount bid.
#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq, Debug)]
pub struct Bid(pub Pubkey, pub u64);

/// BidState tracks the running state of an auction, each variant represents a different kind of
/// auction being run.
#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq, Debug)]
pub enum BidState {
    EnglishAuction { bids: Vec<Bid>, max: usize },
    OpenEdition { bids: Vec<Bid>, max: usize },
}

/// Bidding Implementations.
///
/// English Auction: this stores only the current winning bids in the auction, pruning cancelled
/// and lost bids over time.
///
/// Open Edition: All bids are accepted, cancellations return money to the bidder and always
/// succeed.
impl BidState {
    pub fn new_english(n: usize) -> Self {
        BidState::EnglishAuction {
            bids: vec![],
            max: n,
        }
    }

    pub fn new_open_edition() -> Self {
        BidState::OpenEdition {
            bids: vec![],
            max: 0,
        }
    }

    pub fn max_array_size_for(n: usize) -> usize {
        let mut real_max = n;
        if real_max < 8 {
            real_max = 8;
        } else {
            real_max = 2 * real_max
        }
        real_max
    }

    /// Push a new bid into the state, this succeeds only if the bid is larger than the current top
    /// winner stored. Crappy list information to start with.
    pub fn place_bid(&mut self, bid: Bid) -> Result<(), ProgramError> {
        match self {
            // In a capped auction, track the limited number of winners.
            BidState::EnglishAuction { ref mut bids, max } => match bids.last() {
                Some(top) => {
                    msg!("Looking to go over the loop");
                    for i in (0..bids.len()).rev() {
                        msg!("Comparison of {:?} and {:?} for {:?}", bids[i].1, bid.1, i);
                        if bids[i].1 < bid.1 {
                            msg!("Ok we can do an insert");
                            if i + 1 < bids.len() {
                                msg!("Doing a normal insert");
                                bids.insert(i + 1, bid);
                            } else {
                                msg!("Doing an on the end insert");
                                bids.push(bid)
                            }
                            break;
                        } else if bids[i].1 == bid.1 {
                            msg!("Ok we can do an equivalent insert");
                            if i == 0 {
                                msg!("Doing a normal insert");
                                bids.insert(0, bid);
                                break;
                            } else {
                                if bids[i - 1].1 != bids[i].1 {
                                    msg!("Doing an insert just before");
                                    bids.insert(i, bid);
                                    break;
                                }
                                msg!("More duplicates ahead...")
                            }
                        } else if i == 0 {
                            msg!("Inserting at 0");
                            bids.insert(0, bid);
                            break;
                        }
                    }
                    let max_size = BidState::max_array_size_for(*max);

                    if bids.len() > max_size {
                        bids.remove(0);
                    }
                    Ok(())
                }
                _ => {
                    msg!("Pushing bid onto stack");
                    bids.push(bid);
                    Ok(())
                }
            },

            // In an open auction, bidding simply succeeds.
            BidState::OpenEdition { bids, max } => Ok(()),
        }
    }

    /// Cancels a bid, if the bid was a winning bid it is removed, if the bid is invalid the
    /// function simple no-ops.
    pub fn cancel_bid(&mut self, key: Pubkey) -> Result<(), ProgramError> {
        match self {
            BidState::EnglishAuction { ref mut bids, max } => {
                bids.retain(|b| b.0 != key);
                Ok(())
            }

            // In an open auction, cancelling simply succeeds. It's up to the manager of an auction
            // to decide what to do with open edition bids.
            BidState::OpenEdition { bids, max } => Ok(()),
        }
    }

    pub fn amount(&self, index: usize) -> u64 {
        match self {
            BidState::EnglishAuction { bids, max } => {
                if index >= 0 as usize && index < bids.len() {
                    return bids[bids.len() - index - 1].1;
                } else {
                    return 0;
                }
            }
            BidState::OpenEdition { bids, max } => 0,
        }
    }

    /// Check if a pubkey is currently a winner and return winner #1 as index 0 to outside world.
    pub fn is_winner(&self, key: &Pubkey, min: u64) -> Option<usize> {
        // NOTE if changing this, change in auction.ts on front end as well where logic duplicates.

        match self {
            // Presense in the winner list is enough to check win state.
            BidState::EnglishAuction { bids, max } => {
                match bids.iter().position(|bid| &bid.0 == key && bid.1 >= min) {
                    Some(val) => {
                        let zero_based_index = bids.len() - val - 1;
                        if zero_based_index < *max {
                            Some(zero_based_index)
                        } else {
                            None
                        }
                    }
                    None => None,
                }
            }
            // There are no winners in an open edition, it is up to the auction manager to decide
            // what to do with open edition bids.
            BidState::OpenEdition { bids, max } => None,
        }
    }

    pub fn num_winners(&self, min: u64) -> u64 {
        match self {
            BidState::EnglishAuction { bids, max } => cmp::min(
                bids.iter()
                    .filter(|b| b.1 >= min)
                    .collect::<Vec<&Bid>>()
                    .len(),
                *max,
            ) as u64,
            BidState::OpenEdition { bids, max } => 0,
        }
    }

    pub fn num_possible_winners(&self) -> u64 {
        match self {
            BidState::EnglishAuction { bids, max } => *max as u64,
            BidState::OpenEdition { bids, max } => 0,
        }
    }

    // Idea is to present winner as index 0 to outside world
    pub fn winner_at(&self, index: usize, min: u64) -> Option<Pubkey> {
        match self {
            BidState::EnglishAuction { bids, max } => {
                if index < *max && index < bids.len() {
                    let bid = &bids[bids.len() - index - 1];
                    if bid.1 >= min {
                        Some(bids[bids.len() - index - 1].0)
                    } else {
                        None
                    }
                } else {
                    None
                }
            }
            BidState::OpenEdition { bids, max } => None,
        }
    }
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq, Debug)]
pub enum WinnerLimit {
    Unlimited(usize),
    Capped(usize),
}

pub const BIDDER_METADATA_LEN: usize = 32 + 32 + 8 + 8 + 1;
/// Models a set of metadata for a bidder, meant to be stored in a PDA. This allows looking up
/// information about a bidder regardless of if they have won, lost or cancelled.
#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq, Debug)]
pub struct BidderMetadata {
    // Relationship with the bidder who's metadata this covers.
    pub bidder_pubkey: Pubkey,
    // Relationship with the auction this bid was placed on.
    pub auction_pubkey: Pubkey,
    // Amount that the user bid.
    pub last_bid: u64,
    // Tracks the last time this user bid.
    pub last_bid_timestamp: UnixTimestamp,
    // Whether the last bid the user made was cancelled. This should also be enough to know if the
    // user is a winner, as if cancelled it implies previous bids were also cancelled.
    pub cancelled: bool,
}

impl BidderMetadata {
    pub fn from_account_info(a: &AccountInfo) -> Result<BidderMetadata, ProgramError> {
        if a.data_len() != BIDDER_METADATA_LEN {
            return Err(AuctionError::DataTypeMismatch.into());
        }

        let bidder_meta: BidderMetadata = try_from_slice_unchecked(&a.data.borrow_mut())?;

        Ok(bidder_meta)
    }
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq)]
pub struct BidderPot {
    /// Points at actual pot that is a token account
    pub bidder_pot: Pubkey,
    /// Originating bidder account
    pub bidder_act: Pubkey,
    /// Auction account
    pub auction_act: Pubkey,
    /// emptied or not
    pub emptied: bool,
}

impl BidderPot {
    pub fn from_account_info(a: &AccountInfo) -> Result<BidderPot, ProgramError> {
        if a.data_len() != mem::size_of::<BidderPot>() {
            return Err(AuctionError::DataTypeMismatch.into());
        }

        let bidder_pot: BidderPot = try_from_slice_unchecked(&a.data.borrow_mut())?;

        Ok(bidder_pot)
    }
}
