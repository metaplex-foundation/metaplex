//! EditPack instruction processing

use crate::{
    error::NFTPacksError,
    instruction::EditPackSetArgs,
    state::{PackSet, MAX_DESCRIPTION_LEN, MAX_URI_LENGTH},
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
pub fn edit_pack(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    args: EditPackSetArgs,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let pack_set_account = next_account_info(account_info_iter)?;
    let authority_account = next_account_info(account_info_iter)?;

    assert_signer(&authority_account)?;

    let mut pack_set = PackSet::unpack(&pack_set_account.data.borrow_mut())?;

    assert_account_key(authority_account, &pack_set.authority)?;

    pack_set.assert_able_to_edit()?;

    apply_changes(&mut pack_set, args)?;

    pack_set.puff_out_data_fields();

    PackSet::pack(pack_set, *pack_set_account.data.borrow_mut())?;

    Ok(())
}

fn apply_changes(pack_set: &mut PackSet, changes: EditPackSetArgs) -> Result<(), ProgramError> {
    if let Some(new_name) = changes.name {
        if new_name == pack_set.name {
            return Err(NFTPacksError::CantSetTheSameValue.into());
        }
        pack_set.name = new_name;
    }

    if let Some(description) = changes.description {
        if description == pack_set.description {
            return Err(NFTPacksError::CantSetTheSameValue.into());
        }
        if description.len() > MAX_DESCRIPTION_LEN {
            return Err(NFTPacksError::DescriptionTooLong.into());
        }
        pack_set.description = description;
    }

    if let Some(uri) = changes.uri {
        if uri == pack_set.uri {
            return Err(NFTPacksError::CantSetTheSameValue.into());
        }
        if uri.len() > MAX_URI_LENGTH {
            return Err(NFTPacksError::UriTooLong.into());
        }
        pack_set.uri = uri;
    }

    if let Some(new_mutable_value) = changes.mutable {
        if new_mutable_value == pack_set.mutable {
            return Err(NFTPacksError::CantSetTheSameValue.into());
        }
        pack_set.mutable = new_mutable_value;
    }

    Ok(())
}
