//! Init pack instruction processing

use crate::{
    error::NFTPacksError,
    instruction::InitPackSetArgs,
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

/// Process InitPack instruction
pub fn init_pack(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    args: InitPackSetArgs,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let pack_set_account = next_account_info(account_info_iter)?;
    let authority_account = next_account_info(account_info_iter)?;
    let minting_authority_account = next_account_info(account_info_iter)?;
    let rent_info = next_account_info(account_info_iter)?;
    let rent = &Rent::from_account_info(rent_info)?;

    assert_rent_exempt(rent, pack_set_account)?;
    assert_signer(authority_account)?;

    if args.total_packs == 0 {
        return Err(NFTPacksError::WrongTotalPacksAmount.into());
    }

    let mut pack_set = PackSet::unpack_unchecked(&pack_set_account.data.borrow_mut())?;

    if pack_set.is_initialized() {
        return Err(ProgramError::AccountAlreadyInitialized);
    }

    pack_set.init(InitPackSetParams {
        name: args.name,
        authority: *authority_account.key,
        minting_authority: *minting_authority_account.key,
        total_packs: args.total_packs,
        mutable: args.mutable,
    });

    pack_set
        .serialize(&mut *pack_set_account.data.borrow_mut())
        .map_err(|e| e.into())
}
