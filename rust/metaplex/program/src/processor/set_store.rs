use crate::state::StoreConfig;

use {
    crate::{
        error::MetaplexError,
        state::{Key, Store, CONFIG, MAX_STORE_CONFIG_V1_SIZE, MAX_STORE_SIZE, PREFIX},
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

pub fn set_store_logic<'a>(
    public: bool,
    program_id: &Pubkey,
    auction_program_info: &'a AccountInfo<'a>,
    token_vault_program_info: &'a AccountInfo<'a>,
    rent_info: &'a AccountInfo<'a>,
    system_info: &'a AccountInfo<'a>,
    token_metadata_program_info: &'a AccountInfo<'a>,
    token_program_info: &'a AccountInfo<'a>,
    store_info: &'a AccountInfo<'a>,
    admin_wallet_info: &'a AccountInfo<'a>,
    payer_info: &'a AccountInfo<'a>,
) -> ProgramResult {
    assert_signer(payer_info)?;
    assert_signer(admin_wallet_info)?;
    if !store_info.data_is_empty() {
        assert_owned_by(store_info, program_id)?;
    }

    let store_bump = assert_derivation(
        program_id,
        store_info,
        &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            admin_wallet_info.key.as_ref(),
        ],
    )?;

    if store_info.data_is_empty() {
        create_or_allocate_account_raw(
            *program_id,
            store_info,
            rent_info,
            system_info,
            payer_info,
            MAX_STORE_SIZE,
            &[
                PREFIX.as_bytes(),
                program_id.as_ref(),
                admin_wallet_info.key.as_ref(),
                &[store_bump],
            ],
        )?;
    }

    let mut store = Store::from_account_info(store_info)?;
    store.key = Key::StoreV1;
    store.public = public;
    // Keys can only be set once, once set from all 0s, they are immutable.
    if store.token_program == solana_program::system_program::id() {
        store.token_program = *token_program_info.key;
    }

    if store.token_program != spl_token::id() {
        return Err(MetaplexError::InvalidTokenProgram.into());
    }

    if store.token_vault_program == solana_program::system_program::id() {
        store.token_vault_program = *token_vault_program_info.key;
    }
    if store.token_metadata_program == solana_program::system_program::id() {
        store.token_metadata_program = *token_metadata_program_info.key;
    }
    if store.auction_program == solana_program::system_program::id() {
        store.auction_program = *auction_program_info.key;
    }
    store.serialize(&mut *store_info.data.borrow_mut())?;
    Ok(())
}

pub fn process_set_store<'a>(
    program_id: &'a Pubkey,
    accounts: &'a [AccountInfo<'a>],
    public: bool,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let store_info = next_account_info(account_info_iter)?;
    let admin_wallet_info = next_account_info(account_info_iter)?;
    let payer_info = next_account_info(account_info_iter)?;
    let token_program_info = next_account_info(account_info_iter)?;
    let token_vault_program_info = next_account_info(account_info_iter)?;
    let token_metadata_program_info = next_account_info(account_info_iter)?;
    let auction_program_info = next_account_info(account_info_iter)?;
    let system_info = next_account_info(account_info_iter)?;
    let rent_info = next_account_info(account_info_iter)?;

    set_store_logic(
        public,
        program_id,
        auction_program_info,
        token_vault_program_info,
        rent_info,
        system_info,
        token_metadata_program_info,
        token_program_info,
        store_info,
        admin_wallet_info,
        payer_info,
    )
}

pub fn process_set_store_v2<'a>(
    program_id: &'a Pubkey,
    accounts: &'a [AccountInfo<'a>],
    public: bool,
    settings_uri: Option<String>,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let store_info = next_account_info(account_info_iter)?;
    let store_config_info = next_account_info(account_info_iter)?;
    let admin_wallet_info = next_account_info(account_info_iter)?;
    let payer_info = next_account_info(account_info_iter)?;
    let token_program_info = next_account_info(account_info_iter)?;
    let token_vault_program_info = next_account_info(account_info_iter)?;
    let token_metadata_program_info = next_account_info(account_info_iter)?;
    let auction_program_info = next_account_info(account_info_iter)?;
    let system_info = next_account_info(account_info_iter)?;
    let rent_info = next_account_info(account_info_iter)?;

    let res = set_store_logic(
        public,
        program_id,
        auction_program_info,
        token_vault_program_info,
        rent_info,
        system_info,
        token_metadata_program_info,
        token_program_info,
        store_info,
        admin_wallet_info,
        payer_info,
    );
    if res.is_err() {
        return res;
    }
    if !store_config_info.data_is_empty() {
        assert_owned_by(store_config_info, program_id)?;
    }
    let store_config_bump = assert_derivation(
        program_id,
        store_config_info,
        &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            CONFIG.as_bytes(),
            store_info.key.as_ref(),
        ],
    )?;

    if store_config_info.data_is_empty() {
        create_or_allocate_account_raw(
            *program_id,
            store_config_info,
            rent_info,
            system_info,
            payer_info,
            MAX_STORE_CONFIG_V1_SIZE,
            &[
                PREFIX.as_bytes(),
                program_id.as_ref(),
                CONFIG.as_bytes(),
                store_info.key.as_ref(),
                &[store_config_bump],
            ],
        )?;
    }
    let mut config = StoreConfig::from_account_info(store_config_info)?;
    config.key = Key::StoreConfigV1;
    config.settings_uri = settings_uri;
    config.serialize(&mut *store_config_info.data.borrow_mut())?;
    Ok(())
}
