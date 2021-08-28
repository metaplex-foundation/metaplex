//! EditPack instruction processing

use crate::{
    error::NFTPacksError,
    state::{PackSet, PackSetState},
    instruction::EditPackSetArgs,
    utils::*,
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    program_error::ProgramError,
    program_pack::Pack,
    pubkey::Pubkey,
};

/// Process EditPack instruction
pub fn edit_pack(_program_id: &Pubkey, accounts: &[AccountInfo], args: EditPackSetArgs) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let pack_set_account = next_account_info(account_info_iter)?;
    let authority_account = next_account_info(account_info_iter)?;

    assert_signer(&authority_account)?;

    let mut pack_set = PackSet::unpack(&pack_set_account.data.borrow_mut())?;

    if *authority_account.key != pack_set.authority {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if !pack_set.mutable {
        return Err(NFTPacksError::ImmutablePackSet.into());
    }

    if pack_set.pack_state == PackSetState::Activated
    {
        return Err(NFTPacksError::WrongPackState.into());
    }

    apply_changes(&mut pack_set, args)?;

    PackSet::pack(pack_set, *pack_set_account.data.borrow_mut())?;

    Ok(())
}

fn apply_changes(pack_set: &mut PackSet, changes: EditPackSetArgs) -> Result<(), ProgramError> {
    if let changes.name = Some(new_name) {
        if new_name == pack_set.name {
            return Err(NFTPacksError::CantSetTheSameValue.into());
        }
        pack_set.name = new_name;
    }
    if let changes.total_packs = Some(new_total_packs) {
        if new_total_packs < pack_set.pack_cards {
            return Err(NFTPacksError::SmallTotalPacksAmount.into());
        }
        pack_set.total_packs = new_total_packs;
    }
    if let changes.mutable = Some(new_mutable_value) {
        if new_mutable_value == pack_set.mutable {
            return Err(NFTPacksError::CantSetTheSameValue.into());
        }
        pack_set.mutable = new_mutable_value;
    }
    Ok(())
}
