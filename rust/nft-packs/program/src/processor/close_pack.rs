//! ClosePack instruction processing

use crate::{
    error::NFTPacksError,
    state::{PackSet, PackSetState},
    utils::*,
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    clock::Clock,
    entrypoint::ProgramResult,
    program_pack::Pack,
    pubkey::Pubkey,
    sysvar::Sysvar,
};

/// Process ClosePack instruction
pub fn close_pack(_program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let pack_set_account = next_account_info(account_info_iter)?;
    let authority_account = next_account_info(account_info_iter)?;
    let clock_info = next_account_info(account_info_iter)?;
    let clock = Clock::from_account_info(clock_info)?;

    assert_signer(&authority_account)?;

    let mut pack_set = PackSet::unpack(&pack_set_account.data.borrow_mut())?;
    assert_account_key(authority_account, &pack_set.authority)?;

    if let Some(end_date) = pack_set.redeem_end_date {
        if (clock.unix_timestamp as u64) < end_date {
            return Err(NFTPacksError::EndDateNotArrived.into());
        }
    }

    if pack_set.pack_state == PackSetState::Ended {
        return Err(NFTPacksError::PackIsAlreadyEnded.into());
    }

    pack_set.pack_state = PackSetState::Ended;

    PackSet::pack(pack_set, *pack_set_account.data.borrow_mut())?;

    Ok(())
}
