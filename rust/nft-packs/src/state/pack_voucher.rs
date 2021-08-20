//! Pack voucher definitions

use super::*;
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    msg,
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack, Sealed},
    pubkey::Pubkey,
};

/// Action on prove
#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize, BorshSchema)]
pub enum ActionOnProve {
    /// Burn
    Burn,
    /// Redeem
    Redeem,
}

impl Default for ActionOnProve {
    fn default() -> Self {
        Self::Burn
    }
}

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
    /// Program token account which holds MasterEdition token
    pub token_account: Pubkey,
    /// How many instances of this card exists in all packs
    pub max_supply: Option<u32>,
    /// How many cards already minted
    pub current_supply: u32,
    /// How many vouchers of this type is required to open a pack
    pub number_to_open: u32,
    /// Burn / redeem
    pub action_on_prove: ActionOnProve,
}

impl PackVoucher {
    /// Initialize a PackVoucher
    pub fn init(&mut self, params: InitPackVoucherParams) {
        self.account_type = AccountType::PackVoucher;
        self.pack_set = params.pack_set;
        self.master = params.master;
        self.metadata = params.metadata;
        self.token_account = params.token_account;
        self.max_supply = params.max_supply;
        self.current_supply = 0;
        self.number_to_open = params.number_to_open;
        self.action_on_prove = params.action_on_prove;
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
    /// Program token account which holds MasterEdition token
    pub token_account: Pubkey,
    /// How many instances of this card exists in all packs
    pub max_supply: Option<u32>,
    /// How many vouchers of this type is required to open a pack
    pub number_to_open: u32,
    /// Burn / redeem
    pub action_on_prove: ActionOnProve,
}

impl Sealed for PackVoucher {}

impl Pack for PackVoucher {
    // 1 + 32 + 32 + 32 + 32 + (1 + 4) + 4 + 4 + 1
    const LEN: usize = 143;

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

impl IsInitialized for PackVoucher {
    fn is_initialized(&self) -> bool {
        self.account_type != AccountType::Uninitialized
            && self.account_type == AccountType::PackVoucher
    }
}
