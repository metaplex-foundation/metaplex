//! State types
use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};
use solana_program::{program_error::ProgramError, pubkey::Pubkey};

mod pack_card;
mod pack_config;
mod pack_set;
mod pack_voucher;
mod proving_process;

pub use pack_card::*;
pub use pack_config::*;
pub use pack_set::*;
pub use pack_voucher::*;
pub use proving_process::*;

/// Global prefix for program addresses
pub const PREFIX: &str = "packs";

/// Max count of slots for lag
pub const MAX_LAG_SLOTS: u64 = 5;

/// Max pack cards amount
pub const MAX_PACK_CARDS_AMOUNT: u32 = 100;

/// Max len of pack URI
pub const MAX_URI_LENGTH: usize = 200;

/// Max len of pack description string
pub const MAX_DESCRIPTION_LEN: usize = 500;

/// Enum representing the account type managed by the program
#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize, BorshSchema)]
pub enum AccountType {
    /// If the account has not been initialized, the enum will be 0
    Uninitialized,
    /// Pack set
    PackSet,
    /// Pack card
    PackCard,
    /// Pack voucher
    PackVoucher,
    /// Proving process
    ProvingProcess,
    /// Pack config
    PackConfig,
}

impl Default for AccountType {
    fn default() -> Self {
        AccountType::Uninitialized
    }
}

/// Trait for master edition holders
pub trait MasterEditionHolder {
    /// Returns pack set this holder belongs to
    fn get_pack_set(&self) -> Pubkey;

    /// Returns master edition key
    fn get_master_edition(&self) -> Pubkey;

    /// Returns master metadata key
    fn get_master_metadata(&self) -> Pubkey;

    /// Returns token account of master mint
    fn get_token_account(&self) -> Pubkey;

    /// Increment total supply
    fn decrement_supply(&mut self) -> Result<(), ProgramError>;
}
