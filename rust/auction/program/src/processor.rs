use crate::errors::AuctionError;
use arrayref::array_ref;
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::AccountInfo, borsh::try_from_slice_unchecked, clock::UnixTimestamp,
    entrypoint::ProgramResult, hash::Hash, msg, program_error::ProgramError, pubkey::Pubkey,
};
use std::{cell::Ref, cmp, mem};

// Declare submodules, each contains a single handler for each instruction variant in the program.
pub mod cancel_bid;
pub mod claim_bid;
pub mod create_auction;
pub mod create_auction_v2;
pub mod end_auction;
pub mod place_bid;
pub mod set_authority;
pub mod start_auction;

// Re-export submodules handlers + associated types for other programs to consume.
pub use cancel_bid::*;
pub use claim_bid::*;
pub use create_auction::*;
pub use create_auction_v2::*;
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
        AuctionInstruction::CreateAuction(args) => {
            create_auction(program_id, accounts, args, None, None)
        }
        AuctionInstruction::CreateAuctionV2(args) => create_auction_v2(program_id, accounts, args),
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
// NOTE: New research suggests u32s are used for vecs in borsh, not u64s, so the first extra 8 should be a 4
// but for legacy reasons we leave it behind.
pub const BASE_AUCTION_DATA_SIZE: usize = 32 + 32 + 9 + 9 + 9 + 9 + 1 + 32 + 1 + 8 + 8 + 8;
pub const BID_LENGTH: usize = 32 + 8;
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

// Alias for auction name.
pub type AuctionName = [u8; 32];

pub const MAX_AUCTION_DATA_EXTENDED_SIZE: usize = 8 + 9 + 2 + 9 + 33 + 158;
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
    /// Instant sale price
    pub instant_sale_price: Option<u64>,
    /// Auction name
    pub name: Option<AuctionName>,
}

impl AuctionDataExtended {
    pub fn from_account_info(a: &AccountInfo) -> Result<AuctionDataExtended, ProgramError> {
        if a.data_len() != MAX_AUCTION_DATA_EXTENDED_SIZE {
            return Err(AuctionError::DataTypeMismatch.into());
        }

        let auction_extended: AuctionDataExtended = try_from_slice_unchecked(&a.data.borrow_mut())?;

        Ok(auction_extended)
    }

    pub fn get_instant_sale_price<'a>(data: &'a Ref<'a, &'a mut [u8]>) -> Option<u64> {
        if let Some(idx) = Self::find_instant_sale_beginning(data) {
            Some(u64::from_le_bytes(*array_ref![data, idx, 8]))
        } else {
            None
        }
    }

    fn find_instant_sale_beginning<'a>(data: &'a Ref<'a, &'a mut [u8]>) -> Option<usize> {
        // total_uncancelled_bids + tick_size Option
        let mut instant_sale_beginning = 8;

        // gaps for tick_size and gap_tick_size_percentage
        let gaps = [9, 2];

        for gap in gaps.iter() {
            if data[instant_sale_beginning] == 1 {
                instant_sale_beginning += gap;
            } else {
                instant_sale_beginning += 1;
            }
        }

        // check if instant_sale_price has some value
        if data[instant_sale_beginning] == 1 {
            Some(instant_sale_beginning + 1)
        } else {
            None
        }
    }
}

impl AuctionData {
    // Cheap methods to get at AuctionData without supremely expensive borsh deserialization calls.

    pub fn get_token_mint(a: &AccountInfo) -> Pubkey {
        let data = a.data.borrow();
        let token_mint_data = array_ref![data, 32, 32];
        Pubkey::new_from_array(*token_mint_data)
    }

    pub fn get_state(a: &AccountInfo) -> Result<AuctionState, ProgramError> {
        // Remove the +1 to get rid of first byte of first bid, then -4 to subtract the u32 that is vec size of bids,
        // now we're back at the beginning of the u32, -1 again to get to state
        let bid_state_beginning = AuctionData::find_bid_state_beginning(a) - 1 - 4 - 1;
        match a.data.borrow()[bid_state_beginning] {
            0 => Ok(AuctionState::Created),
            1 => Ok(AuctionState::Started),
            2 => Ok(AuctionState::Ended),
            _ => Err(ProgramError::InvalidAccountData),
        }
    }

    pub fn get_num_winners(a: &AccountInfo) -> usize {
        let (bid_state_beginning, num_elements, max) = AuctionData::get_vec_info(a);
        std::cmp::min(num_elements, max)
    }

    fn find_bid_state_beginning(a: &AccountInfo) -> usize {
        let data = a.data.borrow();
        let mut bid_state_beginning = 32 + 32;

        for i in 0..4 {
            // One for each unix timestamp
            if data[bid_state_beginning] == 1 {
                bid_state_beginning += 9
            } else {
                bid_state_beginning += 1;
            }
        }

        // Finally add price floor (enum + hash) and state, then the u32,
        // then add 1 to position at the beginning of first bid.
        bid_state_beginning += 1 + 32 + 1 + 4 + 1;
        return bid_state_beginning;
    }

    fn get_vec_info(a: &AccountInfo) -> (usize, usize, usize) {
        let bid_state_beginning = AuctionData::find_bid_state_beginning(a);
        let data = a.data.borrow();

        let num_elements_data = array_ref![data, bid_state_beginning - 4, 4];
        let num_elements = u32::from_le_bytes(*num_elements_data) as usize;
        let max_data = array_ref![data, bid_state_beginning + BID_LENGTH * num_elements, 8];
        let max = u64::from_le_bytes(*max_data) as usize;

        (bid_state_beginning, num_elements, max)
    }

    pub fn get_is_winner(a: &AccountInfo, key: &Pubkey) -> Option<usize> {
        let bid_state_beginning = AuctionData::find_bid_state_beginning(a);
        let data = a.data.borrow();
        let as_bytes = key.to_bytes();
        let (bid_state_beginning, num_elements, max) = AuctionData::get_vec_info(a);
        for idx in 0..std::cmp::min(num_elements, max) {
            match AuctionData::get_winner_at_inner(
                &a.data.borrow(),
                idx,
                bid_state_beginning,
                num_elements,
                max,
            ) {
                Some(bid_key) => {
                    // why deserialize the entire key to compare the two with a short circuit comparison
                    // when we can compare them immediately?
                    let mut matching = true;
                    for bid_key_idx in 0..32 {
                        if bid_key[bid_key_idx] != as_bytes[bid_key_idx] {
                            matching = false;
                            break;
                        }
                    }
                    if matching {
                        return Some(idx as usize);
                    }
                }
                None => return None,
            }
        }
        None
    }

    pub fn get_winner_at(a: &AccountInfo, idx: usize) -> Option<Pubkey> {
        let (bid_state_beginning, num_elements, max) = AuctionData::get_vec_info(a);
        match AuctionData::get_winner_at_inner(
            &a.data.borrow(),
            idx,
            bid_state_beginning,
            num_elements,
            max,
        ) {
            Some(bid_key) => Some(Pubkey::new_from_array(*bid_key)),
            None => None,
        }
    }

    fn get_winner_at_inner<'a>(
        data: &'a Ref<'a, &'a mut [u8]>,
        idx: usize,
        bid_state_beginning: usize,
        num_elements: usize,
        max: usize,
    ) -> Option<&'a [u8; 32]> {
        if idx + 1 > num_elements || idx + 1 > max {
            return None;
        }
        Some(array_ref![
            data,
            bid_state_beginning + (num_elements - idx - 1) * BID_LENGTH,
            32
        ])
    }

    pub fn get_winner_bid_amount_at(a: &AccountInfo, idx: usize) -> Option<u64> {
        let (bid_state_beginning, num_elements, max) = AuctionData::get_vec_info(a);
        match AuctionData::get_winner_bid_amount_at_inner(
            &a.data.borrow(),
            idx,
            bid_state_beginning,
            num_elements,
            max,
        ) {
            Some(bid_amount) => Some(bid_amount),
            None => None,
        }
    }

    fn get_winner_bid_amount_at_inner<'a>(
        data: &'a Ref<'a, &'a mut [u8]>,
        idx: usize,
        bid_state_beginning: usize,
        num_elements: usize,
        max: usize,
    ) -> Option<u64> {
        if idx + 1 > num_elements || idx + 1 > max {
            return None;
        }
        Some(u64::from_le_bytes(*array_ref![
            data,
            bid_state_beginning + (num_elements - idx - 1) * BID_LENGTH + 32,
            8
        ]))
    }

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
                    let next_bid_time = last
                        .checked_add(gap)
                        .ok_or(AuctionError::NumericalOverflowError)?;

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
        self.bid_state.num_winners()
    }

    pub fn num_possible_winners(&self) -> u64 {
        self.bid_state.num_possible_winners()
    }

    pub fn winner_at(&self, idx: usize) -> Option<Pubkey> {
        self.bid_state.winner_at(idx)
    }

    pub fn consider_instant_bid(&mut self, instant_sale_price: Option<u64>) {
        // Check if all the lots were sold with instant_sale_price
        if let Some(price) = instant_sale_price {
            if self
                .bid_state
                .lowest_winning_bid_is_instant_bid_price(price)
            {
                msg!("All the lots were sold with instant_sale_price, auction is ended");
                self.state = AuctionState::Ended;
            }
        }
    }

    pub fn place_bid(
        &mut self,
        bid: Bid,
        tick_size: Option<u64>,
        gap_tick_size_percentage: Option<u8>,
        now: UnixTimestamp,
        instant_sale_price: Option<u64>,
    ) -> Result<(), ProgramError> {
        let gap_val = match self.ended_at {
            Some(end) => {
                // We use the actual gap tick size perc if we're in gap window,
                // otherwise we pass in none so the logic isnt used
                if now > end {
                    gap_tick_size_percentage
                } else {
                    None
                }
            }
            None => None,
        };
        let minimum = match self.price_floor {
            PriceFloor::MinimumPrice(min) => min[0],
            _ => 0,
        };

        self.bid_state.place_bid(
            bid,
            tick_size,
            gap_val,
            minimum,
            instant_sale_price,
            &mut self.state,
        )?;

        self.consider_instant_bid(instant_sale_price);

        Ok(())
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
            AuctionState::Created => Ok(AuctionState::Ended),
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

    fn assert_valid_tick_size_bid(bid: &Bid, tick_size: Option<u64>) -> ProgramResult {
        if let Some(tick) = tick_size {
            if bid.1.checked_rem(tick) != Some(0) {
                msg!(
                    "This bid {:?} is not a multiple of tick size {:?}, throw it out.",
                    bid.1,
                    tick_size
                );
                return Err(AuctionError::BidMustBeMultipleOfTickSize.into());
            }
        } else {
            msg!("No tick size on this auction")
        }

        Ok(())
    }

    fn assert_valid_gap_insertion(
        gap_tick: u8,
        beaten_bid: &Bid,
        beating_bid: &Bid,
    ) -> ProgramResult {
        // Use u128 to avoid potential overflow due to temporary mult of 100x since
        // we haven't divided yet.
        let mut minimum_bid_amount: u128 = (beaten_bid.1 as u128)
            .checked_mul((100 + gap_tick) as u128)
            .ok_or(AuctionError::NumericalOverflowError)?;
        minimum_bid_amount = minimum_bid_amount
            .checked_div(100u128)
            .ok_or(AuctionError::NumericalOverflowError)?;

        if minimum_bid_amount > beating_bid.1 as u128 {
            msg!("Rejecting inserting this bid due to gap tick size of {:?} which causes min bid of {:?} from {:?} which is the bid it is trying to beat", gap_tick, minimum_bid_amount.to_string(), beaten_bid.1);
            return Err(AuctionError::GapBetweenBidsTooSmall.into());
        }

        Ok(())
    }

    /// Push a new bid into the state, this succeeds only if the bid is larger than the current top
    /// winner stored. Crappy list information to start with.
    pub fn place_bid(
        &mut self,
        bid: Bid,
        tick_size: Option<u64>,
        gap_tick_size_percentage: Option<u8>,
        minimum: u64,
        instant_sale_price: Option<u64>,
        auction_state: &mut AuctionState,
    ) -> Result<(), ProgramError> {
        msg!("Placing bid {:?}", &bid.1.to_string());
        BidState::assert_valid_tick_size_bid(&bid, tick_size)?;
        if bid.1 < minimum {
            return Err(AuctionError::BidTooSmall.into());
        }

        match self {
            // In a capped auction, track the limited number of winners.
            BidState::EnglishAuction { ref mut bids, max } => {
                match bids.last() {
                    Some(top) => {
                        msg!("Looking to go over the loop, but check tick size first");

                        for i in (0..bids.len()).rev() {
                            msg!("Comparison of {:?} and {:?} for {:?}", bids[i].1, bid.1, i);
                            if bids[i].1 < bid.1 {
                                if let Some(gap_tick) = gap_tick_size_percentage {
                                    BidState::assert_valid_gap_insertion(gap_tick, &bids[i], &bid)?
                                }

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
                                if let Some(gap_tick) = gap_tick_size_percentage {
                                    if gap_tick > 0 {
                                        msg!("Rejecting same-bid insert due to gap tick size of {:?}", gap_tick);
                                        return Err(AuctionError::GapBetweenBidsTooSmall.into());
                                    }
                                }

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
                }
            }

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

    pub fn num_winners(&self) -> u64 {
        match self {
            BidState::EnglishAuction { bids, max } => cmp::min(bids.len(), *max) as u64,
            BidState::OpenEdition { bids, max } => 0,
        }
    }

    pub fn num_possible_winners(&self) -> u64 {
        match self {
            BidState::EnglishAuction { bids, max } => *max as u64,
            BidState::OpenEdition { bids, max } => 0,
        }
    }

    /// Idea is to present #1 winner as index 0 to outside world with this method
    pub fn winner_at(&self, index: usize) -> Option<Pubkey> {
        match self {
            BidState::EnglishAuction { bids, max } => {
                if index < *max && index < bids.len() {
                    let bid = &bids[bids.len() - index - 1];
                    Some(bids[bids.len() - index - 1].0)
                } else {
                    None
                }
            }
            BidState::OpenEdition { bids, max } => None,
        }
    }

    pub fn lowest_winning_bid_is_instant_bid_price(&self, instant_sale_amount: u64) -> bool {
        match self {
            // In a capped auction, track the limited number of winners.
            BidState::EnglishAuction { bids, max } => {
                // bids.len() - max = index of the last winner bid
                bids.len() >= *max && bids[bids.len() - *max].1 >= instant_sale_amount
            }
            _ => false,
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
