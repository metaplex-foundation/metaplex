use solana_program::msg;

use {
    crate::{
        error::MetaplexError,
        instruction::SetStoreIndexArgs,
        state::{
            AuctionCache, Key, Store, StoreIndexer, CACHE, INDEX, MAX_INDEXED_ELEMENTS,
            MAX_STORE_INDEXER_SIZE, PREFIX,
        },
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
pub fn process_set_store_index<'a>(
    program_id: &'a Pubkey,
    accounts: &'a [AccountInfo<'a>],
    args: SetStoreIndexArgs,
) -> ProgramResult {
    let SetStoreIndexArgs { offset, page } = args;

    let offset_u = offset as usize;

    let account_info_iter = &mut accounts.iter();

    let store_index_info = next_account_info(account_info_iter)?;
    let payer_info = next_account_info(account_info_iter)?;
    let auction_cache_info = next_account_info(account_info_iter)?;
    let store_info = next_account_info(account_info_iter)?;
    let system_info = next_account_info(account_info_iter)?;
    let rent_info = next_account_info(account_info_iter)?;
    let above_cache_info = next_account_info(account_info_iter).ok();
    let below_cache_info = next_account_info(account_info_iter).ok();
    let _store = Store::from_account_info(store_info)?;
    let auction_cache = AuctionCache::from_account_info(auction_cache_info)?;

    let mut below_cache: Option<AuctionCache> = None;
    let mut above_cache: Option<AuctionCache> = None;

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

    if let Some(below) = below_cache_info {
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

        below_cache = Some(unwrapped);
    }

    if let Some(above) = &above_cache_info {
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

        above_cache = Some(unwrapped);
    }

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

    if offset_u > indexer.auction_caches.len() {
        return Err(MetaplexError::InvalidCacheOffset.into());
    }

    if indexer.auction_caches.len() > 0 && offset_u < indexer.auction_caches.len() - 1 {
        let above_key = &indexer.auction_caches[offset_u];
        if let Some(abo) = &above_cache {
            if let Some(above_cache_info_unwrapped) = above_cache_info {
                if above_cache_info_unwrapped.key != above_key {
                    return Err(MetaplexError::CacheMismatch.into());
                } else if abo.timestamp > auction_cache.timestamp {
                    return Err(MetaplexError::CacheAboveIsNewer.into());
                }
            } else {
                msg!("Should never happen");
                return Err(MetaplexError::InvalidOperation.into());
            }
        } else {
            return Err(MetaplexError::ExpectedAboveAuctionCacheToBeProvided.into());
        }
    }

    if offset_u > 0 {
        let below_key = &indexer.auction_caches[offset_u - 1];
        // special case where you're at top of stack, there is no above
        let cache_used_for_below = if offset_u == indexer.auction_caches.len() - 1 {
            &above_cache
        } else {
            &below_cache
        };

        let cache_info_used_for_below = if offset_u == indexer.auction_caches.len() - 1 {
            above_cache_info
        } else {
            below_cache_info
        };

        if let Some(bel) = cache_used_for_below {
            if let Some(below_cache_info_unwrapped) = cache_info_used_for_below {
                if below_cache_info_unwrapped.key != below_key {
                    return Err(MetaplexError::CacheMismatch.into());
                } else if bel.timestamp < auction_cache.timestamp {
                    return Err(MetaplexError::CacheBelowIsOlder.into());
                }
            } else {
                msg!("Should never happen");
                return Err(MetaplexError::InvalidOperation.into());
            }
        } else {
            return Err(MetaplexError::ExpectedAboveAuctionCacheToBeProvided.into());
        }
    }

    let mut new_vec = vec![];

    for n in 0..offset_u {
        new_vec.push(indexer.auction_caches[n])
    }

    new_vec.push(*auction_cache_info.key);

    for n in offset_u..indexer.auction_caches.len() {
        if new_vec.len() == MAX_INDEXED_ELEMENTS {
            break;
        }
        new_vec.push(indexer.auction_caches[n])
    }

    indexer.auction_caches = new_vec;
    indexer.serialize(&mut *store_index_info.data.borrow_mut())?;
    Ok(())
}
