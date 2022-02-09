use {
    crate::{
        error::MetaplexError,
        state::{
            AuctionCache, AuctionManagerV2, Key, Store, CACHE, MAX_AUCTION_CACHE_SIZE,
            MAX_METADATA_PER_CACHE, PREFIX,
        },
        utils::{
            assert_derivation, assert_owned_by, assert_signer, create_or_allocate_account_raw,
        },
    },
    borsh::BorshSerialize,
    metaplex_auction::processor::AuctionData,
    metaplex_token_vault::state::SafetyDepositBox,
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        entrypoint::ProgramResult,
        pubkey::Pubkey,
        sysvar::{clock::Clock, Sysvar},
    },
};

pub fn process_set_auction_cache<'a>(
    program_id: &'a Pubkey,
    accounts: &'a [AccountInfo<'a>],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let auction_cache_info = next_account_info(account_info_iter)?;
    let payer_info = next_account_info(account_info_iter)?;
    let auction_info = next_account_info(account_info_iter)?;
    let safety_deposit_box_info = next_account_info(account_info_iter)?;
    let auction_manager_info = next_account_info(account_info_iter)?;
    let store_info = next_account_info(account_info_iter)?;
    let system_info = next_account_info(account_info_iter)?;
    let rent_info = next_account_info(account_info_iter)?;
    let clock_info = next_account_info(account_info_iter)?;
    let clock = Clock::from_account_info(clock_info)?;
    let store = Store::from_account_info(store_info)?;
    let _auction = AuctionData::from_account_info(auction_info)?;
    let auction_manager = AuctionManagerV2::from_account_info(auction_manager_info)?;
    let deposit_box = SafetyDepositBox::from_account_info(safety_deposit_box_info)?;

    assert_signer(payer_info)?;

    assert_owned_by(store_info, program_id)?;
    assert_owned_by(auction_manager_info, program_id)?;
    assert_owned_by(auction_info, &store.auction_program)?;
    assert_owned_by(safety_deposit_box_info, &store.token_vault_program)?;

    assert_derivation(
        &store.auction_program,
        auction_info,
        &[
            metaplex_auction::PREFIX.as_bytes(),
            store.auction_program.as_ref(),
            deposit_box.vault.as_ref(),
        ],
    )?;

    assert_derivation(
        &store.token_vault_program,
        safety_deposit_box_info,
        &[
            metaplex_token_vault::state::PREFIX.as_bytes(),
            auction_manager.vault.as_ref(),
            deposit_box.token_mint.as_ref(),
        ],
    )?;

    if deposit_box.vault != auction_manager.vault {
        return Err(MetaplexError::InvalidSafetyDepositBox.into());
    }

    if system_info.key != &solana_program::system_program::id() {
        return Err(MetaplexError::InvalidSystemProgram.into());
    }

    let bump = assert_derivation(
        program_id,
        auction_cache_info,
        &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            store_info.key.as_ref(),
            auction_info.key.as_ref(),
            CACHE.as_bytes(),
        ],
    )?;

    let (metadata, _) = Pubkey::find_program_address(
        &[
            metaplex_token_metadata::state::PREFIX.as_bytes(),
            store.token_metadata_program.as_ref(),
            deposit_box.token_mint.as_ref(),
        ],
        &store.token_metadata_program,
    );

    let mut cache: AuctionCache;
    if auction_cache_info.data_is_empty() {
        let signer_seeds = &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            store_info.key.as_ref(),
            auction_info.key.as_ref(),
            CACHE.as_bytes(),
            &[bump],
        ];

        create_or_allocate_account_raw(
            *program_id,
            auction_cache_info,
            rent_info,
            system_info,
            payer_info,
            MAX_AUCTION_CACHE_SIZE,
            signer_seeds,
        )?;
        cache = AuctionCache::from_account_info(auction_cache_info)?;
        cache.timestamp = clock.unix_timestamp;
        cache.store = *store_info.key;
    } else {
        cache = AuctionCache::from_account_info(auction_cache_info)?;
    }

    assert_owned_by(auction_cache_info, program_id)?;

    cache.key = Key::AuctionCacheV1;
    cache.vault = auction_manager.vault;
    cache.auction_manager = *auction_manager_info.key;
    cache.auction = *auction_info.key;

    if cache.metadata.len() == MAX_METADATA_PER_CACHE {
        return Err(MetaplexError::MaxMetadataCacheSizeReached.into());
    }
    for key in &cache.metadata {
        if key == &metadata {
            return Err(MetaplexError::DuplicateKeyDetected.into());
        }
    }

    cache.metadata.push(metadata);
    cache.serialize(&mut *auction_cache_info.data.borrow_mut())?;

    Ok(())
}
