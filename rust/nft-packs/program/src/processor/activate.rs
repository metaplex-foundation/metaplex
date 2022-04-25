//! Activate instruction processing

use crate::{
    error::NFTPacksError,
    state::{PackSet, PackSetState},
    utils::*,
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    program_pack::Pack,
    pubkey::Pubkey,
};

/// Process Activate instruction
pub fn activate_pack(_program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let pack_set_account = next_account_info(account_info_iter)?;
    let authority_account = next_account_info(account_info_iter)?;

    assert_signer(&authority_account)?;

    let mut pack_set = PackSet::unpack(&pack_set_account.data.borrow_mut())?;
    assert_account_key(authority_account, &pack_set.authority)?;

    if pack_set.pack_cards == 0 || pack_set.pack_vouchers == 0 {
        return Err(NFTPacksError::PackSetNotConfigured.into());
    }

    if pack_set.pack_state != PackSetState::NotActivated
        && pack_set.pack_state != PackSetState::Deactivated
    {
        return Err(NFTPacksError::CantActivatePack.into());
    }

    pack_set.pack_state = PackSetState::Activated;

    PackSet::pack(pack_set, *pack_set_account.data.borrow_mut())?;

    Ok(())
}
