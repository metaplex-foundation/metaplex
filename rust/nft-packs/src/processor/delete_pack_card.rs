//! Delete pack card instruction processing

use crate::{
    error::NFTPacksError,
    state::{PackCard, PackSet, PackSetState},
    utils::*,
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    program_pack::Pack,
    pubkey::Pubkey,
    sysvar::{rent::Rent, Sysvar},
};

/// Process DeletePackCard instruction
pub fn delete_pack_card(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let pack_set_account = next_account_info(account_info_iter)?;
    let pack_card_account = next_account_info(account_info_iter)?;
    let authority_account = next_account_info(account_info_iter)?;
    let refunder_account = next_account_info(account_info_iter)?;
    let new_master_edition_owner = next_account_info(account_info_iter)?;
    let token_account = next_account_info(account_info_iter)?;

    // Validate owners
    assert_owned_by(pack_set_account, program_id)?;
    assert_owned_by(pack_card_account, program_id)?;

    assert_signer(&authority_account)?;

    // Obtain PackSet instance
    let mut pack_set = PackSet::unpack(&pack_set_account.data.borrow_mut())?;
    assert_account_key(authority_account, &pack_set.authority)?;

    // Ensure that PackSet is in valid state
    if pack_set.pack_state != PackSetState::Deactivated {
        return Err(NFTPacksError::WrongPackState.into());
    }

    // Obtain PackCard instance
    let pack_card = PackCard::unpack(&pack_card_account.data.borrow())?;
    assert_account_key(pack_set_account, &pack_card.pack_set)?;
    assert_account_key(token_account, &pack_card.token_account)?;

    // Obtain PackCard token account instance
    let pack_card_token_account = spl_token::state::Account::unpack(&token_account.data.borrow())?;

    // Decrement PackCard's counter in PackSet instance
    pack_set.pack_cards -= 1;

    // Transfer PackCard tokens
    spl_token_transfer(
        token_account.clone(),
        new_master_edition_owner.clone(),
        authority_account.clone(),
        pack_card_token_account.amount,
        &[],
    )?;

    // Transfer all SOL from PackCard and delete PackCard account
    transfer(pack_card_account, refunder_account)?;

    // Update state
    PackSet::pack(pack_set, *pack_set_account.data.borrow_mut())?;

    Ok(())
}
