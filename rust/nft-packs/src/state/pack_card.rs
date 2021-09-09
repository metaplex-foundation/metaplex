//! Pack card definitions

use super::*;
use crate::math::SafeMath;
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    msg,
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack, Sealed},
    pubkey::Pubkey,
};

/// Probability type
#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize, BorshSchema)]
pub enum DistributionType {
    /// Fixed number
    FixedNumber,
    /// Probability based
    ProbabilityBased,
}

impl Default for DistributionType {
    fn default() -> Self {
        Self::FixedNumber
    }
}

/// Pack card
#[repr(C)]
#[derive(Debug, Clone, PartialEq, BorshSerialize, BorshDeserialize, BorshSchema, Default)]
pub struct PackCard {
    /// Account type - PackCard
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
    /// Fixed number / probability-based
    pub distribution_type: DistributionType,
    /// Average number of cards in pack multiplied by 10^9 and truncated
    pub number_in_pack: u64,
    /// How many cards already minted
    pub current_supply: u32,
}

impl PackCard {
    /// Prefix used to generate account
    pub const PREFIX: &'static str = "card";

    /// Initialize a PackCard
    pub fn init(&mut self, params: InitPackCardParams) {
        self.account_type = AccountType::PackCard;
        self.pack_set = params.pack_set;
        self.master = params.master;
        self.metadata = params.metadata;
        self.token_account = params.token_account;
        self.max_supply = params.max_supply;
        self.distribution_type = params.distribution_type;
        self.number_in_pack = params.number_in_pack;
        self.current_supply = 0;
    }
}

/// Initialize a PackCard params
pub struct InitPackCardParams {
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
    /// Fixed number / probability-based
    pub distribution_type: DistributionType,
    /// Average number of cards in pack multiplied by 10^9 and truncated
    pub number_in_pack: u64,
}

impl Sealed for PackCard {}

impl Pack for PackCard {
    // 1 + 32 + 32 + 32 + 32 + (1 + 8) + 1 + 8 + 4
    const LEN: usize = 151;

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

impl IsInitialized for PackCard {
    fn is_initialized(&self) -> bool {
        self.account_type != AccountType::Uninitialized
            && self.account_type == AccountType::PackCard
    }
}

impl MasterEditionHolder for PackCard {
    fn get_pack_set(&self) -> Pubkey {
        self.pack_set
    }

    fn get_master_edition(&self) -> Pubkey {
        self.master
    }

    fn get_master_metadata(&self) -> Pubkey {
        self.metadata
    }

    fn get_token_account(&self) -> Pubkey {
        self.token_account
    }

    fn increment_supply(&mut self) -> Result<(), ProgramError> {
        self.current_supply = self.current_supply.error_increment()?;

        Ok(())
    }
}
