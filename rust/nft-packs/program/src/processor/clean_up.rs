//! Clean up pack config account

use crate::{
    error::NFTPacksError,
    find_pack_config_program_address,
    state::{CleanUpActions, PackConfig, PackDistributionType, PackSet, PackSetState},
    utils::*,
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    program_pack::Pack,
    pubkey::Pubkey,
};

/// Process CleanUp instruction
pub fn clean_up(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let pack_set_info = next_account_info(account_info_iter)?;
    let pack_config_info = next_account_info(account_info_iter)?;

    let mut pack_set = PackSet::unpack(&pack_set_info.data.borrow_mut())?;

    if pack_set.pack_state == PackSetState::NotActivated {
        return Err(NFTPacksError::WrongPackState.into());
    }

    let (pack_config_pubkey, _) = find_pack_config_program_address(program_id, pack_set_info.key);
    assert_account_key(pack_config_info, &pack_config_pubkey)?;
    let mut pack_config = PackConfig::unpack(&pack_config_info.data.borrow_mut())?;
    match pack_config.action_to_do {
        CleanUpActions::Change(card_index, new_value) => {
            if new_value == 0 {
                pack_config.remove_at(card_index);
            } else {
                match pack_set.distribution_type {
                    PackDistributionType::MaxSupply => {
                        pack_config.change_weight(card_index, new_value)?;
                    }
                    _ => {
                        pack_config.change_supply(card_index, new_value)?;
                    }
                }
            }
            pack_set.decrement_supply()?;
            pack_config.action_to_do = CleanUpActions::None;
            PackSet::pack(pack_set, *pack_set_info.data.borrow_mut())?;
            PackConfig::pack(pack_config, *pack_config_info.data.borrow_mut())?;

            Ok(())
        }
        CleanUpActions::Sort => {
            pack_config.sort();
            pack_config.action_to_do = CleanUpActions::None;
            PackConfig::pack(pack_config, *pack_config_info.data.borrow_mut())?;

            Ok(())
        }
        CleanUpActions::None => Ok(()),
    }
}
