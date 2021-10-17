//! Pack card definitions

use super::*;
use crate::{error::NFTPacksError, math::SafeMath, MAX_PROBABILITY_VALUE};
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    msg,
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack, Sealed},
    pubkey::Pubkey,
};

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
    /// How many instances(editions) of this card exists in this pack
    pub max_supply: Option<u32>,
    /// Fixed probability, should be filled if PackSet distribution_type is "fixed"
    pub probability: Option<u16>,
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
        self.probability = params.probability;
    }

    /// Get card probability value
    pub fn get_probability(&self) -> Result<u128, ProgramError> {
        Ok((self
            .probability
            .ok_or(NFTPacksError::CardProbabilityMissing)? as u128) // it shouldn't happen because there is a check on AddCardToPack
            .error_mul(u16::MAX as u128)?
            .error_div(MAX_PROBABILITY_VALUE as u128)?)
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
    /// How many instances of this card will exists in a packs
    pub max_supply: Option<u32>,
    /// Fixed probability, should be filled if PackSet distribution_type is "fixed"
    pub probability: Option<u16>,
}

impl Sealed for PackCard {}

impl Pack for PackCard {
    // 1 + 32 + 32 + 32 + 32 + 9 + 9
    const LEN: usize = 147;

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

    fn decrement_supply(&mut self) -> Result<(), ProgramError> {
        if let Some(max_supply) = self.max_supply {
            self.max_supply = Some(max_supply.error_decrement()?);
        } else {
            return Err(NFTPacksError::CardDoesntHaveMaxSupply.into());
        }

        Ok(())
    }
}
