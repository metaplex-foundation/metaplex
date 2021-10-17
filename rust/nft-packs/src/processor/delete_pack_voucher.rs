//! Delete pack voucher instruction processing

use crate::{
    find_pack_voucher_program_address, find_program_authority,
    math::SafeMath,
    state::{PackSet, PackVoucher, PREFIX},
    utils::*,
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    program_pack::Pack,
    pubkey::Pubkey,
};

/// Process DeletePackVoucher instruction
pub fn delete_pack_voucher(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let pack_set_account = next_account_info(account_info_iter)?;
    let pack_voucher_account = next_account_info(account_info_iter)?;
    let authority_account = next_account_info(account_info_iter)?;
    let refunder_account = next_account_info(account_info_iter)?;
    let new_master_edition_owner_account = next_account_info(account_info_iter)?;
    let token_account = next_account_info(account_info_iter)?;
    let program_authority_account = next_account_info(account_info_iter)?;

    // Validate owners
    assert_owned_by(pack_set_account, program_id)?;
    assert_owned_by(pack_voucher_account, program_id)?;

    assert_signer(&authority_account)?;

    let (valid_program_authority, bump_seed) = find_program_authority(program_id);
    assert_account_key(program_authority_account, &valid_program_authority)?;

    // Obtain PackSet instance
    let mut pack_set = PackSet::unpack(&pack_set_account.data.borrow_mut())?;
    assert_account_key(authority_account, &pack_set.authority)?;

    pack_set.assert_ended()?;

    // Ensure that provided PackVoucher is last
    let index = pack_set.pack_vouchers;
    let (last_pack_voucher, _) =
        find_pack_voucher_program_address(program_id, pack_set_account.key, index);
    assert_account_key(pack_voucher_account, &last_pack_voucher)?;

    // Obtain PackVoucher instance
    let pack_voucher = PackVoucher::unpack(&pack_voucher_account.data.borrow())?;
    assert_account_key(pack_set_account, &pack_voucher.pack_set)?;
    assert_account_key(token_account, &pack_voucher.token_account)?;

    // Obtain PackVoucher token account instance
    let pack_voucher_token_account =
        spl_token::state::Account::unpack(&token_account.data.borrow())?;

    // Decrement PackVoucher's counter in PackSet instance
    pack_set.pack_vouchers = pack_set.pack_vouchers.error_decrement()?;

    // Transfer PackVoucher tokens
    spl_token_transfer(
        token_account.clone(),
        new_master_edition_owner_account.clone(),
        program_authority_account.clone(),
        pack_voucher_token_account.amount,
        &[&[PREFIX.as_bytes(), program_id.as_ref(), &[bump_seed]]],
    )?;

    // Transfer all SOL from PackVoucher and delete PackVoucher account
    empty_account_balance(pack_voucher_account, refunder_account)?;

    // Update state
    PackSet::pack(pack_set, *pack_set_account.data.borrow_mut())?;

    Ok(())
}
