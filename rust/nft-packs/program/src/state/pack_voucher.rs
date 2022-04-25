//! Pack voucher definitions

use super::*;
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    msg,
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack, Sealed},
    pubkey::Pubkey,
};

/// Pack voucher
#[repr(C)]
#[derive(Debug, Clone, PartialEq, BorshSerialize, BorshDeserialize, BorshSchema, Default)]
pub struct PackVoucher {
    /// Account type - PackVoucher
    pub account_type: AccountType,
    /// Pack set
    pub pack_set: Pubkey,
    /// Master edition account
    pub master: Pubkey,
    /// Metadata account
    pub metadata: Pubkey,
}

impl PackVoucher {
    /// Prefix used to generate account
    pub const PREFIX: &'static str = "voucher";

    /// Initialize a PackVoucher
    pub fn init(&mut self, params: InitPackVoucherParams) {
        self.account_type = AccountType::PackVoucher;
        self.pack_set = params.pack_set;
        self.master = params.master;
        self.metadata = params.metadata;
    }
}

/// Initialize a PackVoucher params
pub struct InitPackVoucherParams {
    /// Pack set
    pub pack_set: Pubkey,
    /// Master edition account
    pub master: Pubkey,
    /// Metadata account
    pub metadata: Pubkey,
}

impl Sealed for PackVoucher {}

impl Pack for PackVoucher {
    // 1 + 32 + 32 + 32
    const LEN: usize = 97;

    fn pack_into_slice(&self, dst: &mut [u8]) {
        let mut slice = dst;
        self.serialize(&mut slice).unwrap()
    }

    fn unpack_from_slice(src: &[u8]) -> Result<Self, ProgramError> {
        let mut src_mut = src;
        Self::deserialize(&mut src_mut).map_err(|_| {
            msg!("Failed to deserialize");
            ProgramError::InvalidAccountData
        })
    }
}

impl IsInitialized for PackVoucher {
    fn is_initialized(&self) -> bool {
        self.account_type != AccountType::Uninitialized
            && self.account_type == AccountType::PackVoucher
    }
}
