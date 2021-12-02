use solana_program::msg;

use {
    crate::{
        deprecated_state::AuctionManagerV1, error::MetaplexError, utils::try_from_slice_checked,
    },
    arrayref::{array_mut_ref, array_ref, mut_array_refs},
    borsh::{BorshDeserialize, BorshSerialize},
    metaplex_auction::processor::AuctionData,
    metaplex_token_metadata::state::Metadata,
    metaplex_token_vault::state::SafetyDepositBox,
    solana_program::{
        account_info::AccountInfo, entrypoint::ProgramResult, program_error::ProgramError,
        pubkey::Pubkey,
    },
    std::cell::{Ref, RefMut},
};
/// prefix used for PDAs to avoid certain collision attacks (https://en.wikipedia.org/wiki/Collision_attack#Chosen-prefix_collision_attack)
pub const PREFIX: &str = "metaplex";
pub const TOTALS: &str = "totals";
pub const INDEX: &str = "index";
pub const CACHE: &str = "cache";
pub const CONFIG: &str = "config";
pub const BASE_TRACKER_SIZE: usize = 1 + 1 + 1 + 4;

pub const MAX_INDEXED_ELEMENTS: usize = 100;
pub const MAX_STORE_INDEXER_SIZE: usize = 1 + //key
32 + //store
8 + //page
4 + // how many elements are in the vec
32*MAX_INDEXED_ELEMENTS; // size of indexed auction keys

pub const MAX_METADATA_PER_CACHE: usize = 10;
pub const MAX_AUCTION_CACHE_SIZE: usize = 1 + //key
32 + //store
8 + // timestamp
4 + // metadata count
32*MAX_METADATA_PER_CACHE + //metadata
32 + // auction
32 + // vault
32; // auction manager

pub const MAX_AUCTION_MANAGER_V2_SIZE: usize = 1 + //key
32 + // store
32 + // authority
32 + // auction
32 + // vault
32 + // accept_payment
1 + // has participation
1 + //status
8 + // winning configs validated
200; // padding
pub const MAX_STORE_SIZE: usize = 2 + // Store Version Key 
32 + // Auction Program Key
32 + // Token Vault Program Key
32 + // Token Metadata Program Key
32 + // Token Program Key
100; // Padding;
pub const MAX_STORE_CONFIG_V1_SIZE: usize = 2 + // StoreConfig Version Key 
200 + // Settings Uri Len
100; // Padding;
pub const MAX_WHITELISTED_CREATOR_SIZE: usize = 2 + 32 + 10;
pub const MAX_PAYOUT_TICKET_SIZE: usize = 1 + 32 + 8;
pub const MAX_BID_REDEMPTION_TICKET_SIZE: usize = 3;
pub const MAX_AUTHORITY_LOOKUP_SIZE: usize = 33;
pub const MAX_PRIZE_TRACKING_TICKET_SIZE: usize = 1 + 32 + 8 + 8 + 8 + 50;
pub const BASE_SAFETY_CONFIG_SIZE: usize = 1 +// Key
 32 + // auction manager lookup
 8 + // order
 1 + // winning config type
 1 + // amount tuple type
 1 + // length tuple type
 4 + // u32 for amount range vec
 1 + // participation config option
 1 + // winning constraint
 1 + // non winning constraint
 9 + // fixed price + option of it
 1 + // participation state option
 8 + // collected to accept payment
 20; // padding

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq, Debug, Copy)]
pub enum Key {
    Uninitialized,
    OriginalAuthorityLookupV1,
    BidRedemptionTicketV1,
    StoreV1,
    WhitelistedCreatorV1,
    PayoutTicketV1,
    SafetyDepositValidationTicketV1,
    AuctionManagerV1,
    PrizeTrackingTicketV1,
    SafetyDepositConfigV1,
    AuctionManagerV2,
    BidRedemptionTicketV2,
    AuctionWinnerTokenTypeTrackerV1,
    StoreIndexerV1,
    AuctionCacheV1,
    StoreConfigV1,
}

pub struct CommonWinningIndexChecks<'a> {
    pub safety_deposit_info: &'a AccountInfo<'a>,
    pub winning_index: usize,
    pub auction_manager_v1_ignore_claim: bool,
    pub safety_deposit_config_info: Option<&'a AccountInfo<'a>>,
}

pub struct PrintingV2CalculationChecks<'a> {
    pub safety_deposit_info: &'a AccountInfo<'a>,
    pub winning_index: usize,
    pub auction_manager_v1_ignore_claim: bool,
    pub safety_deposit_config_info: Option<&'a AccountInfo<'a>>,
    pub short_circuit_total: bool,
    pub edition_offset: u64,
    pub winners: usize,
}

pub struct CommonWinningIndexReturn {
    pub amount: u64,
    pub winning_config_type: WinningConfigType,
    pub winning_config_item_index: Option<usize>,
}

pub struct PrintingV2CalculationCheckReturn {
    pub expected_redemptions: u64,
    pub winning_config_type: WinningConfigType,
    pub winning_config_item_index: Option<usize>,
}

pub trait AuctionManager {
    fn key(&self) -> Key;
    fn store(&self) -> Pubkey;
    fn authority(&self) -> Pubkey;
    fn auction(&self) -> Pubkey;
    fn vault(&self) -> Pubkey;
    fn accept_payment(&self) -> Pubkey;
    fn status(&self) -> AuctionManagerStatus;
    fn set_status(&mut self, status: AuctionManagerStatus);
    fn configs_validated(&self) -> u64;
    fn set_configs_validated(&mut self, new_configs_validated: u64);
    fn save(&self, account: &AccountInfo) -> ProgramResult;
    fn fast_save(
        &self,
        account: &AccountInfo,
        winning_config_index: usize,
        winning_config_item_index: usize,
    );
    fn common_winning_index_checks(
        &self,
        args: CommonWinningIndexChecks,
    ) -> Result<CommonWinningIndexReturn, ProgramError>;

    fn printing_v2_calculation_checks(
        &self,
        args: PrintingV2CalculationChecks,
    ) -> Result<PrintingV2CalculationCheckReturn, ProgramError>;

    fn get_participation_config(
        &self,
        safety_deposit_config_info: &AccountInfo,
    ) -> Result<ParticipationConfigV2, ProgramError>;

    fn add_to_collected_payment(
        &mut self,
        safety_deposit_config_info: &AccountInfo,
        price: u64,
    ) -> ProgramResult;

    fn assert_legacy_printing_token_match(&self, account: &AccountInfo) -> ProgramResult;
    fn get_max_bids_allowed_before_removal_is_stopped(
        &self,
        safety_deposit_box_order: u64,
        safety_deposit_config_info: Option<&AccountInfo>,
    ) -> Result<usize, ProgramError>;

    fn assert_is_valid_master_edition_v2_safety_deposit(
        &self,
        safety_deposit_box_order: u64,
        safety_deposit_config_info: Option<&AccountInfo>,
    ) -> ProgramResult;

    fn mark_bid_as_claimed(&mut self, winner_index: usize) -> ProgramResult;

    fn assert_all_bids_claimed(&self, auction: &AuctionData) -> ProgramResult;

    fn get_number_of_unique_token_types_for_this_winner(
        &self,
        winner_index: usize,
        auction_token_tracker_info: Option<&AccountInfo>,
    ) -> Result<u128, ProgramError>;

    fn get_collected_to_accept_payment(
        &self,
        safety_deposit_config_info: Option<&AccountInfo>,
    ) -> Result<u128, ProgramError>;

    fn get_primary_sale_happened(
        &self,
        metadata: &Metadata,
        winning_config_index: Option<u8>,
        winning_config_item_index: Option<u8>,
    ) -> Result<bool, ProgramError>;

    fn assert_winning_config_safety_deposit_validity(
        &self,
        safety_deposit: &SafetyDepositBox,
        winning_config_index: Option<u8>,
        winning_config_item_index: Option<u8>,
    ) -> ProgramResult;
}

pub fn get_auction_manager(account: &AccountInfo) -> Result<Box<dyn AuctionManager>, ProgramError> {
    let version = account.data.borrow()[0];

    // For some reason when converting Key to u8 here, it becomes unreachable. Use direct constant instead.
    match version {
        7 => return Ok(Box::new(AuctionManagerV1::from_account_info(account)?)),
        10 => return Ok(Box::new(AuctionManagerV2::from_account_info(account)?)),
        _ => return Err(MetaplexError::DataTypeMismatch.into()),
    };
}
#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug)]
pub struct AuctionManagerV2 {
    pub key: Key,

    pub store: Pubkey,

    pub authority: Pubkey,

    pub auction: Pubkey,

    pub vault: Pubkey,

    pub accept_payment: Pubkey,

    pub state: AuctionManagerStateV2,
}

impl AuctionManager for AuctionManagerV2 {
    fn key(&self) -> Key {
        self.key
    }

    fn store(&self) -> Pubkey {
        self.store
    }

    fn authority(&self) -> Pubkey {
        self.authority
    }

    fn auction(&self) -> Pubkey {
        self.auction
    }

    fn vault(&self) -> Pubkey {
        self.vault
    }

    fn accept_payment(&self) -> Pubkey {
        self.accept_payment
    }

    fn status(&self) -> AuctionManagerStatus {
        self.state.status
    }

    fn fast_save(
        &self,
        account: &AccountInfo,
        _winning_config_index: usize,
        _winning_config_item_index: usize,
    ) {
        let mut data = account.data.borrow_mut();
        data[161] = self.state.status as u8;
    }

    fn common_winning_index_checks(
        &self,
        args: CommonWinningIndexChecks,
    ) -> Result<CommonWinningIndexReturn, ProgramError> {
        let CommonWinningIndexChecks {
            safety_deposit_config_info,
            safety_deposit_info: _s,
            winning_index,
            auction_manager_v1_ignore_claim: _a,
        } = args;

        if let Some(config) = safety_deposit_config_info {
            Ok(CommonWinningIndexReturn {
                amount: SafetyDepositConfig::find_amount_and_cumulative_offset(
                    config,
                    winning_index as u64,
                    None,
                )?
                .amount,
                winning_config_type: SafetyDepositConfig::get_winning_config_type(config)?,
                // not used
                winning_config_item_index: Some(0),
            })
        } else {
            return Err(MetaplexError::InvalidOperation.into());
        }
    }

    fn printing_v2_calculation_checks(
        &self,
        args: PrintingV2CalculationChecks,
    ) -> Result<PrintingV2CalculationCheckReturn, ProgramError> {
        let PrintingV2CalculationChecks {
            safety_deposit_config_info,
            safety_deposit_info: _s,
            winning_index,
            auction_manager_v1_ignore_claim: _a,
            short_circuit_total: _ss,
            edition_offset,
            winners,
        } = args;
        if let Some(config) = safety_deposit_config_info {
            let derived_results = SafetyDepositConfig::find_amount_and_cumulative_offset(
                config,
                winning_index as u64,
                Some(winners),
            )?;

            let edition_offset_min = derived_results
                .cumulative_amount
                .checked_add(1)
                .ok_or(MetaplexError::NumericalOverflowError)?;
            let edition_offset_max = edition_offset_min
                .checked_add(derived_results.amount)
                .ok_or(MetaplexError::NumericalOverflowError)?;
            if edition_offset < edition_offset_min || edition_offset >= edition_offset_max {
                return Err(MetaplexError::InvalidEditionNumber.into());
            }

            Ok(PrintingV2CalculationCheckReturn {
                // NOTE this total will be WRONG if short circuit is TRUE. But also it wont be USED if it's true!
                expected_redemptions: derived_results.total_amount,
                winning_config_type: SafetyDepositConfig::get_winning_config_type(config)?,
                // not used
                winning_config_item_index: Some(0),
            })
        } else {
            return Err(MetaplexError::InvalidOperation.into());
        }
    }

    fn set_status(&mut self, status: AuctionManagerStatus) {
        self.state.status = status
    }

    fn configs_validated(&self) -> u64 {
        self.state.safety_config_items_validated
    }

    fn set_configs_validated(&mut self, new_configs_validated: u64) {
        self.state.safety_config_items_validated = new_configs_validated
    }

    fn save(&self, account: &AccountInfo) -> ProgramResult {
        self.serialize(&mut *account.data.borrow_mut())?;
        Ok(())
    }

    fn get_participation_config(
        &self,
        safety_deposit_config_info: &AccountInfo,
    ) -> Result<ParticipationConfigV2, ProgramError> {
        let safety_config = SafetyDepositConfig::from_account_info(safety_deposit_config_info)?;
        if let Some(p_config) = safety_config.participation_config {
            Ok(p_config)
        } else {
            return Err(MetaplexError::NotEligibleForParticipation.into());
        }
    }

    fn add_to_collected_payment(
        &mut self,
        safety_deposit_config_info: &AccountInfo,
        price: u64,
    ) -> ProgramResult {
        let mut safety_config = SafetyDepositConfig::from_account_info(safety_deposit_config_info)?;

        if let Some(state) = &safety_config.participation_state {
            // Can't really edit something behind an Option reference...
            // just make new one.
            safety_config.participation_state = Some(ParticipationStateV2 {
                collected_to_accept_payment: state
                    .collected_to_accept_payment
                    .checked_add(price)
                    .ok_or(MetaplexError::NumericalOverflowError)?,
            });
            safety_config.save_participation_state(safety_deposit_config_info)
        }

        Ok(())
    }

    fn assert_legacy_printing_token_match(&self, _account: &AccountInfo) -> ProgramResult {
        // You cannot use MEV1s with auth tokens with V2 auction managers, so if somehow this is called,
        // throw an error.
        return Err(MetaplexError::PrintingAuthorizationTokenAccountMismatch.into());
    }

    fn get_max_bids_allowed_before_removal_is_stopped(
        &self,
        _safety_deposit_box_order: u64,
        safety_deposit_config_info: Option<&AccountInfo>,
    ) -> Result<usize, ProgramError> {
        if let Some(config) = safety_deposit_config_info {
            let safety_config = SafetyDepositConfig::from_account_info(config)?;
            let mut current_offset: u64 = 0;
            for n in safety_config.amount_ranges {
                if n.0 > 0 {
                    return Ok(current_offset as usize);
                } else {
                    current_offset = current_offset
                        .checked_add(n.1)
                        .ok_or(MetaplexError::NumericalOverflowError)?;
                }
            }

            Ok(0)
        } else {
            return Err(MetaplexError::InvalidOperation.into());
        }
    }

    fn assert_is_valid_master_edition_v2_safety_deposit(
        &self,
        _safety_deposit_box_order: u64,
        safety_deposit_config_info: Option<&AccountInfo>,
    ) -> ProgramResult {
        if let Some(config) = safety_deposit_config_info {
            let safety_config = SafetyDepositConfig::from_account_info(config)?;

            if safety_config.winning_config_type != WinningConfigType::PrintingV2
                && safety_config.winning_config_type != WinningConfigType::Participation
            {
                return Err(MetaplexError::InvalidOperation.into());
            }

            Ok(())
        } else {
            return Err(MetaplexError::InvalidOperation.into());
        }
    }

    fn mark_bid_as_claimed(&mut self, _winner_index: usize) -> ProgramResult {
        self.state.bids_pushed_to_accept_payment = self
            .state
            .bids_pushed_to_accept_payment
            .checked_add(1)
            .ok_or(MetaplexError::NumericalOverflowError)?;

        Ok(())
    }

    fn assert_all_bids_claimed(&self, auction: &AuctionData) -> ProgramResult {
        if self.state.bids_pushed_to_accept_payment != auction.num_winners() {
            return Err(MetaplexError::NotAllBidsClaimed.into());
        }

        Ok(())
    }

    fn get_number_of_unique_token_types_for_this_winner(
        &self,
        winner_index: usize,
        auction_token_tracker_info: Option<&AccountInfo>,
    ) -> Result<u128, ProgramError> {
        if let Some(tracker_info) = auction_token_tracker_info {
            let tracker = AuctionWinnerTokenTypeTracker::from_account_info(tracker_info)?;
            let mut start: u64 = 0;
            for range in tracker.amount_ranges {
                let end = start
                    .checked_add(range.1)
                    .ok_or(MetaplexError::NumericalOverflowError)?;
                if winner_index >= start as usize && winner_index < end as usize {
                    return Ok(range.0 as u128);
                } else {
                    start = end
                }
            }

            return Err(MetaplexError::NoTokensForThisWinner.into());
        } else {
            return Err(MetaplexError::InvalidOperation.into());
        }
    }

    fn get_collected_to_accept_payment(
        &self,
        safety_deposit_config_info: Option<&AccountInfo>,
    ) -> Result<u128, ProgramError> {
        if let Some(config) = safety_deposit_config_info {
            let parsed = SafetyDepositConfig::from_account_info(config)?;
            if let Some(p_state) = parsed.participation_state {
                Ok(p_state.collected_to_accept_payment as u128)
            } else {
                Ok(0)
            }
        } else {
            return Err(MetaplexError::InvalidOperation.into());
        }
    }

    fn get_primary_sale_happened(
        &self,
        metadata: &Metadata,
        _winning_config_index: Option<u8>,
        _winning_config_item_index: Option<u8>,
    ) -> Result<bool, ProgramError> {
        // Since auction v2s only support mev2s, and mev2s are always inside
        // the auction all the time, this is a valid thing to do.
        Ok(metadata.primary_sale_happened)
    }

    fn assert_winning_config_safety_deposit_validity(
        &self,
        _safety_deposit: &SafetyDepositBox,
        _winning_config_index: Option<u8>,
        _winning_config_item_index: Option<u8>,
    ) -> ProgramResult {
        // Noop, we dont have winning configs anymore
        Ok(())
    }
}

impl AuctionManagerV2 {
    pub fn from_account_info(a: &AccountInfo) -> Result<AuctionManagerV2, ProgramError> {
        let am: AuctionManagerV2 = try_from_slice_checked(
            &a.data.borrow_mut(),
            Key::AuctionManagerV2,
            MAX_AUCTION_MANAGER_V2_SIZE,
        )?;

        Ok(am)
    }
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug)]
pub struct AuctionManagerStateV2 {
    pub status: AuctionManagerStatus,
    /// When all configs are validated the auction is started and auction manager moves to Running
    pub safety_config_items_validated: u64,
    /// how many bids have been pushed to accept payment
    pub bids_pushed_to_accept_payment: u64,

    pub has_participation: bool,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq, Debug)]
pub struct ParticipationStateV2 {
    /// We have this variable below to keep track in the case of the participation NFTs, whose
    /// income will trickle in over time, how much the artists have in the escrow account and
    /// how much would/should be owed to them if they try to claim it relative to the winning bids.
    /// It's  abit tougher than a straightforward bid which has a price attached to it, because
    /// there are many bids of differing amounts (in the case of GivenForBidPrice) and they dont all
    /// come in at one time, so this little ledger here keeps track.
    pub collected_to_accept_payment: u64,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq, Debug)]
pub struct ParticipationConfigV2 {
    /// Setups:
    /// 1. Winners get participation + not charged extra
    /// 2. Winners dont get participation prize
    pub winner_constraint: WinningConstraint,

    /// Setups:
    /// 1. Losers get prize for free
    /// 2. Losers get prize but pay fixed price
    /// 3. Losers get prize but pay bid price
    pub non_winning_constraint: NonWinningConstraint,

    /// Setting this field disconnects the participation prizes price from the bid. Any bid you submit, regardless
    /// of amount, charges you the same fixed price.
    pub fixed_price: Option<u64>,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq, Debug, Copy)]
pub enum WinningConstraint {
    NoParticipationPrize,
    ParticipationPrizeGiven,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq, Debug, Copy)]
pub enum NonWinningConstraint {
    NoParticipationPrize,
    GivenForFixedPrice,
    GivenForBidPrice,
}

#[repr(C)]
#[derive(Clone, PartialEq, BorshSerialize, BorshDeserialize, Copy, Debug)]
pub enum WinningConfigType {
    /// You may be selling your one-of-a-kind NFT for the first time, but not it's accompanying Metadata,
    /// of which you would like to retain ownership. You get 100% of the payment the first sale, then
    /// royalties forever after.
    ///
    /// You may be re-selling something like a Limited/Open Edition print from another auction,
    /// a master edition record token by itself (Without accompanying metadata/printing ownership), etc.
    /// This means artists will get royalty fees according to the top level royalty % on the metadata
    /// split according to their percentages of contribution.
    ///
    /// No metadata ownership is transferred in this instruction, which means while you may be transferring
    /// the token for a limited/open edition away, you would still be (nominally) the owner of the limited edition
    /// metadata, though it confers no rights or privileges of any kind.
    TokenOnlyTransfer,
    /// Means you are auctioning off the master edition record and it's metadata ownership as well as the
    /// token itself. The other person will be able to mint authorization tokens and make changes to the
    /// artwork.
    FullRightsTransfer,
    /// Means you are using authorization tokens to print off editions during the auction using
    /// from a MasterEditionV1
    PrintingV1,
    /// Means you are using the MasterEditionV2 to print off editions
    PrintingV2,
    /// Means you are using a MasterEditionV2 as a participation prize.
    Participation,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug, PartialEq, Copy)]
pub enum AuctionManagerStatus {
    Initialized,
    Validated,
    Running,
    Disbursing,
    Finished,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Copy)]
pub struct OriginalAuthorityLookup {
    pub key: Key,
    pub original_authority: Pubkey,
}

impl OriginalAuthorityLookup {
    pub fn from_account_info(a: &AccountInfo) -> Result<OriginalAuthorityLookup, ProgramError> {
        let pt: OriginalAuthorityLookup = try_from_slice_checked(
            &a.data.borrow_mut(),
            Key::OriginalAuthorityLookupV1,
            MAX_AUTHORITY_LOOKUP_SIZE,
        )?;

        Ok(pt)
    }
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Copy)]
pub struct PayoutTicket {
    pub key: Key,
    pub recipient: Pubkey,
    pub amount_paid: u64,
}

impl PayoutTicket {
    pub fn from_account_info(a: &AccountInfo) -> Result<PayoutTicket, ProgramError> {
        let pt: PayoutTicket = try_from_slice_checked(
            &a.data.borrow_mut(),
            Key::PayoutTicketV1,
            MAX_PAYOUT_TICKET_SIZE,
        )?;

        Ok(pt)
    }
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize)]
pub struct StoreIndexer {
    pub key: Key,
    pub store: Pubkey,
    pub page: u64,
    pub auction_caches: Vec<Pubkey>,
}

impl StoreIndexer {
    pub fn from_account_info(a: &AccountInfo) -> Result<StoreIndexer, ProgramError> {
        let store: StoreIndexer = try_from_slice_checked(
            &a.data.borrow_mut(),
            Key::StoreIndexerV1,
            MAX_STORE_INDEXER_SIZE,
        )?;

        Ok(store)
    }
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize)]
pub struct AuctionCache {
    pub key: Key,
    pub store: Pubkey,
    pub timestamp: i64,
    pub metadata: Vec<Pubkey>,
    pub auction: Pubkey,
    pub vault: Pubkey,
    pub auction_manager: Pubkey,
}

impl AuctionCache {
    pub fn from_account_info(a: &AccountInfo) -> Result<AuctionCache, ProgramError> {
        let store: AuctionCache = try_from_slice_checked(
            &a.data.borrow_mut(),
            Key::AuctionCacheV1,
            MAX_AUCTION_CACHE_SIZE,
        )?;

        Ok(store)
    }
}
#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Copy)]
pub struct Store {
    pub key: Key,
    pub public: bool,
    pub auction_program: Pubkey,
    pub token_vault_program: Pubkey,
    pub token_metadata_program: Pubkey,
    pub token_program: Pubkey,
}

impl Store {
    pub fn from_account_info(a: &AccountInfo) -> Result<Store, ProgramError> {
        let store: Store =
            try_from_slice_checked(&a.data.borrow_mut(), Key::StoreV1, MAX_STORE_SIZE)?;

        Ok(store)
    }
}
#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize)]
pub struct StoreConfig {
    pub key: Key,
    pub settings_uri: Option<String>,
}
impl StoreConfig {
    pub fn from_account_info(a: &AccountInfo) -> Result<StoreConfig, ProgramError> {
        let store: StoreConfig = try_from_slice_checked(
            &a.data.borrow_mut(),
            Key::StoreConfigV1,
            MAX_STORE_CONFIG_V1_SIZE,
        )?;

        Ok(store)
    }
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Copy)]
pub struct WhitelistedCreator {
    pub key: Key,
    pub address: Pubkey,
    pub activated: bool,
}

impl WhitelistedCreator {
    pub fn from_account_info(a: &AccountInfo) -> Result<WhitelistedCreator, ProgramError> {
        let wc: WhitelistedCreator = try_from_slice_checked(
            &a.data.borrow_mut(),
            Key::WhitelistedCreatorV1,
            MAX_WHITELISTED_CREATOR_SIZE,
        )?;

        Ok(wc)
    }
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Copy, Debug)]
pub struct PrizeTrackingTicket {
    pub key: Key,
    pub metadata: Pubkey,
    pub supply_snapshot: u64,
    pub expected_redemptions: u64,
    pub redemptions: u64,
}

impl PrizeTrackingTicket {
    pub fn from_account_info(a: &AccountInfo) -> Result<PrizeTrackingTicket, ProgramError> {
        let store: PrizeTrackingTicket = try_from_slice_checked(
            &a.data.borrow_mut(),
            Key::PrizeTrackingTicketV1,
            MAX_PRIZE_TRACKING_TICKET_SIZE,
        )?;

        Ok(store)
    }
}

#[repr(C)]
#[derive(Clone, Debug, BorshSerialize, BorshDeserialize, Copy)]
pub struct AmountRange(pub u64, pub u64);

#[repr(C)]
#[derive(Clone, Debug, BorshSerialize, BorshDeserialize, Copy)]
pub enum TupleNumericType {
    // So borsh won't listen to the actual numerical assignment of enum keys
    // If you say U16 = 2 and it's the 2nd element in the enum and U8 = 1 and it's the first
    // element, you would rightly assume encoding a 1 means U8 and a 2 means U16. However
    // borsh assumes still that 0 = U8 and 1 = U16 because U8 appears first and U16 appears second in the enum.
    // It simply ignores your manual assignment and goes purely off order in the enum.
    // Because of how bad it is, we have to shove in these "padding" enums to make sure
    // the values we set are the values it uses even though we dont use them for anything.
    Padding0 = 0,
    U8 = 1,
    U16 = 2,
    Padding1 = 3,
    U32 = 4,
    Padding2 = 5,
    Padding3 = 6,
    Padding4 = 7,
    U64 = 8,
}
// Even though we dont use borsh for serialization to the chain, we do use this as an instruction argument
// and that needs borsh.
#[repr(C)]
#[derive(Clone, Debug, BorshSerialize, BorshDeserialize)]
pub struct SafetyDepositConfig {
    pub key: Key,
    /// reverse lookup
    pub auction_manager: Pubkey,
    // only 255 safety deposits on vault right now but soon this will likely expand.
    /// safety deposit order
    pub order: u64,
    pub winning_config_type: WinningConfigType,
    pub amount_type: TupleNumericType,
    pub length_type: TupleNumericType,
    /// Tuple is (amount of editions or tokens given to people in this range, length of range)
    pub amount_ranges: Vec<AmountRange>,
    /// if winning config type is "Participation" then you use this to parameterize it.
    pub participation_config: Option<ParticipationConfigV2>,
    /// if winning config type is "Participation" then you use this to keep track of it.
    pub participation_state: Option<ParticipationStateV2>,
}

pub struct AmountCumulativeReturn {
    pub amount: u64,
    pub cumulative_amount: u64,
    pub total_amount: u64,
}
const ORDER_POSITION: usize = 33;
const AUCTION_MANAGER_POSITION: usize = 1;
const WINNING_CONFIG_POSITION: usize = 41;
const AMOUNT_POSITION: usize = 42;
const LENGTH_POSITION: usize = 43;
const AMOUNT_RANGE_SIZE_POSITION: usize = 44;
const AMOUNT_RANGE_FIRST_EL_POSITION: usize = 48;

fn get_number_from_data(data: &Ref<&mut [u8]>, data_type: TupleNumericType, offset: usize) -> u64 {
    return match data_type {
        TupleNumericType::U8 => data[offset] as u64,
        TupleNumericType::U16 => u16::from_le_bytes(*array_ref![data, offset, 2]) as u64,
        TupleNumericType::U32 => u32::from_le_bytes(*array_ref![data, offset, 4]) as u64,
        TupleNumericType::U64 => u64::from_le_bytes(*array_ref![data, offset, 8]),
        _ => 0,
    };
}

fn write_amount_type(
    data: &mut RefMut<&mut [u8]>,
    amount_type: TupleNumericType,
    offset: usize,
    range: &AmountRange,
) {
    match amount_type {
        TupleNumericType::U8 => data[offset] = range.0 as u8,
        TupleNumericType::U16 => *array_mut_ref![data, offset, 2] = (range.0 as u16).to_le_bytes(),
        TupleNumericType::U32 => *array_mut_ref![data, offset, 4] = (range.0 as u32).to_le_bytes(),
        TupleNumericType::U64 => *array_mut_ref![data, offset, 8] = range.0.to_le_bytes(),
        _ => (),
    }
}

fn write_length_type(
    data: &mut RefMut<&mut [u8]>,
    length_type: TupleNumericType,
    offset: usize,
    range: &AmountRange,
) {
    match length_type {
        TupleNumericType::U8 => data[offset] = range.1 as u8,
        TupleNumericType::U16 => *array_mut_ref![data, offset, 2] = (range.1 as u16).to_le_bytes(),
        TupleNumericType::U32 => *array_mut_ref![data, offset, 4] = (range.1 as u32).to_le_bytes(),
        TupleNumericType::U64 => *array_mut_ref![data, offset, 8] = range.1.to_le_bytes(),
        _ => (),
    }
}

impl SafetyDepositConfig {
    /// Size of account with padding included
    pub fn created_size(&self) -> usize {
        return BASE_SAFETY_CONFIG_SIZE
            + (self.amount_type as usize + self.length_type as usize) * self.amount_ranges.len();
    }

    pub fn get_order(a: &AccountInfo) -> u64 {
        let data = a.data.borrow();
        return u64::from_le_bytes(*array_ref![data, ORDER_POSITION, 8]);
    }

    pub fn get_auction_manager(a: &AccountInfo) -> Pubkey {
        let data = a.data.borrow();
        return Pubkey::new_from_array(*array_ref![data, AUCTION_MANAGER_POSITION, 32]);
    }

    pub fn get_amount_type(a: &AccountInfo) -> Result<TupleNumericType, ProgramError> {
        let data = &a.data.borrow();

        Ok(match data[AMOUNT_POSITION] {
            1 => TupleNumericType::U8,
            2 => TupleNumericType::U16,
            4 => TupleNumericType::U32,
            8 => TupleNumericType::U64,
            _ => return Err(ProgramError::InvalidAccountData),
        })
    }

    pub fn get_length_type(a: &AccountInfo) -> Result<TupleNumericType, ProgramError> {
        let data = &a.data.borrow();

        Ok(match data[LENGTH_POSITION] {
            1 => TupleNumericType::U8,
            2 => TupleNumericType::U16,
            4 => TupleNumericType::U32,
            8 => TupleNumericType::U64,
            _ => return Err(ProgramError::InvalidAccountData),
        })
    }

    pub fn get_amount_range_len(a: &AccountInfo) -> u32 {
        let data = &a.data.borrow();

        return u32::from_le_bytes(*array_ref![data, AMOUNT_RANGE_SIZE_POSITION, 4]);
    }

    pub fn get_winning_config_type(a: &AccountInfo) -> Result<WinningConfigType, ProgramError> {
        let data = &a.data.borrow();

        Ok(match data[WINNING_CONFIG_POSITION] {
            0 => WinningConfigType::TokenOnlyTransfer,
            1 => WinningConfigType::FullRightsTransfer,
            2 => WinningConfigType::PrintingV1,
            3 => WinningConfigType::PrintingV2,
            4 => WinningConfigType::Participation,
            _ => return Err(ProgramError::InvalidAccountData),
        })
    }

    /// Basically finds what edition offset you should get from 0 for your FIRST edition,
    /// and the amount of editions you should get. If not a PrintingV2 safety deposit, the edition offset
    /// (the cumulative count of all amounts from all people up to yours) is (relatively) meaningless,
    /// but the amount AT your point still represents the amount of tokens you would receive.
    /// Stop at winner index determines what the total roll count will stop at, if none goes all the way through.
    pub fn find_amount_and_cumulative_offset(
        a: &AccountInfo,
        index: u64,
        stop_at_winner_index: Option<usize>,
    ) -> Result<AmountCumulativeReturn, ProgramError> {
        let data = &mut a.data.borrow();

        let amount_type = SafetyDepositConfig::get_amount_type(a)?;

        let length_type = SafetyDepositConfig::get_length_type(a)?;

        let length_of_array = SafetyDepositConfig::get_amount_range_len(a) as usize;

        let mut cumulative_amount: u64 = 0;
        let mut total_amount: u64 = 0;
        let mut amount: u64 = 0;
        let mut current_winner_range_start: u64 = 0;
        let mut offset = AMOUNT_RANGE_FIRST_EL_POSITION;
        let mut not_found = true;
        for _ in 0..length_of_array {
            let amount_each_winner_gets = get_number_from_data(data, amount_type, offset);

            offset += amount_type as usize;

            let length_of_range = get_number_from_data(data, length_type, offset);

            offset += length_type as usize;

            let current_winner_range_end = current_winner_range_start
                .checked_add(length_of_range)
                .ok_or(MetaplexError::NumericalOverflowError)?;
            let to_add = amount_each_winner_gets
                .checked_mul(length_of_range)
                .ok_or(MetaplexError::NumericalOverflowError)?;

            if index >= current_winner_range_start && index < current_winner_range_end {
                let up_to_winner = (index - current_winner_range_start)
                    .checked_mul(amount_each_winner_gets)
                    .ok_or(MetaplexError::NumericalOverflowError)?;
                cumulative_amount = cumulative_amount
                    .checked_add(up_to_winner)
                    .ok_or(MetaplexError::NumericalOverflowError)?;
                amount = amount_each_winner_gets;

                not_found = false;
            } else if current_winner_range_start < index {
                cumulative_amount = cumulative_amount
                    .checked_add(to_add)
                    .ok_or(MetaplexError::NumericalOverflowError)?;
            }

            if let Some(win_index) = stop_at_winner_index {
                let win_index_as_u64 = win_index as u64;
                if win_index_as_u64 >= current_winner_range_start
                    && win_index_as_u64 < current_winner_range_end
                {
                    let up_to_winner = (win_index_as_u64 - current_winner_range_start)
                        .checked_mul(amount_each_winner_gets)
                        .ok_or(MetaplexError::NumericalOverflowError)?;
                    total_amount = total_amount
                        .checked_add(up_to_winner)
                        .ok_or(MetaplexError::NumericalOverflowError)?;
                    break;
                } else if current_winner_range_start < win_index_as_u64 {
                    total_amount = total_amount
                        .checked_add(to_add)
                        .ok_or(MetaplexError::NumericalOverflowError)?;
                }
            } else {
                total_amount = total_amount
                    .checked_add(to_add)
                    .ok_or(MetaplexError::NumericalOverflowError)?;
            }

            current_winner_range_start = current_winner_range_end
        }

        if not_found {
            return Err(MetaplexError::WinnerIndexNotFound.into());
        }

        Ok(AmountCumulativeReturn {
            cumulative_amount,
            total_amount,
            amount,
        })
    }

    pub fn from_account_info(a: &AccountInfo) -> Result<SafetyDepositConfig, ProgramError> {
        let data = &mut a.data.borrow();
        if a.data_len() < BASE_SAFETY_CONFIG_SIZE {
            return Err(MetaplexError::DataTypeMismatch.into());
        }

        if data[0] != Key::SafetyDepositConfigV1 as u8 {
            return Err(MetaplexError::DataTypeMismatch.into());
        }

        let auction_manager = SafetyDepositConfig::get_auction_manager(a);

        let order = SafetyDepositConfig::get_order(a);

        let winning_config_type = SafetyDepositConfig::get_winning_config_type(a)?;

        let amount_type = SafetyDepositConfig::get_amount_type(a)?;

        let length_type = SafetyDepositConfig::get_length_type(a)?;

        let length_of_array = SafetyDepositConfig::get_amount_range_len(a);

        let mut offset: usize = AMOUNT_RANGE_FIRST_EL_POSITION;
        let mut amount_ranges = vec![];
        for _ in 0..length_of_array {
            let amount = get_number_from_data(data, amount_type, offset);

            offset += amount_type as usize;

            let length = get_number_from_data(data, length_type, offset);

            amount_ranges.push(AmountRange(amount, length));
            offset += length_type as usize;
        }

        let participation_config: Option<ParticipationConfigV2> = match data[offset] {
            0 => {
                offset += 1;
                None
            }
            1 => {
                let winner_constraint = match data[offset + 1] {
                    0 => WinningConstraint::NoParticipationPrize,
                    1 => WinningConstraint::ParticipationPrizeGiven,
                    _ => return Err(ProgramError::InvalidAccountData),
                };
                let non_winning_constraint = match data[offset + 2] {
                    0 => NonWinningConstraint::NoParticipationPrize,
                    1 => NonWinningConstraint::GivenForFixedPrice,
                    2 => NonWinningConstraint::GivenForBidPrice,
                    _ => return Err(ProgramError::InvalidAccountData),
                };

                offset += 3;

                let fixed_price: Option<u64> = match data[offset] {
                    0 => {
                        offset += 1;
                        None
                    }
                    1 => {
                        let number = u64::from_le_bytes(*array_ref![data, offset + 1, 8]);
                        offset += 9;
                        Some(number)
                    }
                    _ => return Err(ProgramError::InvalidAccountData),
                };

                Some(ParticipationConfigV2 {
                    winner_constraint,
                    non_winning_constraint,
                    fixed_price,
                })
            }
            _ => return Err(ProgramError::InvalidAccountData),
        };

        let participation_state: Option<ParticipationStateV2> = match data[offset] {
            0 => {
                // offset += 1;
                None
            }
            1 => {
                let collected_to_accept_payment =
                    u64::from_le_bytes(*array_ref![data, offset + 1, 8]);
                // offset += 9;
                Some(ParticipationStateV2 {
                    collected_to_accept_payment,
                })
            }
            _ => return Err(ProgramError::InvalidAccountData),
        };

        // NOTE: Adding more fields? Uncomment the offset adjustments in participation state to keep
        // the math working.

        Ok(SafetyDepositConfig {
            key: Key::SafetyDepositConfigV1,
            auction_manager,
            order,
            winning_config_type,
            amount_type,
            length_type,
            amount_ranges,
            participation_config,
            participation_state,
        })
    }

    pub fn create(&self, a: &AccountInfo, auction_manager_key: &Pubkey) -> ProgramResult {
        let mut data = a.data.borrow_mut();

        data[0] = Key::SafetyDepositConfigV1 as u8;
        // for whatever reason, copy_from_slice doesnt do jack here.
        let as_bytes = auction_manager_key.as_ref();
        for n in 0..32 {
            data[n + 1] = as_bytes[n];
        }
        *array_mut_ref![data, ORDER_POSITION, 8] = self.order.to_le_bytes();
        data[WINNING_CONFIG_POSITION] = self.winning_config_type as u8;
        data[AMOUNT_POSITION] = self.amount_type as u8;
        data[LENGTH_POSITION] = self.length_type as u8;
        *array_mut_ref![data, AMOUNT_RANGE_SIZE_POSITION, 4] =
            (self.amount_ranges.len() as u32).to_le_bytes();
        let mut offset: usize = AMOUNT_RANGE_FIRST_EL_POSITION;
        for range in &self.amount_ranges {
            write_amount_type(&mut data, self.amount_type, offset, range);
            offset += self.amount_type as usize;
            write_length_type(&mut data, self.length_type, offset, range);
            offset += self.length_type as usize;
        }

        match &self.participation_config {
            Some(val) => {
                data[offset] = 1;
                data[offset + 1] = val.winner_constraint as u8;
                data[offset + 2] = val.non_winning_constraint as u8;
                offset += 3;
                match val.fixed_price {
                    Some(val) => {
                        data[offset] = 1;
                        *array_mut_ref![data, offset + 1, 8] = val.to_le_bytes();
                        offset += 9;
                    }
                    None => {
                        data[offset] = 0;
                        offset += 1;
                    }
                }
            }
            None => {
                data[offset] = 0;
                offset += 1;
            }
        }

        match &self.participation_state {
            Some(val) => {
                data[offset] = 1;
                *array_mut_ref![data, offset + 1, 8] =
                    val.collected_to_accept_payment.to_le_bytes();
                //offset += 9;
            }
            None => {
                data[offset] = 0;
                //offset += 1
            }
        }

        // NOTE: Adding more fields? Uncomment the offset adjustments in participation state to keep
        // the math working.
        Ok(())
    }

    /// Smaller method for just participation state saving...saves cpu, and it's the only thing
    /// that will ever change on this model.
    pub fn save_participation_state(&mut self, a: &AccountInfo) {
        let mut data = a.data.borrow_mut();
        let mut offset: usize = AMOUNT_RANGE_FIRST_EL_POSITION
            + self.amount_ranges.len() * (self.amount_type as usize + self.length_type as usize);

        offset += match &self.participation_config {
            Some(val) => {
                let mut total = 4;
                if val.fixed_price.is_some() {
                    total += 8;
                }
                total
            }
            None => 1,
        };

        match &self.participation_state {
            Some(val) => {
                data[offset] = 1;
                *array_mut_ref![data, offset + 1, 8] =
                    val.collected_to_accept_payment.to_le_bytes();
                //offset += 9;
            }
            None => {
                data[offset] = 0;
                //offset += 1
            }
        }

        // NOTE: Adding more fields? Uncomment the offset adjustments in participation state to keep
        // the math working.
    }
}

#[repr(C)]
#[derive(Clone, Debug, BorshSerialize, BorshDeserialize)]
pub struct AuctionWinnerTokenTypeTracker {
    pub key: Key,
    pub amount_type: TupleNumericType,
    pub length_type: TupleNumericType,
    /// Tuple is (amount of editions or tokens given to people in this range, length of range)
    pub amount_ranges: Vec<AmountRange>,
}

impl AuctionWinnerTokenTypeTracker {
    pub fn created_size(&self, range_size: u64) -> usize {
        return BASE_TRACKER_SIZE
            + (self.amount_type as usize + self.length_type as usize) * range_size as usize;
    }
    pub fn from_account_info(
        a: &AccountInfo,
    ) -> Result<AuctionWinnerTokenTypeTracker, ProgramError> {
        let data = &mut a.data.borrow();
        if a.data_len() < BASE_TRACKER_SIZE {
            return Err(MetaplexError::DataTypeMismatch.into());
        }

        if data[0] != Key::AuctionWinnerTokenTypeTrackerV1 as u8 {
            return Err(MetaplexError::DataTypeMismatch.into());
        }

        let amount_type = AuctionWinnerTokenTypeTracker::get_amount_type(a)?;

        let length_type = AuctionWinnerTokenTypeTracker::get_length_type(a)?;

        let length_of_array = AuctionWinnerTokenTypeTracker::get_amount_range_len(a);

        let mut offset: usize = 7;
        let mut amount_ranges = vec![];
        for _ in 0..length_of_array {
            let amount = get_number_from_data(data, amount_type, offset);

            offset += amount_type as usize;

            let length = get_number_from_data(data, length_type, offset);

            amount_ranges.push(AmountRange(amount, length));
            offset += length_type as usize;
        }

        Ok(AuctionWinnerTokenTypeTracker {
            key: Key::AuctionWinnerTokenTypeTrackerV1,
            amount_type,
            length_type,
            amount_ranges,
        })
    }

    pub fn get_amount_type(a: &AccountInfo) -> Result<TupleNumericType, ProgramError> {
        let data = &a.data.borrow();

        Ok(match data[1] {
            1 => TupleNumericType::U8,
            2 => TupleNumericType::U16,
            4 => TupleNumericType::U32,
            8 => TupleNumericType::U64,
            _ => return Err(ProgramError::InvalidAccountData),
        })
    }

    pub fn get_length_type(a: &AccountInfo) -> Result<TupleNumericType, ProgramError> {
        let data = &a.data.borrow();

        Ok(match data[2] {
            1 => TupleNumericType::U8,
            2 => TupleNumericType::U16,
            4 => TupleNumericType::U32,
            8 => TupleNumericType::U64,
            _ => return Err(ProgramError::InvalidAccountData),
        })
    }

    pub fn get_amount_range_len(a: &AccountInfo) -> u32 {
        let data = &a.data.borrow();

        return u32::from_le_bytes(*array_ref![data, 3, 4]);
    }

    /// When there is a range where positive tokens are given in the handed in amount ranges,
    /// this counts as one unique token type, so we need to count that as a range where "1"
    /// new type is given. So we consider that a range of 1 and merge it into our existing ranges of
    /// totals here. So if you have 10 people each getting 1 token type and then you find out
    /// after a new safety deposit config is merged that the 3rd place person is the only person
    /// who gets it, you then end up with three ranges: 1st-2nd place getting 1 type, 3rd place getting 2 types,
    /// and 4th to 10th place getting 1 type.
    pub fn add_one_where_positive_ranges_occur(
        &mut self,
        amount_ranges: &mut Vec<AmountRange>,
    ) -> ProgramResult {
        let mut new_range: Vec<AmountRange> = vec![];

        if self.amount_ranges.len() == 0 {
            self.amount_ranges = amount_ranges
                .iter()
                .map(|x| {
                    if x.0 > 0 {
                        return AmountRange(1, x.1);
                    } else {
                        return AmountRange(0, x.1);
                    }
                })
                .collect();
            return Ok(());
        } else if amount_ranges.len() == 0 {
            return Ok(());
        }

        let mut my_ctr: usize = 0;
        let mut their_ctr: usize = 0;
        while my_ctr < self.amount_ranges.len() || their_ctr < amount_ranges.len() {
            // Cases:
            // 1. nothing in theirs - we win and pop on
            // 2. nothing in ours - they win and pop on
            // 3. our next range is shorter than their next range - we pop on a new range that is the length of our range and +1
            // 4. their next range is shorter than ours - we pop on a new range that is the length of theirs and +1 our range
            // In these cases where we don't use the entire range we need to not increase the counter but we do need to modify the object
            // length to indicate that it is now shorter, for the next iteration.
            // 5. Super degenerate case - they are of equal length

            let mut to_add: u64 = 0;
            if their_ctr < amount_ranges.len() && amount_ranges[their_ctr].0 > 0 {
                to_add = 1;
            }

            if my_ctr == self.amount_ranges.len() {
                new_range.push(AmountRange(to_add, amount_ranges[their_ctr].1));
                their_ctr += 1;
            } else if their_ctr == amount_ranges.len() {
                new_range.push(self.amount_ranges[my_ctr]);
                my_ctr += 1;
            } else if self.amount_ranges[my_ctr].1 > amount_ranges[their_ctr].1 {
                self.amount_ranges[my_ctr].1 = self.amount_ranges[my_ctr]
                    .1
                    .checked_sub(amount_ranges[their_ctr].1)
                    .ok_or(MetaplexError::NumericalOverflowError)?;

                new_range.push(AmountRange(
                    self.amount_ranges[my_ctr]
                        .0
                        .checked_add(to_add)
                        .ok_or(MetaplexError::NumericalOverflowError)?,
                    amount_ranges[their_ctr].1,
                ));

                their_ctr += 1;
                // dont increment my_ctr since i still have length to give
            } else if amount_ranges[their_ctr].1 > self.amount_ranges[my_ctr].1 {
                amount_ranges[their_ctr].1 = amount_ranges[their_ctr]
                    .1
                    .checked_sub(self.amount_ranges[my_ctr].1)
                    .ok_or(MetaplexError::NumericalOverflowError)?;

                new_range.push(AmountRange(
                    self.amount_ranges[my_ctr]
                        .0
                        .checked_add(to_add)
                        .ok_or(MetaplexError::NumericalOverflowError)?,
                    self.amount_ranges[my_ctr].1,
                ));

                my_ctr += 1;
                // dont increment their_ctr since they still have length to give
            } else if amount_ranges[their_ctr].1 == self.amount_ranges[my_ctr].1 {
                new_range.push(AmountRange(
                    self.amount_ranges[my_ctr]
                        .0
                        .checked_add(to_add)
                        .ok_or(MetaplexError::NumericalOverflowError)?,
                    self.amount_ranges[my_ctr].1,
                ));
                // Move them both in this degen case
                my_ctr += 1;
                their_ctr += 1;
            }
        }

        self.amount_ranges = new_range;
        Ok(())
    }

    pub fn save(&self, a: &AccountInfo) {
        let mut data = a.data.borrow_mut();
        data[0] = Key::AuctionWinnerTokenTypeTrackerV1 as u8;
        data[1] = self.amount_type as u8;
        data[2] = self.length_type as u8;
        *array_mut_ref![data, 3, 4] = (self.amount_ranges.len() as u32).to_le_bytes();
        let mut offset: usize = 7;
        for range in &self.amount_ranges {
            write_amount_type(&mut data, self.amount_type, offset, range);
            offset += self.amount_type as usize;
            write_length_type(&mut data, self.length_type, offset, range);
            offset += self.length_type as usize;
        }
    }
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Copy)]
pub struct BidRedemptionTicket {
    // With BidRedemptionTicket is easier to hide it's legacy V1/V2 behind an internal facade,
    // since all of it's values are read directly off the array.
    pub key: Key,
}

impl BidRedemptionTicket {
    pub fn check_ticket(
        bid_redemption_info: &AccountInfo,
        is_participation: bool,
        safety_deposit_config_info: Option<&AccountInfo>,
    ) -> ProgramResult {
        let bid_redemption_data = bid_redemption_info.data.borrow_mut();
        if bid_redemption_data[0] != Key::BidRedemptionTicketV1 as u8
            && bid_redemption_data[0] != Key::BidRedemptionTicketV2 as u8
        {
            return Err(MetaplexError::DataTypeMismatch.into());
        }

        if bid_redemption_data[0] == Key::BidRedemptionTicketV1 as u8 {
            let mut participation_redeemed = false;
            if bid_redemption_data[1] == 1 {
                participation_redeemed = true;
            }

            if is_participation && participation_redeemed {
                return Err(MetaplexError::BidAlreadyRedeemed.into());
            }
        } else if bid_redemption_data[0] == Key::BidRedemptionTicketV2 as u8 {
            // You can only redeem Full Rights Transfers one time per mint
            // You can only redeem Token Only Transfers one time per mint
            // You can only redeem PrintingV1 one time - you get all the printing tokens in one go
            // You can redeem PrintingV2s many times(once per edition given) - but we dont check these with this ticket
            // You can redeem Participation only once per mint
            // With the v2 of bid redemptions we establish a bitmask where each bit in order from left to right
            // represents the "order" field on the safety deposit box, with bit 0 representing safety deposit 0.
            // Flipping it to 1 means redeemed.
            match safety_deposit_config_info {
                Some(config) => {
                    let order = SafetyDepositConfig::get_order(config);
                    let (position, mask) =
                        BidRedemptionTicket::get_index_and_mask(&bid_redemption_data, order)?;

                    if bid_redemption_data[position] & mask != 0 {
                        return Err(MetaplexError::BidAlreadyRedeemed.into());
                    }
                }
                None => return Err(MetaplexError::InvalidOperation.into()),
            }
        }
        Ok(())
    }

    pub fn get_index_and_mask(
        data: &RefMut<&mut [u8]>,
        order: u64,
    ) -> Result<(usize, u8), ProgramError> {
        // add one because Key is at 0
        let mut offset = 42;
        if data[1] == 0 {
            // remove the lost option space
            offset -= 8;
        }

        let u8_position = order
            .checked_div(8)
            .ok_or(MetaplexError::NumericalOverflowError)?
            .checked_add(offset)
            .ok_or(MetaplexError::NumericalOverflowError)?;
        let position_from_right = 7 - order
            .checked_rem(8)
            .ok_or(MetaplexError::NumericalOverflowError)?;
        let mask = u8::pow(2, position_from_right as u32);

        Ok((u8_position as usize, mask))
    }

    pub fn save(
        bid_redemption_info: &AccountInfo,
        participation_redeemed: bool,
        safety_deposit_config_info: Option<&AccountInfo>,
        winner_index: Option<usize>,
        auction_manager: Pubkey,
        auction_manager_version: Key,
    ) -> ProgramResult {
        // Saving on CPU in these large actions by avoiding borsh
        let data = &mut bid_redemption_info.data.borrow_mut();
        if data[0] == Key::BidRedemptionTicketV1 as u8
            || (data[0] == Key::Uninitialized as u8
                && auction_manager_version == Key::AuctionManagerV1)
        {
            let output = array_mut_ref![data, 0, 3];

            let (key, participation_redeemed_ptr, _items_redeemed_ptr) =
                mut_array_refs![output, 1, 1, 1];

            *key = [Key::BidRedemptionTicketV1 as u8];

            if participation_redeemed {
                *participation_redeemed_ptr = [1];
            }
        } else if data[0] == Key::BidRedemptionTicketV2 as u8 || data[0] == Key::Uninitialized as u8
        {
            data[0] = Key::BidRedemptionTicketV2 as u8;
            let mut offset = 2;

            if let Some(index) = winner_index {
                data[1] = 1;
                offset += 8;
                *array_mut_ref![data, 2, 8] = index.to_le_bytes();
            } else {
                data[1] = 0;
            }

            let auction_manager_ptr = array_mut_ref![data, offset, 32];

            auction_manager_ptr.copy_from_slice(auction_manager.as_ref());

            match safety_deposit_config_info {
                Some(config) => {
                    let order = SafetyDepositConfig::get_order(config);

                    let (position, mask) = BidRedemptionTicket::get_index_and_mask(data, order)?;
                    data[position] = data[position] | mask;
                }
                None => return Err(MetaplexError::InvalidOperation.into()),
            }
        }

        Ok(())
    }
}
