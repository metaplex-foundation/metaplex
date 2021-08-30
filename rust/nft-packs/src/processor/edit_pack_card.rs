//! EditPackCard instruction processing

use crate::{
    error::NFTPacksError,
    instruction::EditPackCardArgs,
    state::{PackCard, PackSet, PackSetState},
    utils::*,
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    program_error::ProgramError,
    program_pack::Pack,
    pubkey::Pubkey,
};

/// Process EditPackCard instruction
pub fn edit_pack_card(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    args: EditPackCardArgs,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let pack_set_account = next_account_info(account_info_iter)?;
    let authority_account = next_account_info(account_info_iter)?;
    let pack_card_account = next_account_info(account_info_iter)?;

    assert_signer(&authority_account)?;
    assert_owned_by(pack_set_account, program_id)?;

    let pack_set = PackSet::unpack(&pack_set_account.data.borrow_mut())?;

    assert_account_key(authority_account, &pack_set.authority)?;

    if !pack_set.mutable {
        return Err(NFTPacksError::ImmutablePackSet.into());
    }

    if pack_set.pack_state == PackSetState::Activated {
        return Err(NFTPacksError::WrongPackState.into());
    }

    let mut pack_card = PackCard::unpack(&pack_card_account.data.borrow_mut())?;

    assert_account_key(pack_set_account, &pack_card.pack_set)?;

    apply_changes(&mut pack_card, args)?;

    PackCard::pack(pack_card, *pack_card_account.data.borrow_mut())?;

    Ok(())
}

fn apply_changes(pack_card: &mut PackCard, changes: EditPackCardArgs) -> Result<(), ProgramError> {
    if let Some(new_max_supply) = changes.max_supply {
        if new_max_supply < pack_card.current_supply {
            return Err(NFTPacksError::SmallMaxSupply.into());
        }
        if changes.max_supply == pack_card.max_supply {
            return Err(NFTPacksError::CantSetTheSameValue.into());
        }
        pack_card.max_supply = changes.max_supply;
    }

    if let Some(new_distribution_type) = changes.distribution_type {
        if new_distribution_type == pack_card.distribution_type {
            return Err(NFTPacksError::CantSetTheSameValue.into());
        }
        pack_card.distribution_type = new_distribution_type;
    }

    if let Some(new_number_in_pack) = changes.number_in_pack {
        if new_number_in_pack == pack_card.number_in_pack {
            return Err(NFTPacksError::CantSetTheSameValue.into());
        }
        pack_card.number_in_pack = new_number_in_pack;
    }

    Ok(())
}
