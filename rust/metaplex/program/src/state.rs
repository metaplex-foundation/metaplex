use solana_program::{msg};

use {
    crate::utils::try_from_slice_checked,
    arrayref::array_ref,
    borsh::{BorshDeserialize, BorshSerialize},
    solana_program::{account_info::AccountInfo, program_error::ProgramError, pubkey::Pubkey},
};
/// prefix used for PDAs to avoid certain collision attacks (https://en.wikipedia.org/wiki/Collision_attack#Chosen-prefix_collision_attack)
pub const PREFIX: &str = "metaplex";

pub const MAX_WINNERS: usize = 200;
pub const MAX_WINNER_SIZE: usize = 6 * MAX_WINNERS;
// Add 150 padding for future keys and booleans
// DONT TRUST MEM SIZE OF! IT DOESNT SIZE THINGS PROPERLY! TRUST YOUR OWN MIND AND ITS COUNTING ABILITY!
pub const MAX_AUCTION_MANAGER_SIZE: usize = 1 + // key
    32 + // store
    32 + // authority
    32 + // auction
    32 + // vault
    32 + // accept_payment
    1 + //status
    1 + // winning configs validated
    8 + // u64 borsh uses to determine number of elements in winning config state vec
    8 + // u64 for numbr of elements in winning config state items
    MAX_WINNER_SIZE + // total number of bytes for max possible use between WinnerConfig and WinnerConfigStates
    // for all winner places.
    1 + // Whether or not participation state exists
    8 + // participation_collected_to_accept_payment
    1 + // Whether or not participation is a primary sale'd metadata or not at time of auction
    1 + // was participation validated
    32 + // participation printing token holding account pubkey
    8 + // u64 borsh uses to determine number of elements in winning config vec
    8 + // u64 for number of items in winning config items vec
    1 + // Whether or not participation config exists
    1 + // participation winner constraint
    1 + // participation non winner constraint
    1 + // u8 participation_config's safety deposit box index 
    9 + // option<u64> participation fixed price in borsh is a u8 for option and actual u64
    1 + 
    AUCTION_MANAGER_PADDING; // padding;
         // Add padding for future booleans/enums
pub const AUCTION_MANAGER_PADDING: usize = 149;
pub const MAX_STORE_SIZE: usize = 2 + 32 + 32 + 32 + 32 + 100;
pub const MAX_WHITELISTED_CREATOR_SIZE: usize = 2 + 32 + 10;
pub const MAX_PAYOUT_TICKET_SIZE: usize = 1 + 32 + 8;
pub const MAX_VALIDATION_TICKET_SIZE: usize = 1 + 32 + 10;
pub const MAX_BID_REDEMPTION_TICKET_SIZE: usize = 3;
pub const MAX_AUTHORITY_LOOKUP_SIZE: usize = 33;
pub const MAX_PRIZE_TRACKING_TICKET_SIZE: usize = 1 + 32 + 8 + 8 + 8 + 50;
pub const MAX_WINNING_CONFIG_STATE_ITEM_SIZE: usize = 2;

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
}

/// An Auction Manager can support an auction that is an English auction and limited edition and open edition
/// all at once. Need to support all at once. We use u8 keys to point to safety deposit indices in Vault
/// as opposed to the pubkeys to save on space. Ordering of safety deposits is guaranteed fixed by vault
/// implementation.
#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug)]
pub struct AuctionManager {
    pub key: Key,

    pub store: Pubkey,

    pub authority: Pubkey,

    pub auction: Pubkey,

    pub vault: Pubkey,

    pub accept_payment: Pubkey,

    pub state: AuctionManagerState,

    pub settings: AuctionManagerSettings,

    /// True if this is only winning configs of one item each, used for optimization in saving.
    pub straight_shot_optimization: bool,
}

impl AuctionManager {
    pub fn from_account_info(a: &AccountInfo) -> Result<AuctionManager, ProgramError> {
        let am: AuctionManager = try_from_slice_checked(
            &a.data.borrow_mut(),
            Key::AuctionManagerV1,
            MAX_AUCTION_MANAGER_SIZE,
        )?;

        Ok(am)
    }

    // cheap setter to set status and claimed in one go without using expensive borsh save.
    pub fn set_claimed_and_status(
        a: &AccountInfo,
        status: AuctionManagerStatus,
        winning_config_index: usize,
        winning_config_item_index: usize,
        use_straight_shot: bool
    ) {
        let num_configs = AuctionManager::get_num_configs(a);
        let mut data = a.data.borrow_mut();
        data[161] = status as u8; // set status
        let mut current_config_offset = 167;
        if use_straight_shot {
            msg!("Using optimization path");
            // in this optimization framework we know it's one item per config and we can know exact location.
            let skip = (4 + MAX_WINNING_CONFIG_STATE_ITEM_SIZE + 1) * winning_config_index;
            // need to skip ahead by the number of items to the next offset.
            // Add one byte to cover the boolean at the end of the winning config state.
            let idx = current_config_offset + skip + 4 + 1;
            data[idx] = 1;
        } else {
            msg!("Using tiered auction save");
            for i in 0..num_configs {
                // need to hop along and check each u32 of the items sub array to know how much to hop next.
                let num_items_data = array_ref![data, current_config_offset, 4];

                let num_items = u32::from_le_bytes(*num_items_data) as usize;

                if winning_config_index == i {
                    // ok we need to target the claimed u8 inside the correct item now.
                    let idx = current_config_offset
                        + 4
                        + winning_config_item_index * MAX_WINNING_CONFIG_STATE_ITEM_SIZE
                        + 1;

                    data[idx] = 1;
                    break;
                } else {
                    let skip = MAX_WINNING_CONFIG_STATE_ITEM_SIZE * num_items;
                    // need to skip ahead by the number of items to the next offset.
                    // Add one byte to cover the boolean at the end of the winning config state.
                    current_config_offset = current_config_offset + 4 + skip + 1;
                }
            } 
        }
    }

    pub fn get_num_configs(a: &AccountInfo) -> usize {
        let data = a.data.borrow();
        let num_elements_data = array_ref![data, 163, 4];
        u32::from_le_bytes(*num_elements_data) as usize
    }
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug)]
pub struct AuctionManagerState {
    pub status: AuctionManagerStatus,
    /// When all configs are validated the auction is started and auction manager moves to Running
    pub winning_config_items_validated: u8,

    pub winning_config_states: Vec<WinningConfigState>,

    pub participation_state: Option<ParticipationState>,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug)]
pub struct AuctionManagerSettings {
    /// The safety deposit box index in the vault containing the winning items, in order of place
    /// The same index can appear multiple times if that index contains n tokens for n appearances (this will be checked)
    pub winning_configs: Vec<WinningConfig>,

    /// The participation config is separated because it is structurally a bit different,
    /// having different options and also because it has no real "winning place" in the array.
    pub participation_config: Option<ParticipationConfig>,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq, Debug)]
pub struct ParticipationState {
    /// We have this variable below to keep track in the case of the participation NFTs, whose
    /// income will trickle in over time, how much the artists have in the escrow account and
    /// how much would/should be owed to them if they try to claim it relative to the winning bids.
    /// It's  abit tougher than a straightforward bid which has a price attached to it, because
    /// there are many bids of differing amounts (in the case of GivenForBidPrice) and they dont all
    /// come in at one time, so this little ledger here keeps track.
    pub collected_to_accept_payment: u64,

    /// Record of primary sale or not at time of auction creation, set during validation step
    pub primary_sale_happened: bool,

    pub validated: bool,

    /// An account for printing authorization tokens that are made with the one time use token
    /// after the auction ends. Provided during validation step.
    pub printing_authorization_token_account: Option<Pubkey>,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq, Debug)]
pub struct ParticipationConfig {
    /// Setups:
    /// 1. Winners get participation + not charged extra
    /// 2. Winners dont get participation prize
    pub winner_constraint: WinningConstraint,

    /// Setups:
    /// 1. Losers get prize for free
    /// 2. Losers get prize but pay fixed price
    /// 3. Losers get prize but pay bid price
    pub non_winning_constraint: NonWinningConstraint,

    /// The safety deposit box index in the vault containing the template for the participation prize
    pub safety_deposit_box_index: u8,
    /// Setting this field disconnects the participation prizes price from the bid. Any bid you submit, regardless
    /// of amount, charges you the same fixed price.
    pub fixed_price: Option<u64>,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq, Debug)]
pub enum WinningConstraint {
    NoParticipationPrize,
    ParticipationPrizeGiven,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq, Debug)]
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
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug)]
pub struct WinningConfig {
    // For now these are just array-of-array proxies but wanted to make them first class
    // structs in case we want to attach other top level metadata someday.
    pub items: Vec<WinningConfigItem>,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug)]
pub struct WinningConfigState {
    pub items: Vec<WinningConfigStateItem>,
    /// Ticked to true when money is pushed to accept_payment account from auction bidding pot
    pub money_pushed_to_accept_payment: bool,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Copy, Debug)]
pub struct WinningConfigItem {
    pub safety_deposit_box_index: u8,
    pub amount: u8,
    pub winning_config_type: WinningConfigType,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Copy, Debug)]
pub struct WinningConfigStateItem {
    /// Record of primary sale or not at time of auction creation, set during validation step
    pub primary_sale_happened: bool,
    /// Ticked to true when a prize is claimed by person who won it
    pub claimed: bool,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug, PartialEq)]
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
pub struct BidRedemptionTicket {
    pub key: Key,
    pub participation_redeemed: bool,
    pub items_redeemed: u8,
}

impl BidRedemptionTicket {
    pub fn from_account_info(a: &AccountInfo) -> Result<BidRedemptionTicket, ProgramError> {
        let pt: BidRedemptionTicket = try_from_slice_checked(
            &a.data.borrow_mut(),
            Key::BidRedemptionTicketV1,
            MAX_BID_REDEMPTION_TICKET_SIZE,
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
#[derive(Clone, BorshSerialize, BorshDeserialize, Copy)]
pub struct SafetyDepositValidationTicket {
    pub key: Key,
    pub address: Pubkey,
}

impl SafetyDepositValidationTicket {
    pub fn from_account_info(
        a: &AccountInfo,
    ) -> Result<SafetyDepositValidationTicket, ProgramError> {
        let store: SafetyDepositValidationTicket = try_from_slice_checked(
            &a.data.borrow_mut(),
            Key::SafetyDepositValidationTicketV1,
            MAX_VALIDATION_TICKET_SIZE,
        )?;

        Ok(store)
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
