#![cfg(any(test, feature = "test-bpf"))]
#![cfg_attr(not(feature = "test-bpf"), allow(dead_code))]

use std::{collections::HashMap, convert::TryInto};

use borsh::BorshSerialize;
use mpl_metaplex::{
    error::MetaplexError,
    id,
    instruction::{MetaplexInstruction, SetStoreIndexArgs},
    state::{
        AuctionCache, Key, Store, StoreIndexer, CACHE, INDEX, MAX_AUCTION_CACHE_SIZE,
        MAX_INDEXED_ELEMENTS, MAX_STORE_INDEXER_SIZE, MAX_STORE_SIZE, PREFIX,
    },
};
use solana_program::{
    account_info::AccountInfo, decode_error::DecodeError, program_error::ProgramError,
};
use solana_program_test::*;
use solana_sdk::{
    account::Account,
    bs58,
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signer::Signer,
    transaction::Transaction,
};

fn program_test() -> ProgramTest {
    ProgramTest::new("mpl_metaplex", id(), None)
}

/// Pretty-print a Metaplex program error
fn pretty_err(e: ProgramError) -> String {
    if let ProgramError::Custom(c) = e {
        if let Some(e) =
            <MetaplexError as DecodeError<MetaplexError>>::decode_custom_error_to_enum(c)
        {
            e.to_string()
        } else {
            e.to_string()
        }
    } else {
        e.to_string()
    }
}

/// One-stop shop for constructing a PDA account with an expected length
fn make_pda(seeds: &[&[u8]], acct: impl BorshSerialize, alloc_len: usize) -> (Pubkey, Account) {
    let mut data = vec![0_u8; alloc_len];
    // Borrow as a slice to impose a fixed allocation length
    acct.serialize(&mut data.as_mut_slice()).unwrap();

    (
        Pubkey::find_program_address(seeds, &id()).0,
        Account {
            lamports: 1_000_000_000,
            data,
            owner: id(),
            executable: false,
            rent_epoch: 0,
        },
    )
}

/// Derive and serialize a `Store` into an account
fn make_store(owner: Pubkey, store: Store) -> (Pubkey, Account) {
    let id = id();

    make_pda(
        &[PREFIX.as_bytes(), id.as_ref(), owner.as_ref()],
        store,
        MAX_STORE_SIZE,
    )
}

/// Derive and serialize an `AuctionCache` into an account
fn make_cache(cache: AuctionCache) -> (Pubkey, Account) {
    let id = id();
    let store = cache.store;
    let auction = cache.auction;

    make_pda(
        &[
            PREFIX.as_bytes(),
            id.as_ref(),
            store.as_ref(),
            auction.as_ref(),
            CACHE.as_bytes(),
        ],
        cache,
        MAX_AUCTION_CACHE_SIZE,
    )
}

/// Derive and serialize a `StoreIndexer` into an account
fn make_index(index: StoreIndexer) -> (Pubkey, Account) {
    let id = id();
    let store = index.store;
    let page = index.page.to_string();

    make_pda(
        &[
            PREFIX.as_bytes(),
            id.as_ref(),
            store.as_ref(),
            INDEX.as_bytes(),
            page.as_bytes(),
        ],
        index,
        MAX_STORE_INDEXER_SIZE,
    )
}

/// A timestamp for an auction cache
struct Time(i64);

/// Helper for storing the two optional above/below arguments for a
/// SetStoreIndex instruction
enum Positional<CacheId> {
    Zero,
    One(CacheId),
    Two(CacheId, CacheId),
}

use Positional::{One, Two, Zero};

/// Simplification of a `SetStoreArgs` instruction for the test bed below
struct SetStoreIndex<CacheId> {
    offset: usize,
    cache: CacheId,
    pos: Positional<CacheId>,
}

/// Test bed for `set_store_index` tests.
///
/// `caches` is a list of auction caches to be added to a new store index.
/// `extra_caches` is a list of auction caches which will be created but not
/// indexed, to be referenced by the test itself.  `args` is a sequence of
/// `SetStoreIndex` instructions to be processed, after which point the
/// modified store index will be compared against the list of keys in
/// `expected caches`.
async fn test_set_index<
    CacheId: std::fmt::Debug + Copy + Eq + std::hash::Hash,
    E: ExactSizeIterator<Item = CacheId>,
>(
    store_owner: Pubkey,
    caches: impl IntoIterator<Item = (CacheId, Time)>,
    extra_caches: impl IntoIterator<Item = (CacheId, Time)>,
    args: impl IntoIterator<Item = SetStoreIndex<CacheId>>,
    expected_caches: impl IntoIterator<IntoIter = E>,
) {
    let stub_key = Pubkey::new(&[0; 32]);
    let mut test = program_test();

    let (store_key, store_acct) = make_store(
        store_owner,
        Store {
            key: Key::StoreV1,
            public: false,
            auction_program: stub_key,
            token_vault_program: stub_key,
            token_metadata_program: stub_key,
            token_program: stub_key,
        },
    );
    test.add_account(store_key, store_acct);

    let mut cache_dict = HashMap::new();
    let mut cache_time = HashMap::new();
    let mut auction_caches = vec![];

    for ((id, Time(timestamp)), index) in caches
        .into_iter()
        .map(|c| (c, true))
        .chain(extra_caches.into_iter().map(|e| (e, false)))
    {
        let (key, acct) = make_cache(AuctionCache {
            key: Key::AuctionCacheV1,
            store: store_key,
            timestamp,
            metadata: vec![],
            auction: Pubkey::new_unique(),
            vault: stub_key,
            auction_manager: stub_key,
        });
        test.add_account(key, acct);
        assert!(
            cache_dict.insert(id, key).is_none(),
            "Duplicate cache ID {:?} given",
            id
        );

        assert!(
            cache_time.insert(key, timestamp).is_none(),
            "Duplicate cache pubkey {:?} given by {:?}",
            key,
            id
        );

        if index {
            auction_caches.push(key);
        }
    }

    let page = 1337_u64;

    let (index_key, index_acct) = make_index(StoreIndexer {
        key: Key::StoreIndexerV1,
        store: store_key,
        page,
        auction_caches,
    });
    test.add_account(index_key, index_acct);

    let mut ctx = test.start_with_context().await;
    let payer = ctx.payer;
    let mut instructions = vec![];

    for SetStoreIndex { offset, cache, pos } in args {
        let mut accounts = vec![
            AccountMeta::new(index_key, false),
            AccountMeta::new_readonly(payer.pubkey(), true),
            AccountMeta::new_readonly(cache_dict[&cache], false),
            AccountMeta::new_readonly(store_key, false),
            AccountMeta::new_readonly(stub_key, false),
            AccountMeta::new_readonly(stub_key, false),
        ];

        match pos {
            Zero => (),
            One(a) => accounts.push(AccountMeta::new_readonly(cache_dict[&a], false)),
            Two(a, b) => accounts.extend(
                vec![a, b]
                    .into_iter()
                    .map(|a| AccountMeta::new_readonly(cache_dict[&a], false)),
            ),
        }

        for (i, account) in accounts.iter().enumerate() {
            if account.pubkey == stub_key || account.pubkey == payer.pubkey() {
                continue;
            }

            ctx.banks_client
                .get_account(account.pubkey)
                .await
                .unwrap()
                .expect(&format!(
                    "Passed nonexistant account argument {} at {}",
                    account.pubkey, i
                ));
        }

        instructions.push(Instruction {
            program_id: id(),
            accounts,
            data: MetaplexInstruction::SetStoreIndex(SetStoreIndexArgs {
                page,
                offset: offset.try_into().unwrap(),
            })
            .try_to_vec()
            .unwrap(),
        });
    }

    let tx = Transaction::new_signed_with_payer(
        &*instructions,
        Some(&payer.pubkey()),
        &[&payer],
        ctx.last_blockhash,
    );

    ctx.banks_client.process_transaction(tx).await.unwrap();

    let mut actual_index = ctx
        .banks_client
        .get_account(index_key)
        .await
        .unwrap()
        .expect("Missing store index after instructions");

    let actual_index = StoreIndexer::from_account_info(&AccountInfo::new(
        &index_key,
        false,
        false,
        &mut 1_000_000_000,
        &mut actual_index.data,
        &actual_index.owner,
        actual_index.executable,
        actual_index.rent_epoch,
    ))
    .map_err(pretty_err)
    .unwrap();

    let expected_caches = expected_caches.into_iter();
    assert_eq!(expected_caches.len(), actual_index.auction_caches.len());

    let mut last_time = None;

    expected_caches
        .map(|c| cache_dict[&c])
        .zip(actual_index.auction_caches.into_iter())
        .enumerate()
        .for_each(|(i, (expected, actual))| {
            assert_eq!(expected, actual, "Cache mismatch at index {}", i);

            let time = cache_time[&actual];
            if let Some(ref t) = last_time {
                assert!(*t > time, "Cache at index {} out-of-order", i);
            }
            last_time = Some(time);
        });
}

mod set_store_index {
    use super::*;

    /// Assert that the test bench works at all
    #[cfg_attr(feature = "test-bpf", tokio::test)]
    async fn test_nop() {
        let store = Pubkey::new_unique();
        test_set_index(store, None::<((), Time)>, None, None, None).await;
    }

    /// Assert that the initial insertion into an index works
    #[cfg_attr(feature = "test-bpf", tokio::test)]
    async fn test_empty() {
        let store = Pubkey::new_unique();

        test_set_index(
            store,
            None,
            Some(("cache", Time(1))),
            Some(SetStoreIndex {
                offset: 0,
                cache: "cache",
                pos: Zero,
            }),
            Some("cache"),
        )
        .await;
    }

    /// Assert that prepending to a single-element index works
    #[cfg_attr(feature = "test-bpf", tokio::test)]
    async fn test_prepend_one() {
        let store = Pubkey::new_unique();

        test_set_index(
            store,
            Some(("cache", Time(1))),
            Some(("before", Time(2))),
            Some(SetStoreIndex {
                offset: 0,
                cache: "before",
                pos: One("cache"),
            }),
            vec!["before", "cache"],
        )
        .await;
    }

    /// Assert that appending to a single-element index works
    #[cfg_attr(feature = "test-bpf", tokio::test)]
    async fn test_append_one() {
        let store = Pubkey::new_unique();

        test_set_index(
            store,
            Some(("cache", Time(2))),
            Some(("after", Time(1))),
            Some(SetStoreIndex {
                offset: 1,
                cache: "after",
                pos: One("cache"),
            }),
            vec!["cache", "after"],
        )
        .await;
    }

    /// Assert that prepending to a multi-element index works
    #[cfg_attr(feature = "test-bpf", tokio::test)]
    async fn test_prepend_many() {
        let store = Pubkey::new_unique();

        test_set_index(
            store,
            vec![
                ("cache0", Time(3)),
                ("cache1", Time(2)),
                ("cache2", Time(1)),
            ],
            Some(("before", Time(4))),
            Some(SetStoreIndex {
                offset: 0,
                cache: "before",
                pos: One("cache0"),
            }),
            vec!["before", "cache0", "cache1", "cache2"],
        )
        .await;
    }

    /// Assert that appending to a multi-element index works
    #[cfg_attr(feature = "test-bpf", tokio::test)]
    async fn test_append_many() {
        let store = Pubkey::new_unique();

        test_set_index(
            store,
            vec![
                ("cache0", Time(4)),
                ("cache1", Time(3)),
                ("cache2", Time(2)),
            ],
            Some(("after", Time(1))),
            Some(SetStoreIndex {
                offset: 3,
                cache: "after",
                pos: One("cache2"),
            }),
            vec!["cache0", "cache1", "cache2", "after"],
        )
        .await;
    }

    /// Assert that inserting into the middle of a multi-element index works
    #[cfg_attr(feature = "test-bpf", tokio::test)]
    async fn test_insert_many_middle() {
        let store = Pubkey::new_unique();

        test_set_index(
            store,
            vec![
                ("cache0", Time(4)),
                ("cache1", Time(2)),
                ("cache2", Time(1)),
            ],
            Some(("middle", Time(3))),
            Some(SetStoreIndex {
                offset: 1,
                cache: "middle",
                pos: Two("cache1", "cache0"),
            }),
            vec!["cache0", "middle", "cache1", "cache2"],
        )
        .await;
    }

    /// Assert that inserting into the second-to-last element of a
    /// multi-element index works
    #[cfg_attr(feature = "test-bpf", tokio::test)]
    async fn test_insert_many_last() {
        let store = Pubkey::new_unique();

        test_set_index(
            store,
            vec![
                ("cache0", Time(4)),
                ("cache1", Time(3)),
                ("cache2", Time(1)),
            ],
            Some(("middle", Time(2))),
            Some(SetStoreIndex {
                offset: 2,
                cache: "middle",
                pos: Two("cache2", "cache1"),
            }),
            vec!["cache0", "cache1", "middle", "cache2"],
        )
        .await;
    }

    /// Assert that inserting more than `MAX_INDEXED_ELEMENTS` trims the end of
    /// the resulting page
    #[cfg_attr(feature = "test-bpf", tokio::test)]
    async fn test_overflow_max_elements() {
        let store = Pubkey::new_unique();

        let idcs = 0..MAX_INDEXED_ELEMENTS;
        let offset = 30;
        let cache = |i: usize| (i, Time(i64::MAX - i as i64));

        let caches = idcs
            .clone()
            .into_iter()
            .map(|i| i + (i >= offset) as usize)
            .map(cache);
        let expected_caches = idcs.into_iter();

        // Assert that we insert into the middle, and that the resulting index
        // should not contain more elements
        assert!(offset < MAX_INDEXED_ELEMENTS);
        assert!(caches.len() == expected_caches.len());

        test_set_index(
            store,
            caches,
            Some(cache(30)),
            Some(SetStoreIndex {
                offset,
                cache: 30,
                pos: Two(31, 29),
            }),
            expected_caches,
        )
        .await;
    }

    /// Assert that prepending to an index out of order does not work
    #[cfg_attr(feature = "test-bpf", tokio::test)]
    #[should_panic]
    async fn test_prepend_bad_order() {
        let store = Pubkey::new_unique();

        test_set_index(
            store,
            Some(("cache", Time(2))),
            Some(("before", Time(1))),
            Some(SetStoreIndex {
                offset: 0,
                cache: "before",
                pos: One("cache"),
            }),
            vec!["before", "cache"],
        )
        .await;
    }

    /// Assert that appending to an index out of order does not work
    #[cfg_attr(feature = "test-bpf", tokio::test)]
    #[should_panic]
    async fn test_append_bad_order() {
        let store = Pubkey::new_unique();

        test_set_index(
            store,
            Some(("cache", Time(1))),
            Some(("after", Time(2))),
            Some(SetStoreIndex {
                offset: 1,
                cache: "after",
                pos: One("cache"),
            }),
            vec!["cache", "after"],
        )
        .await;
    }

    /// Assert that inserting into an index out of order does not work
    ///
    /// Case 1: The element is out of order with the cache below
    #[cfg_attr(feature = "test-bpf", tokio::test)]
    #[should_panic]
    async fn test_insert_bad_order_1() {
        let store = Pubkey::new_unique();

        test_set_index(
            store,
            vec![("cache0", Time(4)), ("cache1", Time(2))],
            Some(("middle", Time(5))),
            Some(SetStoreIndex {
                offset: 1,
                cache: "middle",
                pos: Two("cache1", "cache0"),
            }),
            vec!["cache0", "middle", "cache1"],
        )
        .await;
    }

    /// Assert that inserting into an index out of order does not work
    ///
    /// Case 2: The element is out of order with the cache above
    #[cfg_attr(feature = "test-bpf", tokio::test)]
    #[should_panic]
    async fn test_insert_bad_order_2() {
        let store = Pubkey::new_unique();

        test_set_index(
            store,
            vec![("cache0", Time(4)), ("cache1", Time(2))],
            Some(("middle", Time(1))),
            Some(SetStoreIndex {
                offset: 1,
                cache: "middle",
                pos: Two("cache1", "cache0"),
            }),
            vec!["cache0", "middle", "cache1"],
        )
        .await;
    }

    /// Assert that appending to an index with an invalid offset does not work
    #[cfg_attr(feature = "test-bpf", tokio::test)]
    #[should_panic]
    async fn test_append_bad_offset() {
        let store = Pubkey::new_unique();

        test_set_index(
            store,
            Some(("cache", Time(1))),
            Some(("after", Time(2))),
            Some(SetStoreIndex {
                offset: 2,
                cache: "after",
                pos: One("cache"),
            }),
            vec!["cache", "after"],
        )
        .await;
    }

    /// Real-world regression based on a support ticket from plants.holaplex.com
    ///
    /// Data sourced from:
    /// [https://solscan.io/tx/2Rpq8vUAGnXB8ap1vtPxuZFPgos2uU42tnowWbKtZKretB7jhoTzZZs9d9H4K8ReXN9QHizMzB2wnEEod4J6rEJ1]
    #[cfg_attr(feature = "test-bpf", tokio::test)]
    async fn plants_regression() {
        let mut test = program_test();

        let index_key: Pubkey = "HzH7QdJxS9aTPaXPxkwQGJsvghByUW6acYpAA4L1Rbxy"
            .parse()
            .unwrap();

        let cache_key_str = "AgVXRii4cDtHZbBfak4NsD3UZ3cqADKJhhigsbj3XJrM";
        let cache_key: Pubkey = cache_key_str.parse().unwrap();

        let store_key: Pubkey = "5AQungikG9naFPgy4mxgiTtmoPJFnTrGHH4WG5zq9xxo"
            .parse()
            .unwrap();

        let before_key_str = "664tyNHbcZkSWngBjyMTjy6aKg8oWEB3ejWGo25uPbYQ";
        let before_key: Pubkey = before_key_str.parse().unwrap();

        for (key, account) in vec![
            (
                index_key,
                Account {
                    lamports: 23476080,
                    data: bs58::decode(INDEX_DATA).into_vec().unwrap(),
                    owner: id(),
                    executable: false,
                    rent_epoch: 275,
                },
            ),
            (
                cache_key,
                Account {
                    lamports: 4099440,
                    data: bs58::decode(CACHE_DATA).into_vec().unwrap(),
                    owner: id(),
                    executable: false,
                    rent_epoch: 275,
                },
            ),
            (
                store_key,
                Account {
                    lamports: 2491680,
                    data: bs58::decode(STORE_DATA).into_vec().unwrap(),
                    owner: id(),
                    executable: false,
                    rent_epoch: 276,
                },
            ),
            (
                before_key,
                Account {
                    lamports: 4099440,
                    data: bs58::decode(BEFORE_DATA).into_vec().unwrap(),
                    owner: id(),
                    executable: false,
                    rent_epoch: 275,
                },
            ),
        ] {
            test.add_account(key, account);
        }

        let mut ctx = test.start_with_context().await;
        let payer = ctx.payer;

        let tx = Transaction::new_signed_with_payer(
            &[Instruction {
                program_id: id(),
                // SetStoreIndex { page: 0, offset: 9 }
                data: bs58::decode("CSrP7BiYLvK3y9umnM43CdD").into_vec().unwrap(),
                accounts: vec![
                    AccountMeta::new(index_key, false),
                    AccountMeta::new_readonly(payer.pubkey(), true),
                    AccountMeta::new_readonly(cache_key, false),
                    AccountMeta::new_readonly(store_key, false),
                    AccountMeta::new_readonly(
                        "11111111111111111111111111111111".parse().unwrap(),
                        false,
                    ),
                    AccountMeta::new_readonly(
                        "SysvarRent111111111111111111111111111111111"
                            .parse()
                            .unwrap(),
                        false,
                    ),
                    // Positional 1 (should be below based on usage)
                    AccountMeta::new_readonly(before_key, false),
                    // Positional 2 not present since this is an append invocation
                ],
            }],
            Some(&payer.pubkey()),
            &[&payer],
            ctx.last_blockhash,
        );

        ctx.banks_client.process_transaction(tx).await.unwrap();

        let mut actual_index = ctx
            .banks_client
            .get_account(index_key)
            .await
            .unwrap()
            .expect("Missing store index after instructions");

        let actual_index = StoreIndexer::from_account_info(&AccountInfo::new(
            &index_key,
            false,
            false,
            &mut 1_000_000_000,
            &mut actual_index.data,
            &actual_index.owner,
            actual_index.executable,
            actual_index.rent_epoch,
        ))
        .map_err(pretty_err)
        .unwrap();

        assert_eq!(
            actual_index.auction_caches,
            vec![
                "FL6GBK8ipeFX1XBAjqcvfrW7wUmZByZGkhJwaARvPtCT",
                "CBZP6GvX8uW3QPhyppjTtxUtTTrmEfKa2nxVdqUKmEen",
                "EDWV64cFRYXtLjraV3d7SGPqGodmVsKjhvpixDVk3A9T",
                "5rLPpyFvovE874GXaw49BHJsY7TRHfkjNdMT5hRGJvud",
                "34w5G61TktYKkENUGGuscQBs7E9TKpTi65GezLcotCBb",
                "HdfucffuzeRooGfvcdPUPQRGfAU4fmJGg9GCVU76C7iT",
                "9cmiuP3CDnJBS3CBCAk4x7nizT7FBxCYBB13eQvH5iL6",
                "H8h7399TH9jdfGTE1jX54NEUVSaanoCQU1WidnKdd9zs",
                before_key_str,
                cache_key_str,
            ]
            .into_iter()
            .map(|s| s.parse().unwrap())
            .collect::<Vec<Pubkey>>()
        );
    }

    //// base58 data for `plants_regression` ////

    const INDEX_DATA: &'static str = include_str!("fixtures/plants_regression/index_data.b58");
    const CACHE_DATA: &'static str = include_str!("fixtures/plants_regression/cache_data.b58");
    const STORE_DATA: &'static str = include_str!("fixtures/plants_regression/store_data.b58");
    const BEFORE_DATA: &'static str = include_str!("fixtures/plants_regression/before_data.b58");
}
