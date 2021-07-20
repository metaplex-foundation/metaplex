
use {
    crate::{error::MetaplexError, utils::try_from_slice_checked,state::{Key, WinningConfigType, AuctionManager,AuctionManagerStatus, WinningConstraint, NonWinningConstraint}},
    arrayref::{array_ref,mut_array_refs, array_mut_ref},
    borsh::{BorshDeserialize, BorshSerialize},
    solana_program::{msg,account_info::AccountInfo, program_error::ProgramError, pubkey::Pubkey, entrypoint::ProgramResult},
    
};


pub const MAX_WINNERS: usize = 200;
pub const MAX_WINNER_SIZE: usize = 6 * MAX_WINNERS;
// Add 150 padding for future keys and booleans
// DONT TRUST MEM SIZE OF! IT DOESNT SIZE THINGS PROPERLY! TRUST YOUR OWN MIND AND ITS COUNTING ABILITY!
pub const MAX_AUCTION_MANAGER_V1_SIZE: usize = 1 + // key
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
pub const MAX_VALIDATION_TICKET_SIZE: usize = 1 + 32 + 10;
pub const MAX_WINNING_CONFIG_STATE_ITEM_SIZE: usize = 2;

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug)]
pub struct AuctionManagerV1 {
    pub key: Key,

    pub store: Pubkey,

    pub authority: Pubkey,

    pub auction: Pubkey,

    pub vault: Pubkey,

    pub accept_payment: Pubkey,

    pub state: AuctionManagerStateV1,

    pub settings: AuctionManagerSettingsV1,

    /// True if this is only winning configs of one item each, used for optimization in saving.
    pub straight_shot_optimization: bool,
}

impl AuctionManager for AuctionManagerV1 {
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

    fn set_status(&mut self, status: AuctionManagerStatus) {
      self.state.status = status
  }

    fn configs_validated(&self) -> u64 {
      self.state.winning_config_items_validated as u64
    }

    fn set_configs_validated(&self, new_configs_validated: u64) {
        self.state.winning_config_items_validated = new_configs_validated as u8
    }

    fn save(&self, account: &AccountInfo) -> ProgramResult {
        self.serialize(&mut *account.data.borrow_mut())?;
        Ok(())
    }
}

impl AuctionManagerV1 {
    pub fn from_account_info(a: &AccountInfo) -> Result<AuctionManagerV1, ProgramError> {
        let am: AuctionManagerV1 = try_from_slice_checked(
            &a.data.borrow_mut(),
            Key::AuctionManagerV1,
            MAX_AUCTION_MANAGER_V1_SIZE,
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
        let num_configs = AuctionManagerV1::get_num_configs(a);
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
pub struct AuctionManagerStateV1 {
    pub status: AuctionManagerStatus,
    /// When all configs are validated the auction is started and auction manager moves to Running
    pub winning_config_items_validated: u8,

    pub winning_config_states: Vec<WinningConfigState>,

    pub participation_state: Option<ParticipationStateV1>,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug)]
pub struct AuctionManagerSettingsV1 {
    /// The safety deposit box index in the vault containing the winning items, in order of place
    /// The same index can appear multiple times if that index contains n tokens for n appearances (this will be checked)
    pub winning_configs: Vec<WinningConfig>,

    /// The participation config is separated because it is structurally a bit different,
    /// having different options and also because it has no real "winning place" in the array.
    pub participation_config: Option<ParticipationConfigV1>,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq, Debug)]
pub struct ParticipationStateV1 {
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

    /// NOTE: DEPRECATED.
    /// An account for printing authorization tokens that are made with the one time use token
    /// after the auction ends. Provided during validation step.
    pub printing_authorization_token_account: Option<Pubkey>,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq, Debug)]
pub struct ParticipationConfigV1 {
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


/// Deprecated model used in V1 logic in lieu of SafetyDepositConfig
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


