//! Pack set definitions

use super::*;
use crate::{
    error::NFTPacksError,
    math::SafeMath,
    state::{MAX_DESCRIPTION_LEN, MAX_URI_LENGTH},
    MAX_WEIGHT_VALUE,
};
use borsh::{BorshDeserialize, BorshSerialize};
use mpl_token_metadata::state::{MasterEdition, MasterEditionV2};
use solana_program::{
    borsh::try_from_slice_unchecked,
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
    /// Store
    pub store: Pubkey,
    /// Pack authority
    pub authority: Pubkey,
    /// Description
    pub description: String,
    /// Link to pack set image
    pub uri: String,
    /// Name
    pub name: [u8; 32],
    /// Card masters counter
    pub pack_cards: u32,
    /// Pack voucher counter
    pub pack_vouchers: u32,
    /// Total weight
    pub total_weight: u64,
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
        self.store = params.store;
        self.name = params.name;
        self.description = params.description;
        self.uri = params.uri;
        self.authority = params.authority;
        self.total_weight = 0;
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
    pub fn add_pack_card(&mut self) -> Result<(), ProgramError> {
        self.pack_cards = self.pack_cards.error_increment()?;
        Ok(())
    }

    /// Increase pack voucher counter
    pub fn add_pack_voucher(&mut self) -> Result<(), ProgramError> {
        self.pack_vouchers += self.pack_vouchers.error_increment()?;
        Ok(())
    }

    /// Decrement supply value
    pub fn decrement_supply(&mut self) -> Result<(), ProgramError> {
        self.total_editions = self.total_editions.error_decrement()?;
        Ok(())
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

    /// Add new card volume to pack
    pub fn add_card_volume(
        &mut self,
        card_weight: u32,
        card_supply: u32,
        card_master_edition: &MasterEditionV2,
    ) -> Result<(), ProgramError> {
        match self.distribution_type {
            PackDistributionType::Unlimited => {
                if card_master_edition.max_supply().is_some() {
                    return Err(NFTPacksError::WrongMasterSupply.into());
                }

                if card_weight == 0 || card_weight > (MAX_WEIGHT_VALUE as u32) {
                    return Err(NFTPacksError::WrongCardProbability.into());
                }

                if card_supply != 0 {
                    return Err(NFTPacksError::CardShouldntHaveSupplyValue.into());
                }

                self.total_weight = self.total_weight.error_add(card_weight as u64)?;
            }

            PackDistributionType::MaxSupply => {
                if let Some(m_e_max_supply) = card_master_edition.max_supply() {
                    if (card_supply as u64)
                        > m_e_max_supply.error_sub(card_master_edition.supply())?
                        || card_supply == 0
                    {
                        return Err(NFTPacksError::WrongMaxSupply.into());
                    }
                }

                if card_weight != 0 {
                    return Err(NFTPacksError::CardShouldntHaveProbabilityValue.into());
                }

                self.total_editions = self.total_editions.error_add(card_supply as u64)?;
            }

            PackDistributionType::Fixed => {
                if let Some(m_e_max_supply) = card_master_edition.max_supply() {
                    if (card_supply as u64)
                        > m_e_max_supply.error_sub(card_master_edition.supply())?
                        || card_supply == 0
                    {
                        return Err(NFTPacksError::WrongMaxSupply.into());
                    }
                }

                if card_weight == 0 || card_weight > (MAX_WEIGHT_VALUE as u32) {
                    return Err(NFTPacksError::WrongCardProbability.into());
                }

                self.total_editions = self.total_editions.error_add(card_supply as u64)?;
                self.total_weight = self.total_weight.error_add(card_weight as u64)?;
            }
        }

        Ok(())
    }

    /// fill unused bytes with zeroes
    pub fn puff_out_data_fields(&mut self) {
        let mut array_of_zeroes = vec![];
        while array_of_zeroes.len() < MAX_URI_LENGTH - self.uri.len() {
            array_of_zeroes.push(0u8);
        }
        self.uri = self.uri.clone() + std::str::from_utf8(&array_of_zeroes).unwrap();

        let mut array_of_zeroes = vec![];

        while array_of_zeroes.len() < MAX_DESCRIPTION_LEN - self.description.len() {
            array_of_zeroes.push(0u8);
        }
        self.description =
            self.description.clone() + std::str::from_utf8(&array_of_zeroes).unwrap();
    }
}

/// Initialize a PackSet params
pub struct InitPackSetParams {
    /// Store
    pub store: Pubkey,
    /// Name
    pub name: [u8; 32],
    /// Description
    pub description: String,
    /// URI
    pub uri: String,
    /// Pack authority
    pub authority: Pubkey,
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
    const LEN: usize = 885;

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
