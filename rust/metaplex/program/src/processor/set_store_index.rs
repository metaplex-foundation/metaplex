use borsh::BorshSerialize;
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
};

use crate::{
    error::MetaplexError,
    instruction::SetStoreIndexArgs,
    state::{
        AuctionCache, Key, Store, StoreIndexer, CACHE, INDEX, MAX_INDEXED_ELEMENTS,
        MAX_STORE_INDEXER_SIZE, PREFIX,
    },
    utils::{assert_derivation, assert_owned_by, assert_signer, create_or_allocate_account_raw},
};
pub fn process_set_store_index<'a>(
    program_id: &'a Pubkey,
    accounts: &'a [AccountInfo<'a>],
    args: SetStoreIndexArgs,
) -> ProgramResult {
    let SetStoreIndexArgs { offset, page } = args;

    let offset = offset as usize;

    let account_info_iter = &mut accounts.iter();

    let store_index_info = next_account_info(account_info_iter)?;
    let payer_info = next_account_info(account_info_iter)?;
    let auction_cache_info = next_account_info(account_info_iter)?;
    let store_info = next_account_info(account_info_iter)?;
    let system_info = next_account_info(account_info_iter)?;
    let rent_info = next_account_info(account_info_iter)?;
    // Either above_cache_info or below_cache_info, depending on usage
    let positional_info_1 = next_account_info(account_info_iter).ok();
    // Either below_cache_info or unused, depending on usage
    let positional_info_2 = next_account_info(account_info_iter).ok();
    let _store = Store::from_account_info(store_info)?;
    let auction_cache = AuctionCache::from_account_info(auction_cache_info)?;

    assert_signer(payer_info)?;
    assert_owned_by(store_info, program_id)?;
    assert_owned_by(auction_cache_info, program_id)?;

    if system_info.key != &solana_program::system_program::id() {
        return Err(MetaplexError::InvalidSystemProgram.into());
    }

    assert_derivation(
        program_id,
        auction_cache_info,
        &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            store_info.key.as_ref(),
            auction_cache.auction.as_ref(),
            CACHE.as_bytes(),
        ],
    )?;

    let as_string = page.to_string();
    let bump = assert_derivation(
        program_id,
        store_index_info,
        &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            store_info.key.as_ref(),
            INDEX.as_bytes(),
            as_string.as_bytes(),
        ],
    )?;

    if store_index_info.data_is_empty() {
        let signer_seeds = &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            store_info.key.as_ref(),
            INDEX.as_bytes(),
            as_string.as_bytes(),
            &[bump],
        ];

        create_or_allocate_account_raw(
            *program_id,
            store_index_info,
            rent_info,
            system_info,
            payer_info,
            MAX_STORE_INDEXER_SIZE,
            signer_seeds,
        )?;
    }

    assert_owned_by(store_index_info, program_id)?;

    let mut indexer = StoreIndexer::from_account_info(store_index_info)?;
    indexer.key = Key::StoreIndexerV1;
    indexer.store = *store_info.key;
    indexer.page = page;

    if offset > indexer.auction_caches.len() {
        return Err(MetaplexError::InvalidCacheOffset.into());
    }

    let above_key = indexer.auction_caches.get(offset);
    let below_key = offset
        .checked_sub(1)
        .and_then(|i| indexer.auction_caches.get(i));

    let (above_cache_info, below_cache_info) = if above_key.is_some() {
        msg!("Cache found above - using both above and below account args");

        (positional_info_1, positional_info_2)
    } else {
        msg!("No cache found above - treating above account arg as below");

        if positional_info_2.is_some() {
            msg!("!! Ignoring extra account passed for below");
        }

        // When above is not required, below becomes the first and only account argument
        // here
        (None, positional_info_1)
    };

    let below_cache = below_cache_info
        .map(|below| {
            let unwrapped = AuctionCache::from_account_info(below)?;

            assert_derivation(
                program_id,
                below,
                &[
                    PREFIX.as_bytes(),
                    program_id.as_ref(),
                    store_info.key.as_ref(),
                    unwrapped.auction.as_ref(),
                    CACHE.as_bytes(),
                ],
            )?;
            assert_owned_by(below, program_id)?;

            Result::<_, ProgramError>::Ok(unwrapped)
        })
        .transpose()?;

    let above_cache = above_cache_info
        .map(|above| {
            let unwrapped = AuctionCache::from_account_info(above)?;

            assert_derivation(
                program_id,
                above,
                &[
                    PREFIX.as_bytes(),
                    program_id.as_ref(),
                    store_info.key.as_ref(),
                    unwrapped.auction.as_ref(),
                    CACHE.as_bytes(),
                ],
            )?;
            assert_owned_by(above, program_id)?;

            Result::<_, ProgramError>::Ok(unwrapped)
        })
        .transpose()?;

    if let Some(above_key) = above_key {
        let abo = above_cache.ok_or(MetaplexError::ExpectedAboveAuctionCacheToBeProvided)?;
        let above_cache_info_unwrapped = above_cache_info.ok_or_else(|| {
            msg!("Missing above cache info (should never happen)");
            MetaplexError::InvalidOperation
        })?;

        if above_cache_info_unwrapped.key != above_key {
            return Err(MetaplexError::CacheMismatch.into());
        } else if abo.timestamp > auction_cache.timestamp {
            return Err(MetaplexError::CacheAboveIsNewer.into());
        }
    }

    if let Some(below_key) = below_key {
        let bel = below_cache.ok_or(MetaplexError::ExpectedBelowAuctionCacheToBeProvided)?;
        let below_cache_info_unwrapped = below_cache_info.ok_or_else(|| {
            msg!("Missing below cache info (should never happen)");
            MetaplexError::InvalidOperation
        })?;

        if below_cache_info_unwrapped.key != below_key {
            return Err(MetaplexError::CacheMismatch.into());
        } else if bel.timestamp < auction_cache.timestamp {
            return Err(MetaplexError::CacheBelowIsOlder.into());
        }
    }

    let mut new_vec: Vec<_> = indexer.auction_caches.drain(..offset).collect();
    new_vec.insert(offset, *auction_cache_info.key);
    new_vec.extend(
        indexer.auction_caches.into_iter().take(
            MAX_INDEXED_ELEMENTS
                .checked_sub(new_vec.len())
                .ok_or(MetaplexError::NumericalOverflowError)?,
        ),
    );

    indexer.auction_caches = new_vec;
    indexer.serialize(&mut *store_index_info.data.borrow_mut())?;

    Ok(())
}
