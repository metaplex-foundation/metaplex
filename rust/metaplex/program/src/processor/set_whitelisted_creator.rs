use {
    crate::{
        state::{Key, WhitelistedCreator, MAX_WHITELISTED_CREATOR_SIZE, PREFIX},
        utils::{
            assert_derivation, assert_owned_by, assert_signer, create_or_allocate_account_raw,
        },
    },
    borsh::BorshSerialize,
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        entrypoint::ProgramResult,
        pubkey::Pubkey,
    },
};

pub fn process_set_whitelisted_creator<'a>(
    program_id: &'a Pubkey,
    accounts: &'a [AccountInfo<'a>],
    activated: bool,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let whitelisted_creator_info = next_account_info(account_info_iter)?;
    let admin_wallet_info = next_account_info(account_info_iter)?;
    let payer_info = next_account_info(account_info_iter)?;
    let creator_info = next_account_info(account_info_iter)?;
    let store_info = next_account_info(account_info_iter)?;
    let system_info = next_account_info(account_info_iter)?;
    let rent_info = next_account_info(account_info_iter)?;

    assert_signer(payer_info)?;
    assert_signer(admin_wallet_info)?;
    if !whitelisted_creator_info.data_is_empty() {
        assert_owned_by(whitelisted_creator_info, program_id)?;
    }
    assert_owned_by(store_info, program_id)?;

    assert_derivation(
        program_id,
        store_info,
        &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            admin_wallet_info.key.as_ref(),
        ],
    )?;

    let creator_bump = assert_derivation(
        program_id,
        whitelisted_creator_info,
        &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            store_info.key.as_ref(),
            creator_info.key.as_ref(),
        ],
    )?;

    if whitelisted_creator_info.data_is_empty() {
        create_or_allocate_account_raw(
            *program_id,
            whitelisted_creator_info,
            rent_info,
            system_info,
            payer_info,
            MAX_WHITELISTED_CREATOR_SIZE,
            &[
                PREFIX.as_bytes(),
                program_id.as_ref(),
                store_info.key.as_ref(),
                creator_info.key.as_ref(),
                &[creator_bump],
            ],
        )?;
    }

    let mut whitelisted_creator = WhitelistedCreator::from_account_info(whitelisted_creator_info)?;
    whitelisted_creator.key = Key::WhitelistedCreatorV1;
    whitelisted_creator.address = *creator_info.key;
    whitelisted_creator.activated = activated;

    whitelisted_creator.serialize(&mut *whitelisted_creator_info.data.borrow_mut())?;
    Ok(())
}
