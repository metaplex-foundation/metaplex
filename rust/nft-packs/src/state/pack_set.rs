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
}

impl Default for PackSetState {
    fn default() -> Self {
        Self::NotActivated
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
    /// How many packs are available for redeeming
    pub total_packs: u32,
    /// Card masters counter
    pub pack_cards: u32,
    /// Pack voucher counter
    pub pack_vouchers: u32,
    /// If true authority can make changes at deactivated phase
    pub mutable: bool,
    /// Pack state
    pub pack_state: PackSetState,
}

impl PackSet {
    /// Initialize a PackSet
    pub fn init(
        &mut self,
        params: InitPackSetParams,
        authority: &Pubkey,
        minting_authority: &Pubkey,
    ) {
        self.account_type = AccountType::PackSet;
        self.name = params.name;
        self.authority = *authority;
        self.minting_authority = *minting_authority;
        self.total_packs = params.total_packs;
        self.pack_cards = 0;
        self.pack_vouchers = 0;
        self.mutable = params.mutable;
        self.pack_state = PackSetState::NotActivated;
    }
}

/// Initialize a PackSet params
#[repr(C)]
#[derive(Debug, Clone, PartialEq, BorshSerialize, BorshDeserialize, BorshSchema, Default)]
pub struct InitPackSetParams {
    /// Name
    pub name: [u8; 32],
    /// How many packs are available for redeeming
    pub total_packs: u32,
    /// If true authority can make changes at deactivated phase
    pub mutable: bool,
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
