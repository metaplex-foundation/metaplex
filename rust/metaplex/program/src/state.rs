use {
    crate::{
        deprecated_state::AuctionManagerV1, error::MetaplexError, utils::try_from_slice_checked,
    },
    arrayref::{array_mut_ref, array_ref},
    borsh::{BorshDeserialize, BorshSerialize},
    num_traits::ToPrimitive,
    solana_program::{
        account_info::AccountInfo, entrypoint::ProgramResult, program_error::ProgramError,
        pubkey::Pubkey,
    },
};
/// prefix used for PDAs to avoid certain collision attacks (https://en.wikipedia.org/wiki/Collision_attack#Chosen-prefix_collision_attack)
pub const PREFIX: &str = "metaplex";

pub const MAX_AUCTION_MANAGER_V2_SIZE: usize = 1 + //key
32 + // store
32 + // authority
32 + // auction
32 + // vault
32 + // accept_payment
1 + //status
8 + // winning configs validated
200; // padding
pub const MAX_STORE_SIZE: usize = 2 + 32 + 32 + 32 + 32 + 100;
pub const MAX_WHITELISTED_CREATOR_SIZE: usize = 2 + 32 + 10;
pub const MAX_PAYOUT_TICKET_SIZE: usize = 1 + 32 + 8;
pub const MAX_BID_REDEMPTION_TICKET_SIZE: usize = 3;
pub const MAX_AUTHORITY_LOOKUP_SIZE: usize = 33;
pub const MAX_PRIZE_TRACKING_TICKET_SIZE: usize = 1 + 32 + 8 + 8 + 8 + 50;
pub const BASE_SAFETY_CONFIG_SIZE: usize = 1 +// Key
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
 100; // padding

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
}

pub trait AuctionManager {
    fn key(&self) -> Key;
    fn store(&self) -> Pubkey;
    fn authority(&self) -> Pubkey;
    fn auction(&self) -> Pubkey;
    fn vault(&self) -> Pubkey;
    fn accept_payment(&self) -> Pubkey;
    fn status(&self) -> AuctionManagerStatus;
    fn configs_validated(&self) -> u64;
    fn set_configs_validated(&self, new_configs_validated: u64);
    fn save(&self, account: &AccountInfo) -> ProgramResult;
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

    fn configs_validated(&self) -> u64 {
        self.state.safety_config_items_validated
    }

    fn set_configs_validated(&self, new_configs_validated: u64) {
        self.state.safety_config_items_validated = new_configs_validated
    }

    fn save(&self, account: &AccountInfo) -> ProgramResult {
        self.serialize(&mut *account.data.borrow_mut())?;
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
    /// Means you are using a MasterEditionV2 as a participation prize.
    Participation,
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
#[derive(Clone, Debug)]
pub struct AmountRange(pub u64, pub u64);

#[repr(C)]
#[derive(Clone, Debug)]
pub enum TupleNumericType {
    U8 = 1,
    U16 = 2,
    U32 = 4,
    U64 = 8,
}
#[repr(C)]
#[derive(Clone, Debug)]
pub struct SafetyDepositConfig {
    pub key: Key,
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

impl SafetyDepositConfig {
    pub fn from_account_info(a: &AccountInfo) -> Result<SafetyDepositConfig, ProgramError> {
        let data = &mut a.data.borrow_mut();
        if a.data_len() < BASE_SAFETY_CONFIG_SIZE {
            return Err(MetaplexError::DataTypeMismatch.into());
        }

        if data[0] != Key::SafetyDepositConfigV1 {
            return Err(MetaplexError::DataTypeMismatch.into());
        }

        let order = u64::from_le_bytes(array_ref![data, 1, 8]);

        let winning_config_type = match data[9] {
            0 => WinningConfigType::TokenOnlyTransfer,
            1 => WinningConfigType::FullRightsTransfer,
            2 => WinningConfigType::PrintingV1,
            3 => WinningConfigType::PrintingV2,
            4 => WinningConfigType::Participation,
            _ => return ProgramError::InvalidAccountData,
        };

        let amount_type = match data[10] {
            1 => TupleNumericType::U8,
            2 => TupleNumericType::U16,
            4 => TupleNumericType::U32,
            8 => TupleNumericType::U64,
            _ => return ProgramError::InvalidAccountData,
        };

        let length_type = match data[11] {
            1 => TupleNumericType::U8,
            2 => TupleNumericType::U16,
            4 => TupleNumericType::U32,
            8 => TupleNumericType::U64,
            _ => return ProgramError::InvalidAccountData,
        };

        let length_of_array = u32::from_le_bytes(array_ref![data, 12, 4]);

        let mut offset: u64 = 16;
        let amount_ranges = vec![];
        for n in 0..length_of_array {
            let amount = match amount_type {
                TupleNumericType::U8 => data[offset],
                TupleNumericType::U16 => u16::from_le_bytes(array_ref![data, offset, 2]),
                TupleNumericType::U32 => u32::from_le_bytes(array_ref![data, offset, 4]),
                TupleNumericType::U64 => u64::from_le_bytes(array_ref![data, offset, 8]),
            };

            offset += amount_type;

            let length = match length_type {
                TupleNumericType::U8 => data[offset],
                TupleNumericType::U16 => u16::from_le_bytes(array_ref![data, offset, 2]),
                TupleNumericType::U32 => u32::from_le_bytes(array_ref![data, offset, 4]),
                TupleNumericType::U64 => u64::from_le_bytes(array_ref![data, offset, 8]),
            };

            amount_ranges.push(AmountRange(amount, length));
            offset += length_type;
        }

        let participation_config = match data[offset] {
            0 => offset += 1,
            1 => {
                let winner_constraint = match data[offset + 1] {
                    0 => WinningConstraint::NoParticipationPrize,
                    1 => WinningConstraint::ParticipationPrizeGiven,
                    _ => return ProgramError::InvalidAccountData,
                };
                let non_winning_constraint = match data[offset + 2] {
                    0 => NonWinningConstraint::NoParticipationPrize,
                    1 => NonWinningConstraint::GivenForFixedPrice,
                    2 => NonWinningConstraint::GivenForBidPrice,
                    _ => return ProgramError::InvalidAccountData,
                };

                offset += 3;

                let fixed_price = match data[offset] {
                    0 => offset += 1,
                    1 => {
                        let number = u64::from_le_bytes(array_ref![data, offset + 1, 8]);
                        offset += 9;
                        number
                    }
                    _ => return ProgramError::InvalidAccountData,
                };

                ParticipationConfigV2 {
                    winner_constraint,
                    non_winning_constraint,
                    fixed_price,
                }
            }
            _ => return ProgramError::InvalidAccountData,
        };

        let participation_state = match data[offset] {
            0 => offset += 1,
            1 => {
                let collected_to_accept_payment =
                    u64::from_le_bytes(array_ref![data, offset + 1, 8]);
                ParticipationStateV2 {
                    collected_to_accept_payment,
                };
                offset += 9;
            }
            _ => return ProgramError::InvalidAccountData,
        };

        Ok(SafetyDepositConfig {
            key: Key::SafetyDepositConfigV1,
            order,
            winning_config_type,
            amount_type,
            length_type,
            amount_ranges,
            participation_config,
            participation_state,
        });
    }

    pub fn create(&mut self, a: &mut AccountInfo) {
        let data = a.data.borrow_mut();

        data[0] = self.key as u8;
        *array_mut_ref![data, 1, 8] = self.order.to_le_bytes();
        data[9] = self.winning_config_type as u8;
        data[10] = self.amount_type as u8;
        data[11] = self.length_type as u8;
        *array_mut_ref![data, 12, 4] = self.amount_ranges.len().to_u32().to_le_bytes();
        let offset: u64 = 16;
        for range in self.amount_ranges {
            match self.amount_type {
                TupleNumericType::U8 => data[offset] = range.0,
                TupleNumericType::U16 => {
                    *array_mut_ref![data, offset, 2] = range.0.to_u16().to_le_bytes()
                }
                TupleNumericType::U32 => {
                    *array_mut_ref![data, offset, 4] = range.0.to_u32().to_le_bytes()
                }
                TupleNumericType::U64 => *array_mut_ref![data, offset, 8] = range.0.to_le_bytes(),
            }
            offset += self.amount_type;
            match self.length_type {
                TupleNumericType::U8 => data[offset] = range.1,
                TupleNumericType::U16 => {
                    *array_mut_ref![data, offset, 2] = range.1.to_u16().to_le_bytes()
                }
                TupleNumericType::U32 => {
                    *array_mut_ref![data, offset, 4] = range.1.to_u32().to_le_bytes()
                }
                TupleNumericType::U64 => *array_mut_ref![data, offset, 8] = range.1.to_le_bytes(),
            }
            offset += self.length_type;
        }

        match self.participation_config {
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

        match self.participation_state {
            Some(val) => {
                data[offset] = 1;
                *array_mut_ref![data, offset + 1, 8] =
                    val.collected_to_accept_payment.to_le_bytes();
                offset += 9;
            }
            None => {
                data[offset] = 0;
                offset += 1
            }
        }
    }

    /// Smaller method for just participation state saving...saves cpu, and it's the only thing
    /// that will ever change on this model.
    pub fn save_participation_state(&mut self, a: &mut AccountInfo) {
        let mut data = a.data.borrow_mut();
        let offset: u64 = 16 + self.amount_ranges.len() * (self.amount_type + self.length_type);

        offset += match self.participation_config {
            Some(val) => {
                let total = 3;
                if val.fixed_price.is_some() {
                    total += 8;
                }
                total
            }
            None => 1,
        };

        match self.participation_state {
            Some(val) => {
                data[offset] = 1;
                *array_mut_ref![data, offset + 1, 8] =
                    val.collected_to_accept_payment.to_le_bytes();
                offset += 9;
            }
            None => {
                data[offset] = 0;
                offset += 1
            }
        }
    }
}
