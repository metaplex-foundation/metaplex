use {
    crate::{
        error::MetaplexError,
        state::{
            AuctionManager, AuctionManagerStatus, CommonWinningIndexChecks,
            CommonWinningIndexReturn, Key, NonWinningConstraint, ParticipationConfigV2,
            PrintingV2CalculationCheckReturn, PrintingV2CalculationChecks, WinningConfigType,
            WinningConstraint,
        },
        utils::try_from_slice_checked,
    },
    arrayref::array_ref,
    borsh::{BorshDeserialize, BorshSerialize},
    metaplex_token_metadata::state::Metadata,
    metaplex_token_vault::state::SafetyDepositBox,
    solana_program::{
        account_info::AccountInfo, entrypoint::ProgramResult, msg, program_error::ProgramError,
        pubkey::Pubkey,
    },
    metaplex_auction::processor::AuctionData,
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

    fn set_configs_validated(&mut self, new_configs_validated: u64) {
        self.state.winning_config_items_validated = new_configs_validated as u8
    }

    fn save(&self, account: &AccountInfo) -> ProgramResult {
        self.serialize(&mut *account.data.borrow_mut())?;
        Ok(())
    }

    fn fast_save(
        &self,
        a: &AccountInfo,
        winning_config_index: usize,
        winning_config_item_index: usize,
    ) {
        let status = self.state.status;
        let use_straight_shot = self.straight_shot_optimization;
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

    fn common_winning_index_checks(
        &self,
        args: CommonWinningIndexChecks,
    ) -> Result<CommonWinningIndexReturn, ProgramError> {
        let CommonWinningIndexChecks {
            safety_deposit_info,
            winning_index,
            auction_manager_v1_ignore_claim,
            safety_deposit_config_info: _s,
        } = args;

        let winning_config = &self.settings.winning_configs[winning_index];
        let winning_config_state = &self.state.winning_config_states[winning_index];

        let mut winning_config_item_index = None;
        for i in 0..winning_config.items.len() {
            if winning_config.items[i].safety_deposit_box_index
                == SafetyDepositBox::get_order(safety_deposit_info)
            {
                winning_config_item_index = Some(i);
                break;
            }
        }

        let winning_config_item = match winning_config_item_index {
            Some(index) => winning_config.items[index],
            None => return Err(MetaplexError::SafetyDepositBoxNotUsedInAuction.into()),
        };

        let winning_config_state_item = match winning_config_item_index {
            Some(index) => winning_config_state.items[index],
            None => return Err(MetaplexError::SafetyDepositBoxNotUsedInAuction.into()),
        };

        // For printing v2, we may call many times for different editions and the edition PDA check makes sure it cant
        // be claimed over-much. This would be 1 time, we need n times.
        if winning_config_state_item.claimed && !auction_manager_v1_ignore_claim {
            return Err(MetaplexError::PrizeAlreadyClaimed.into());
        }

        Ok(CommonWinningIndexReturn {
            amount: winning_config_item.amount as u64,

            winning_config_type: winning_config_item.winning_config_type,
            winning_config_item_index,
        })
    }

    fn printing_v2_calculation_checks(
        &self,
        args: PrintingV2CalculationChecks,
    ) -> Result<PrintingV2CalculationCheckReturn, ProgramError> {
        let PrintingV2CalculationChecks {
            safety_deposit_config_info,
            safety_deposit_info,
            winning_index,
            auction_manager_v1_ignore_claim,
            short_circuit_total,
            winners,
            edition_offset,
        } = args;

        let CommonWinningIndexReturn {
            amount: _a,
            winning_config_item_index,
            winning_config_type,
        } = self.common_winning_index_checks(CommonWinningIndexChecks {
            safety_deposit_config_info,
            safety_deposit_info,
            winning_index,
            auction_manager_v1_ignore_claim,
        })?;

        let safety_deposit_box_order = SafetyDepositBox::get_order(safety_deposit_info);

        let mut edition_offset_min: u64 = 1;
        let mut expected_redemptions: u64 = 0;

        // Given every single winning config item carries a u8, it is impossible to overflow
        // a u64 with the amount in it given the limited size. Avoid using checked add to save on cpu.
        for n in 0..self.settings.winning_configs.len() {
            let matching = count_item_amount_by_safety_deposit_order(
                &self.settings.winning_configs[n].items,
                safety_deposit_box_order,
            );

            if n < winning_index {
                edition_offset_min += matching
            }
            if !short_circuit_total {
                if n < winners {
                    // once we hit the number of winnrs in this auction (which coulkd be less than possible total)
                    // we need to stop as its never possible to redeem more than number of winners in the auction
                    expected_redemptions += matching
                } else {
                    break;
                }
            } else if n >= winning_index {
                // no need to keep using this loop more than winning_index if we're not
                // tabulating expected_redemptions
                break;
            }
        }

        let edition_offset_max = edition_offset_min
            + count_item_amount_by_safety_deposit_order(
                &self.settings.winning_configs[winning_index].items,
                safety_deposit_box_order,
            );

        if edition_offset < edition_offset_min || edition_offset >= edition_offset_max {
            return Err(MetaplexError::InvalidEditionNumber.into());
        }

        Ok(PrintingV2CalculationCheckReturn {
            expected_redemptions,
            winning_config_type,
            winning_config_item_index,
        })
    }

    fn get_participation_config(
        &self,
        _safety_deposit_config_info: &AccountInfo,
    ) -> Result<ParticipationConfigV2, ProgramError> {
        if let Some(part_config) = self.settings.participation_config.clone() {
            Ok(ParticipationConfigV2 {
                winner_constraint: part_config.winner_constraint,
                non_winning_constraint: part_config.non_winning_constraint,
                fixed_price: part_config.fixed_price,
            })
        } else {
            return Err(MetaplexError::NotEligibleForParticipation.into());
        }
    }

    fn add_to_collected_payment(
        &mut self,
        _safety_deposit_config_info: &AccountInfo,
        price: u64,
    ) -> ProgramResult {
        if let Some(state) = &self.state.participation_state {
            // Can't really edit something behind an Option reference...
            // just make new one.
            self.state.participation_state = Some(ParticipationStateV1 {
                collected_to_accept_payment: state
                    .collected_to_accept_payment
                    .checked_add(price)
                    .ok_or(MetaplexError::NumericalOverflowError)?,
                primary_sale_happened: state.primary_sale_happened,
                validated: state.validated,
                printing_authorization_token_account: state.printing_authorization_token_account,
            });
        }

        Ok(())
    }

    fn assert_legacy_printing_token_match(&self, account: &AccountInfo) -> ProgramResult {
        if let Some(state) = &self.state.participation_state {
            if let Some(token) = state.printing_authorization_token_account {
                if *account.key != token {
                    return Err(MetaplexError::PrintingAuthorizationTokenAccountMismatch.into());
                }
            }
        }

        Ok(())
    }

    fn get_max_bids_allowed_before_removal_is_stopped(
        &self,
        safety_deposit_box_order: u64,
        _safety_deposit_config_info: Option<&AccountInfo>,
    ) -> Result<usize, ProgramError> {
        let mut max_bids_allowed_before_removal_is_stopped = 0;
        let u8_order = safety_deposit_box_order as u8;
        for n in 0..self.settings.winning_configs.len() {
            if self.settings.winning_configs[n]
                .items
                .iter()
                .find(|i| i.safety_deposit_box_index == u8_order)
                .is_some()
            {
                // This means at least n bids must exist for there to be at least one bidder that will be eligible for this prize.
                max_bids_allowed_before_removal_is_stopped = n;
                break;
            }
        }

        return Ok(max_bids_allowed_before_removal_is_stopped);
    }

    fn assert_is_valid_master_edition_v2_safety_deposit(
        &self,
        safety_deposit_box_order: u64,
        _safety_deposit_config_info: Option<&AccountInfo>,
    ) -> ProgramResult {
        let u8_order = safety_deposit_box_order as u8;
        let atleast_one_matching = self
            .settings
            .winning_configs
            .iter()
            .find(|c| {
                c.items
                    .iter()
                    .find(|i| {
                        i.safety_deposit_box_index == u8_order
                            && i.winning_config_type == WinningConfigType::PrintingV2
                    })
                    .is_some()
            })
            .is_some();

        if !atleast_one_matching {
            if let Some(config) = &self.settings.participation_config {
                if config.safety_deposit_box_index != u8_order {
                    return Err(MetaplexError::InvalidOperation.into());
                }
            } else {
                // This means there arent any winning configs listed as PrintingV2 so
                // this isnt a printing v2 type and isnt a master edition.
                return Err(MetaplexError::InvalidOperation.into());
            }
        }

        Ok(())
    }

    fn mark_bid_as_claimed(&mut self, winner_index: usize) -> ProgramResult {
        self.state.winning_config_states[winner_index].money_pushed_to_accept_payment = true;
        Ok(())
    }

    fn assert_all_bids_claimed(&self, auction: &AuctionData) -> ProgramResult {
        for i in 0..auction.num_winners() {
            if !self.state.winning_config_states[i as usize].money_pushed_to_accept_payment {
                return Err(MetaplexError::NotAllBidsClaimed.into());
            }
        }

        Ok(())
    }

    fn get_number_of_unique_token_types_for_this_winner(
        &self,
        winner_index: usize,
        _auction_token_tracker_info: Option<&AccountInfo>,
    ) -> Result<u128, ProgramError> {
        Ok(self.settings.winning_configs[winner_index].items.len() as u128)
    }

    fn get_collected_to_accept_payment(
        &self,
        _safety_deposit_config_info: Option<&AccountInfo>,
    ) -> Result<u128, ProgramError> {
        if let Some(state) = &self.state.participation_state {
            Ok(state.collected_to_accept_payment as u128)
        } else {
            Ok(0)
        }
    }

    fn get_primary_sale_happened(
        &self,
        _metadata: &Metadata,
        winning_config_index: Option<u8>,
        winning_config_item_index: Option<u8>,
    ) -> Result<bool, ProgramError> {
        match winning_config_index {
            Some(val) => {
                if let Some(item_index) = winning_config_item_index {
                    Ok(
                        self.state.winning_config_states[val as usize].items[item_index as usize]
                            .primary_sale_happened,
                    )
                } else {
                    return Err(MetaplexError::InvalidWinningConfigItemIndex.into());
                }
            }
            None => {
                if let Some(config) = &self.state.participation_state {
                    Ok(config.primary_sale_happened)
                } else {
                    Ok(false)
                }
            }
        }
    }

    fn assert_winning_config_safety_deposit_validity(
        &self,
        safety_deposit: &SafetyDepositBox,
        winning_config_index: Option<u8>,
        winning_config_item_index: Option<u8>,
    ) -> ProgramResult {
        if let Some(winning_index) = winning_config_index {
            let winning_configs = &self.settings.winning_configs;
            if (winning_index as usize) < winning_configs.len() {
                let winning_config = &winning_configs[winning_index as usize];
                if let Some(item_index) = winning_config_item_index {
                    if winning_config.items[item_index as usize].safety_deposit_box_index
                        != safety_deposit.order
                    {
                        return Err(MetaplexError::WinningConfigSafetyDepositMismatch.into());
                    }
                } else {
                    return Err(MetaplexError::InvalidWinningConfigItemIndex.into());
                }
            } else {
                return Err(MetaplexError::InvalidWinningConfigIndex.into());
            }
        } else if let Some(participation) = &self.settings.participation_config {
            if participation.safety_deposit_box_index != safety_deposit.order {
                return Err(MetaplexError::ParticipationSafetyDepositMismatch.into());
            }
        } else {
            return Err(MetaplexError::ParticipationNotPresent.into());
        }

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

    pub fn get_num_configs(a: &AccountInfo) -> usize {
        let data = a.data.borrow();
        let num_elements_data = array_ref![data, 163, 4];
        u32::from_le_bytes(*num_elements_data) as usize
    }
}

fn count_item_amount_by_safety_deposit_order(
    items: &Vec<WinningConfigItem>,
    safety_deposit_index: u8,
) -> u64 {
    let item = items.iter().find_map(|i| {
        if i.safety_deposit_box_index == safety_deposit_index {
            Some(i)
        } else {
            None
        }
    });

    match item {
        Some(item) => item.amount as u64,
        None => 0u64,
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
