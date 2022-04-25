//! Proving process definitions

use super::*;
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    borsh::try_from_slice_unchecked,
    msg,
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack, Sealed},
    pubkey::Pubkey,
};
use std::collections::BTreeMap;

/// Proving process
#[repr(C)]
#[derive(Debug, Clone, PartialEq, BorshSerialize, BorshDeserialize, Default)]
pub struct ProvingProcess {
    /// Account type - ProvingProcess
    pub account_type: AccountType,
    ///
    pub wallet_key: Pubkey,
    ///
    pub is_exhausted: bool,
    /// Voucher mint
    pub voucher_mint: Pubkey,
    /// Pack set
    pub pack_set: Pubkey,
    ///
    pub cards_redeemed: u32,
    /// BTreeMap with cards to redeem and statuses if it's already redeemed
    pub cards_to_redeem: BTreeMap<u32, u32>,
}

impl ProvingProcess {
    /// Prefix used to generate account
    pub const PREFIX: &'static str = "proving";

    /// Amount of tokens for prove operation
    pub const TOKEN_AMOUNT: u64 = 1;

    /// Initialize a ProvingProcess
    pub fn init(&mut self, params: InitProvingProcessParams) {
        self.account_type = AccountType::ProvingProcess;
        self.wallet_key = params.wallet_key;
        self.voucher_mint = params.voucher_mint;
        self.pack_set = params.pack_set;
        self.cards_to_redeem = BTreeMap::new();
    }
}

/// Initialize a ProvingProcess params
pub struct InitProvingProcessParams {
    /// User wallet key
    pub wallet_key: Pubkey,
    /// Voucher mint
    pub voucher_mint: Pubkey,
    /// Pack set
    pub pack_set: Pubkey,
}

impl Sealed for ProvingProcess {}

impl Pack for ProvingProcess {
    // 1 + 32 + 1 + 32 + 32 + 4 + BTreeMap size for 100 cards(800)
    // When calculating size for custom data structures like `BTreeMap` does not
    // include structure header size(in that case is always 24-bytes).
    // Calculate size for underlying(template) types only(u32 + u32 = 8bytes in this case).
    const LEN: usize = 902;

    fn pack_into_slice(&self, dst: &mut [u8]) {
        let mut slice = dst;
        self.serialize(&mut slice).unwrap()
    }

    fn unpack_from_slice(src: &[u8]) -> Result<Self, ProgramError> {
        try_from_slice_unchecked(src).map_err(|_| {
            msg!("Failed to deserialize");
            ProgramError::InvalidAccountData
        })
    }
}

impl IsInitialized for ProvingProcess {
    fn is_initialized(&self) -> bool {
        self.account_type != AccountType::Uninitialized
            && self.account_type == AccountType::ProvingProcess
    }
}
