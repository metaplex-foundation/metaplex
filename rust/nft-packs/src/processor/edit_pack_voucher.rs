//! EditPackVoucher instruction processing

use crate::{
    error::NFTPacksError,
    instruction::EditPackVoucherArgs,
    state::{PackSet, PackSetState, PackVoucher},
    utils::*,
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    program_error::ProgramError,
    program_pack::Pack,
    pubkey::Pubkey,
};

/// Process EditPackVoucher instruction
pub fn edit_pack_voucher(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    args: EditPackVoucherArgs,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let pack_set_account = next_account_info(account_info_iter)?;
    let authority_account = next_account_info(account_info_iter)?;
    let pack_voucher_account = next_account_info(account_info_iter)?;

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

    let mut pack_voucher = PackVoucher::unpack(&pack_voucher_account.data.borrow_mut())?;

    assert_account_key(pack_set_account, &pack_voucher.pack_set)?;

    apply_changes(&mut pack_voucher, args)?;

    PackVoucher::pack(pack_voucher, *pack_voucher_account.data.borrow_mut())?;

    Ok(())
}

fn apply_changes(
    pack_voucher: &mut PackVoucher,
    changes: EditPackVoucherArgs,
) -> Result<(), ProgramError> {
    if let Some(new_max_supply) = changes.max_supply {
        if new_max_supply < pack_voucher.current_supply {
            return Err(NFTPacksError::SmallMaxSupply.into());
        }
        if changes.max_supply == pack_voucher.max_supply {
            return Err(NFTPacksError::CantSetTheSameValue.into());
        }
        pack_voucher.max_supply = changes.max_supply;
    }

    if let Some(new_number_to_open) = changes.number_to_open {
        if new_number_to_open == 0 {
            return Err(NFTPacksError::WrongNumberToOpen.into());
        }
        if new_number_to_open == pack_voucher.number_to_open {
            return Err(NFTPacksError::CantSetTheSameValue.into());
        }
        pack_voucher.number_to_open = new_number_to_open;
    }

    if let Some(new_action_to_prove) = changes.action_on_prove {
        if new_action_to_prove == pack_voucher.action_on_prove {
            return Err(NFTPacksError::CantSetTheSameValue.into());
        }
        pack_voucher.action_on_prove = new_action_to_prove;
    }

    Ok(())
}
