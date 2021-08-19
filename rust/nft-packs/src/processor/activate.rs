//! Activate instruction processing

use crate::{
    error::NFTPacksError,
    state::{InitPackSetParams, PackSet},
    utils::*,
};
use borsh::BorshSerialize;
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack},
    pubkey::Pubkey,
    sysvar::{rent::Rent, Sysvar},
};

/// Process Activate instruction
pub fn init_pack(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let pack_set_account = next_account_info(account_info_iter)?;
    let authority_account = next_account_info(account_info_iter)?;

    assert_signer(&authority_account)?;

    let mut pack_set = PackSet::unpack(&pack_set_account.data.borrow_mut())?;

    if *authority_account.key != pack_set.authority {
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    if pack_set.pack_cards == 0 || pack_set.pack_vouchers == 0 {
        return Err();
    }
}