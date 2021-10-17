//! EditPackVoucher instruction processing

use crate::{
    error::NFTPacksError,
    instruction::EditPackVoucherArgs,
    math::SafeMath,
    state::{PackSet, PackVoucher},
    utils::*,
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    program_error::ProgramError,
    program_pack::Pack,
    pubkey::Pubkey,
};
use spl_token_metadata::state::{MasterEdition, MasterEditionV2};

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
    let voucher_master_account = next_account_info(account_info_iter)?;

    assert_signer(&authority_account)?;
    assert_owned_by(pack_set_account, program_id)?;
    assert_owned_by(voucher_master_account, &spl_token_metadata::id())?;

    let pack_set = PackSet::unpack(&pack_set_account.data.borrow_mut())?;

    assert_account_key(authority_account, &pack_set.authority)?;

    pack_set.assert_able_to_edit()?;

    let mut pack_voucher = PackVoucher::unpack(&pack_voucher_account.data.borrow_mut())?;

    assert_account_key(voucher_master_account, &pack_voucher.master)?;

    let master_edition = MasterEditionV2::from_account_info(voucher_master_account)?;

    assert_account_key(pack_set_account, &pack_voucher.pack_set)?;

    apply_changes(&mut pack_voucher, &master_edition, args)?;

    PackVoucher::pack(pack_voucher, *pack_voucher_account.data.borrow_mut())?;

    Ok(())
}

fn apply_changes(
    pack_voucher: &mut PackVoucher,
    master_edition: &MasterEditionV2,
    changes: EditPackVoucherArgs,
) -> Result<(), ProgramError> {
    if let Some(new_number_to_open) = changes.number_to_open {
        if new_number_to_open == 0 {
            return Err(NFTPacksError::WrongNumberToOpen.into());
        }
        if let Some(m_e_max_supply) = master_edition.max_supply() {
            if (new_number_to_open as u64) > m_e_max_supply.error_add(master_edition.supply())? {
                return Err(NFTPacksError::WrongNumberToOpen.into());
            }
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
