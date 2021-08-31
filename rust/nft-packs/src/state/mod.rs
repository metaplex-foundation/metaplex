//! State types
use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};

mod pack_card;
mod pack_set;
mod pack_voucher;
mod proving_process;

pub use pack_card::*;
pub use pack_set::*;
pub use pack_voucher::*;
pub use proving_process::*;

/// Global prefix for program addresses
pub const PREFIX: &str = "packs";

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
}

impl Default for AccountType {
    fn default() -> Self {
        AccountType::Uninitialized
    }
}
