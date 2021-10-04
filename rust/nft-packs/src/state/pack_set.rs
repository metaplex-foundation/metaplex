//! Pack set definitions

use super::*;
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    msg,
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack, Sealed},
    pubkey::Pubkey,
};

/// Pack state
#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize, BorshSchema)]
pub enum PackSetState {
    /// Not activated
    NotActivated,
    /// Activated
    Activated,
    /// Deactivated
    Deactivated,
    /// Ended
    Ended,
}

impl Default for PackSetState {
    fn default() -> Self {
        Self::NotActivated
    }
}

/// Distribution type
#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize, BorshSchema)]
pub enum PackDistributionType {
    /// Max supply
    MaxSupply,
    /// Fixed
    Fixed,
}

impl Default for PackDistributionType {
    fn default() -> Self {
        Self::MaxSupply
    }
}

/// Pack set
#[repr(C)]
#[derive(Debug, Clone, PartialEq, BorshSerialize, BorshDeserialize, BorshSchema, Default)]
pub struct PackSet {
    /// Account type - PackSet
    pub account_type: AccountType,
    /// Name
    pub name: [u8; 32],
    /// Pack authority
    pub authority: Pubkey,
    /// Authority to mint voucher editions
    pub minting_authority: Pubkey,
    /// Card masters counter
    pub pack_cards: u32,
    /// Pack voucher counter
    pub pack_vouchers: u32,
    /// Total amount of editions pack can mint
    pub total_editions: u64,
    /// If true authority can make changes at deactivated phase
    pub mutable: bool,
    /// Pack state
    pub pack_state: PackSetState,
    /// Distribution type
    pub distribution_type: PackDistributionType,
    /// Count of cards user can try to redeem
    pub allowed_amount_to_redeem: u32,
    /// Date when users can start to redeem cards
    pub redeem_start_date: u64,
    /// Date when pack set becomes inactive
    pub redeem_end_date: Option<u64>,
}

impl PackSet {
    /// Initialize a PackSet
    pub fn init(&mut self, params: InitPackSetParams) {
        self.account_type = AccountType::PackSet;
        self.name = params.name;
        self.authority = params.authority;
        self.minting_authority = params.minting_authority;
        self.total_editions = 0;
        self.pack_cards = 0;
        self.pack_vouchers = 0;
        self.mutable = params.mutable;
        self.pack_state = PackSetState::NotActivated;
        self.distribution_type = params.distribution_type;
        self.allowed_amount_to_redeem = params.allowed_amount_to_redeem;
        self.redeem_start_date = params.redeem_start_date;
        self.redeem_end_date = params.redeem_end_date;
    }

    /// Increase pack cards counter
    pub fn add_pack_card(&mut self) {
        self.pack_cards += 1;
    }

    /// Increase pack voucher counter
    pub fn add_pack_voucher(&mut self) {
        self.pack_vouchers += 1;
    }
}

/// Initialize a PackSet params
pub struct InitPackSetParams {
    /// Name
    pub name: [u8; 32],
    /// Pack authority
    pub authority: Pubkey,
    /// Authority to mint voucher editions
    pub minting_authority: Pubkey,
    /// If true authority can make changes at deactivated phase
    pub mutable: bool,
    /// Distribution type
    pub distribution_type: PackDistributionType,
    /// Allowed amount to redeem
    pub allowed_amount_to_redeem: u32,
    /// Redeem start date
    pub redeem_start_date: u64,
    /// Redeem end date
    pub redeem_end_date: Option<u64>,
}

impl Sealed for PackSet {}

impl Pack for PackSet {
    // 1 + 32 + 32 + 32 + 4 + 4 + 4 + 1 + 1
    const LEN: usize = 111;

    fn pack_into_slice(&self, dst: &mut [u8]) {
        let mut slice = dst;
        self.serialize(&mut slice).unwrap()
    }

    fn unpack_from_slice(src: &[u8]) -> Result<Self, ProgramError> {
        Self::try_from_slice(src).map_err(|_| {
            msg!("Failed to deserialize");
            ProgramError::InvalidAccountData
        })
    }
}

impl IsInitialized for PackSet {
    fn is_initialized(&self) -> bool {
        self.account_type != AccountType::Uninitialized && self.account_type == AccountType::PackSet
    }
}
