//! DeletePackConfig instruction processing

use crate::{error::NFTPacksError, find_pack_config_program_address, state::PackSet, utils::*};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    program_pack::Pack,
    pubkey::Pubkey,
};

/// Process DeletePackConfig instruction
pub fn delete_pack_config(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let pack_set_account = next_account_info(account_info_iter)?;
    let pack_config_account = next_account_info(account_info_iter)?;
    let refunder_account = next_account_info(account_info_iter)?;
    let authority_account = next_account_info(account_info_iter)?;

    assert_signer(&authority_account)?;

    let pack_set = PackSet::unpack(&pack_set_account.data.borrow_mut())?;

    assert_account_key(authority_account, &pack_set.authority)?;

    pack_set.assert_ended()?;

    if pack_set.pack_cards != 0 || pack_set.pack_vouchers != 0 {
        return Err(NFTPacksError::NotEmptyPackSet.into());
    }

    let (pack_config_pubkey, _) =
        find_pack_config_program_address(program_id, pack_set_account.key);
    assert_account_key(pack_config_account, &pack_config_pubkey)?;

    empty_account_balance(pack_config_account, refunder_account)?;

    Ok(())
}
