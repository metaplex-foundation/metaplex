//! Delete pack card instruction processing

use crate::{
    error::NFTPacksError,
    find_pack_card_program_address, find_program_authority,
    math::SafeMath,
    state::{PackCard, PackSet, PackSetState, PREFIX},
    utils::*,
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    program_pack::Pack,
    pubkey::Pubkey,
};

/// Process DeletePackCard instruction
pub fn delete_pack_card(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let pack_set_account = next_account_info(account_info_iter)?;
    let pack_card_account = next_account_info(account_info_iter)?;
    let authority_account = next_account_info(account_info_iter)?;
    let refunder_account = next_account_info(account_info_iter)?;
    let new_master_edition_owner_account = next_account_info(account_info_iter)?;
    let token_account = next_account_info(account_info_iter)?;
    let program_authority_account = next_account_info(account_info_iter)?;

    // Validate owners
    assert_owned_by(pack_set_account, program_id)?;
    assert_owned_by(pack_card_account, program_id)?;

    assert_signer(&authority_account)?;

    let (valid_program_authority, bump_seed) = find_program_authority(program_id);
    assert_account_key(program_authority_account, &valid_program_authority)?;

    // Obtain PackSet instance
    let mut pack_set = PackSet::unpack(&pack_set_account.data.borrow_mut())?;
    assert_account_key(authority_account, &pack_set.authority)?;

    // Ensure, that PackSet is in correct state
    // Only PackSetState::Ended or PackSetState::NotActivated is allowed
    if pack_set.pack_state != PackSetState::Ended
        && pack_set.pack_state != PackSetState::NotActivated
    {
        return Err(NFTPacksError::WrongPackState.into());
    }

    // Ensure, that PackCard is last
    let index = pack_set.pack_cards;
    let (last_pack_card, _) =
        find_pack_card_program_address(program_id, pack_set_account.key, index);
    assert_account_key(pack_card_account, &last_pack_card)?;

    // Obtain PackCard instance
    let pack_card = PackCard::unpack(&pack_card_account.data.borrow())?;
    assert_account_key(pack_set_account, &pack_card.pack_set)?;
    assert_account_key(token_account, &pack_card.token_account)?;

    // this check will work if someone forgot to claim card
    if pack_card.max_supply != 0 {
        return Err(NFTPacksError::NotEmptyPackSet.into());
    }

    // Obtain PackCard token account instance
    let pack_card_token_account = spl_token::state::Account::unpack(&token_account.data.borrow())?;

    // Decrement PackCard's counter in PackSet instance
    pack_set.pack_cards = pack_set.pack_cards.error_decrement()?;

    // Transfer PackCard tokens
    spl_token_transfer(
        token_account.clone(),
        new_master_edition_owner_account.clone(),
        program_authority_account.clone(),
        pack_card_token_account.amount,
        &[&[PREFIX.as_bytes(), program_id.as_ref(), &[bump_seed]]],
    )?;

    // Transfer all SOL from PackCard and delete PackCard account
    empty_account_balance(pack_card_account, refunder_account)?;

    // Update state
    PackSet::pack(pack_set, *pack_set_account.data.borrow_mut())?;
    Ok(())
}
