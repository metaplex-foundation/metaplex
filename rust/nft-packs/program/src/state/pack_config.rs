//! Pack config definitions
use crate::{error::NFTPacksError, math::SafeMath};

use super::*;
use borsh::{BorshDeserialize, BorshSerialize};
use num_traits::ToPrimitive;
use solana_program::{
    msg,
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack, Sealed},
};

/// Pack config. PDA (["config", pack_key], program_id)
#[repr(C)]
#[derive(Debug, Clone, PartialEq, BorshSerialize, BorshDeserialize)]
pub struct PackConfig {
    /// account type - PackConfig
    pub account_type: AccountType,
    /// weights; Vec<u32 card_index, u32 either max_supply or weight, u32 max_supply for weighted cards>
    pub weights: Vec<(u32, u32, u32)>,
    /// action instruction has to do
    pub action_to_do: CleanUpActions,
}

/// Action CleanUp instruction has to do
#[repr(C)]
#[derive(Debug, Clone, PartialEq, BorshSerialize, BorshDeserialize)]
pub enum CleanUpActions {
    // change value or if new_value == 0 delete it
    /// index and new_value
    Change(u32, u32),
    ///
    Sort,
    ///
    None,
}

impl PackConfig {
    /// Prefix used to generate account
    pub const PREFIX: &'static str = "config";

    /// Initialize a PackConfig
    pub fn init(&mut self) {
        self.account_type = AccountType::PackConfig;
        self.weights = Vec::new();
        self.action_to_do = CleanUpActions::None;
    }

    /// Assert cleaned up
    pub fn assert_cleaned_up(&mut self) -> Result<(), ProgramError> {
        if self.action_to_do != CleanUpActions::None {
            return Err(NFTPacksError::WeightsNotCleanedUp.into());
        }
        Ok(())
    }

    /// Sort the weights vec
    pub fn sort(&mut self) {
        self.weights.sort_by(|a, b| b.1.cmp(&a.1));
    }

    /// Remove a weight
    pub fn remove_at(&mut self, index: u32) {
        let idx = self.weights.iter().position(|x| x.0 == index);
        idx.map(|x| self.weights.remove(x));
    }

    /// Change weight
    pub fn change_weight(&mut self, index: u32, new_value: u32) -> Result<(), ProgramError> {
        let idx = self
            .weights
            .iter()
            .position(|x| x.0 == index)
            .ok_or(NFTPacksError::InvalidWeightPosition)?;

        if let Some(elem) = self.weights.get_mut(idx) {
            *elem = (elem.0, new_value, elem.2);
        }

        if idx != self.weights.len() - 1 {
            let next_value_idx = (idx as u32).error_increment()? as usize;
            let next_value = self
                .weights
                .get_mut(next_value_idx)
                .ok_or(NFTPacksError::InvalidWeightPosition)?;

            if next_value.1 > new_value {
                self.weights.swap(next_value_idx, index as usize);
            }
        }

        Ok(())
    }

    /// Change supply
    pub fn change_supply(&mut self, index: u32, new_value: u32) -> Result<(), ProgramError> {
        let idx = self
            .weights
            .iter()
            .position(|x| x.0 == index)
            .ok_or(NFTPacksError::InvalidWeightPosition)?;

        if let Some(elem) = self.weights.get_mut(idx) {
            *elem = (elem.0, elem.1, new_value);
        }

        Ok(())
    }

    /// Select a random choice with weights
    pub fn select_weighted_random(
        &mut self,
        rand: u16,
        weight_sum: u64,
    ) -> Result<(u32, u32, u32), ProgramError> {
        let selected = self.weights.last().unwrap();
        let mut bound = if weight_sum == 0 {
            let max = rand / self.weights.len() as u16;
            rand.clamp(0, max) as u32
        } else {
            let rndp = rand as f64 / u16::MAX as f64;
            (rndp * weight_sum as f64).round().to_u32().unwrap()
        };
        for i in self.weights.iter() {
            bound = match bound.error_sub(i.1) {
                Ok(num) => num,
                Err(_) => 0,
            };
            if bound <= 0 {
                return Ok(i.clone());
            }
        }
        return Ok(selected.clone());
    }
}

impl Sealed for PackConfig {}

impl Pack for PackConfig {
    /// Max size of config to hold max allowed amount of cards - 100
    const LEN: usize = 1205;

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

impl IsInitialized for PackConfig {
    fn is_initialized(&self) -> bool {
        self.account_type != AccountType::Uninitialized
            && self.account_type == AccountType::PackConfig
    }
}
