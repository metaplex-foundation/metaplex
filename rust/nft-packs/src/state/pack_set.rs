//! Pack set definitions

use super::*;
use crate::{error::NFTPacksError, math::SafeMath};
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    borsh::try_from_slice_unchecked,
    msg,
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack, Sealed},
    pubkey::Pubkey,
};
use spl_token_metadata::state::{MasterEdition, MasterEditionV2};

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
    /// Unlimited
    Unlimited,
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
    /// Link to pack set image
    pub uri: String,
    /// Pack authority
    pub authority: Pubkey,
    /// Authority to mint voucher editions
    pub minting_authority: Pubkey,
    /// Card masters counter
    pub pack_cards: u32,
    /// Pack voucher counter
    pub pack_vouchers: u32,
    /// Total amount of editions pack can mint
    pub total_editions: Option<u64>,
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
        self.uri = params.uri;
        self.authority = params.authority;
        self.minting_authority = params.minting_authority;
        self.total_editions = if params.distribution_type == PackDistributionType::Unlimited {
            None
        } else {
            Some(0)
        };
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

    /// Check if pack is in activated state
    pub fn assert_activated(&self) -> Result<(), ProgramError> {
        if self.pack_state != PackSetState::Activated {
            return Err(NFTPacksError::PackSetNotActivated.into());
        }

        Ok(())
    }

    /// Check if pack is in ended state
    pub fn assert_ended(&self) -> Result<(), ProgramError> {
        if self.pack_state != PackSetState::Ended {
            return Err(NFTPacksError::WrongPackState.into());
        }

        Ok(())
    }

    /// Check if pack is mutable and in a right state to edit data
    pub fn assert_able_to_edit(&self) -> Result<(), ProgramError> {
        if !self.mutable {
            return Err(NFTPacksError::ImmutablePackSet.into());
        }

        if self.pack_state == PackSetState::Activated || self.pack_state == PackSetState::Ended {
            return Err(NFTPacksError::WrongPackState.into());
        }

        Ok(())
    }

    /// Add new card editions to pack
    pub fn add_card_editions(
        &mut self,
        card_max_supply: &Option<u32>,
        card_master_edition: &MasterEditionV2,
    ) -> Result<(), ProgramError> {
        match self.distribution_type {
            PackDistributionType::Unlimited => {
                if card_max_supply.is_some() {
                    return Err(NFTPacksError::WrongMaxSupply.into());
                }

                if card_master_edition.max_supply().is_some() {
                    return Err(NFTPacksError::WrongMasterSupply.into());
                }
            }
            _ => {
                if let Some(m_supply) = card_max_supply {
                    if let Some(m_e_max_supply) = card_master_edition.max_supply() {
                        if (*m_supply as u64)
                            > m_e_max_supply.error_sub(card_master_edition.supply())?
                        {
                            return Err(NFTPacksError::WrongMaxSupply.into());
                        }
                    }
                    if *m_supply == 0 {
                        return Err(NFTPacksError::WrongMaxSupply.into());
                    }

                    self.total_editions = Some(
                        self.total_editions
                            .ok_or(NFTPacksError::MissingEditionsInPack)?
                            .error_add(*m_supply as u64)?,
                    );
                } else {
                    return Err(NFTPacksError::WrongMaxSupply.into());
                }
            }
        }

        Ok(())
    }
}

/// Initialize a PackSet params
pub struct InitPackSetParams {
    /// Name
    pub name: [u8; 32],
    /// URI
    pub uri: String,
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
    // 1 + 32 + 200 + 32 + 32 + 4 + 4 + 9 + 1 + 1 + 1 + 4 + 8 + 9
    const LEN: usize = 338;

    fn pack_into_slice(&self, dst: &mut [u8]) {
        let mut slice = dst;
        self.serialize(&mut slice).unwrap()
    }

    fn unpack_from_slice(src: &[u8]) -> Result<Self, ProgramError> {
        if (src[0] != AccountType::PackSet as u8 && src[0] != AccountType::Uninitialized as u8)
            || src.len() != Self::LEN
        {
            msg!("Failed to deserialize");
            return Err(ProgramError::InvalidAccountData);
        }

        let result: Self = try_from_slice_unchecked(src)?;

        Ok(result)
    }
}

impl IsInitialized for PackSet {
    fn is_initialized(&self) -> bool {
        self.account_type != AccountType::Uninitialized && self.account_type == AccountType::PackSet
    }
}
