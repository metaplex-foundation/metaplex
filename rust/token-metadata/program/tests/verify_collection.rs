#![cfg(feature = "test-bpf")]
mod utils;

use mpl_token_metadata::pda::find_collection_authority_account;
use mpl_token_metadata::state::Collection;
use mpl_token_metadata::state::{UseMethod, Uses};
use mpl_token_metadata::{
    error::MetadataError,
    state::{Key, MAX_NAME_LENGTH, MAX_SYMBOL_LENGTH, MAX_URI_LENGTH},
    utils::puffed_out_string,
};
use num_traits::FromPrimitive;
use solana_program_test::*;
use solana_sdk::{
    instruction::InstructionError,
    signature::{Keypair, Signer},
    transaction::TransactionError,
    transport::TransportError,
};
use utils::*;
mod verify_collection {

    use mpl_token_metadata::state::{COLLECTION_AUTHORITY_RECORD_SIZE, CollectionAuthorityRecord};
    use solana_program::borsh::try_from_slice_unchecked;
    use solana_sdk::transaction::Transaction;

    use super::*;
    #[tokio::test]
    async fn success_verify_collection() {
        let mut context = program_test().start_with_context().await;

        let test_collection = Metadata::new();
        test_collection
            .create_v2(
                &mut context,
                "Test".to_string(),
                "TST".to_string(),
                "uri".to_string(),
                None,
                10,
                false,
                None,
                None,
                None,
            )
            .await
            .unwrap();
        let collection_master_edition_account = MasterEditionV2::new(&test_collection);
        collection_master_edition_account
            .create_v3(&mut context, Some(0))
            .await
            .unwrap();

        let name = "Test".to_string();
        let symbol = "TST".to_string();
        let uri = "uri".to_string();
        let test_metadata = Metadata::new();

        let puffed_name = puffed_out_string(&name, MAX_NAME_LENGTH);
        let puffed_symbol = puffed_out_string(&symbol, MAX_SYMBOL_LENGTH);
        let puffed_uri = puffed_out_string(&uri, MAX_URI_LENGTH);

        let uses = Some(Uses {
            total: 1,
            remaining: 1,
            use_method: UseMethod::Single,
        });
        test_metadata
            .create_v2(
                &mut context,
                name,
                symbol,
                uri,
                None,
                10,
                false,
                None,
                Some(Collection {
                    key: test_collection.mint.pubkey(),
                    verified: false,
                }),
                uses.to_owned(),
            )
            .await
            .unwrap();

        let metadata = test_metadata.get_data(&mut context).await;

        assert_eq!(metadata.data.name, puffed_name);
        assert_eq!(metadata.data.symbol, puffed_symbol);
        assert_eq!(metadata.data.uri, puffed_uri);
        assert_eq!(metadata.data.seller_fee_basis_points, 10);
        assert_eq!(metadata.data.creators, None);
        assert_eq!(metadata.uses, uses.to_owned());

        assert_eq!(
            metadata.collection.to_owned().unwrap().key,
            test_collection.mint.pubkey()
        );
        assert_eq!(metadata.collection.unwrap().verified, false);

        assert_eq!(metadata.primary_sale_happened, false);
        assert_eq!(metadata.is_mutable, false);
        assert_eq!(metadata.mint, test_metadata.mint.pubkey());
        assert_eq!(metadata.update_authority, context.payer.pubkey());
        assert_eq!(metadata.key, Key::MetadataV1);
        let kpbytes = &context.payer;
        let kp = Keypair::from_bytes(&kpbytes.to_bytes()).unwrap();
        test_metadata
            .verify_collection(
                &mut context,
                test_collection.pubkey,
                &kp,
                test_collection.mint.pubkey(),
                collection_master_edition_account.pubkey,
                None,
            )
            .await
            .unwrap();

        let metadata_after = test_metadata.get_data(&mut context).await;
        assert_eq!(
            metadata_after.collection.to_owned().unwrap().key,
            test_collection.mint.pubkey()
        );
        assert_eq!(metadata_after.collection.unwrap().verified, true);
    }

    #[tokio::test]
    async fn fail_wrong_collection_from_authority() {
        let mut context = program_test().start_with_context().await;

        let test_collection = Metadata::new();
        test_collection
            .create_v2(
                &mut context,
                "Test".to_string(),
                "TST".to_string(),
                "uri".to_string(),
                None,
                10,
                false,
                None,
                None,
                None
            )
            .await
            .unwrap();
        let collection_master_edition_account = MasterEditionV2::new(&test_collection);
        collection_master_edition_account
            .create_v3(&mut context, Some(0))
            .await
            .unwrap();

        let test_collection2 = Metadata::new();
        test_collection2
            .create_v2(
                &mut context,
                "Test".to_string(),
                "TST".to_string(),
                "uri".to_string(),
                None,
                10,
                false,
                None,
                None,
                None
            )
            .await
            .unwrap();
        let collection_master_edition_account2 = MasterEditionV2::new(&test_collection2);
        collection_master_edition_account2
            .create_v3(&mut context, Some(0))
            .await
            .unwrap();

        let name = "Test".to_string();
        let symbol = "TST".to_string();
        let uri = "uri".to_string();
        let test_metadata = Metadata::new();

        let puffed_name = puffed_out_string(&name, MAX_NAME_LENGTH);
        let puffed_symbol = puffed_out_string(&symbol, MAX_SYMBOL_LENGTH);
        let puffed_uri = puffed_out_string(&uri, MAX_URI_LENGTH);

        let uses = Some(Uses {
            total: 1,
            remaining: 1,
            use_method: UseMethod::Single,
        });
        test_metadata
            .create_v2(
                &mut context,
                name,
                symbol,
                uri,
                None,
                10,
                false,
                None,
                Some(Collection {
                    key: test_collection.mint.pubkey(),
                    verified: false,
                }),
                uses.to_owned(),
            )
            .await
            .unwrap();

        let metadata = test_metadata.get_data(&mut context).await;

        assert_eq!(metadata.data.name, puffed_name);
        assert_eq!(metadata.data.symbol, puffed_symbol);
        assert_eq!(metadata.data.uri, puffed_uri);
        assert_eq!(metadata.data.seller_fee_basis_points, 10);
        assert_eq!(metadata.data.creators, None);
        assert_eq!(metadata.uses, uses.to_owned());

        assert_eq!(
            metadata.collection.to_owned().unwrap().key,
            test_collection.mint.pubkey()
        );
        assert_eq!(metadata.collection.unwrap().verified, false);

        assert_eq!(metadata.primary_sale_happened, false);
        assert_eq!(metadata.is_mutable, false);
        assert_eq!(metadata.mint, test_metadata.mint.pubkey());
        assert_eq!(metadata.update_authority, context.payer.pubkey());
        assert_eq!(metadata.key, Key::MetadataV1);
        let kpbytes = &context.payer;
        let kp = Keypair::from_bytes(&kpbytes.to_bytes()).unwrap();
        let err = test_metadata
            .verify_collection(
                &mut context,
                test_collection.pubkey,
                &kp,
                test_collection2.mint.pubkey(),
                collection_master_edition_account2.pubkey,
                None,
            )
            .await
            .unwrap_err();
        assert_custom_error!(err, MetadataError::CollectionNotFound);
    }

    #[tokio::test]
    async fn fail_no_collection_nft_token_standard() {
        let mut context = program_test().start_with_context().await;

        let test_collection = Metadata::new();
        test_collection
            .create_v2(
                &mut context,
                "Test".to_string(),
                "TST".to_string(),
                "uri".to_string(),
                None,
                10,
                false,
                None,
                None,
                None,
            )
            .await
            .unwrap();
        let collection_master_edition_account = MasterEditionV2::new(&test_collection);
        collection_master_edition_account
            .create(&mut context, Some(0))
            .await
            .unwrap();

        let name = "Test".to_string();
        let symbol = "TST".to_string();
        let uri = "uri".to_string();
        let test_metadata = Metadata::new();
        let uses = Some(Uses {
            total: 1,
            remaining: 1,
            use_method: UseMethod::Single,
        });
        test_metadata
            .create_v2(
                &mut context,
                name,
                symbol,
                uri,
                None,
                10,
                false,
                None,
                Some(Collection {
                    key: test_collection.mint.pubkey(),
                    verified: false,
                }),
                uses.to_owned(),
            )
            .await
            .unwrap();

        let kpbytes = &context.payer;
        let kp = Keypair::from_bytes(&kpbytes.to_bytes()).unwrap();
        let err = test_metadata
            .verify_collection(
                &mut context,
                test_collection.pubkey,
                &kp,
                test_collection.mint.pubkey(),
                collection_master_edition_account.pubkey,
                None,
            )
            .await
            .unwrap_err();
        assert_custom_error!(err, MetadataError::CollectionMustBeAUniqueMasterEdition);
        let metadata_after = test_metadata.get_data(&mut context).await;
        assert_eq!(
            metadata_after.collection.to_owned().unwrap().key,
            test_collection.mint.pubkey()
        );
        assert_eq!(metadata_after.collection.unwrap().verified, false);
    }

    #[tokio::test]
    async fn fail_non_unique_master_edition() {
        let mut context = program_test().start_with_context().await;

        let test_collection = Metadata::new();
        test_collection
            .create_v2(
                &mut context,
                "Test".to_string(),
                "TST".to_string(),
                "uri".to_string(),
                None,
                10,
                false,
                None,
                None,
                None,
            )
            .await
            .unwrap();
        let collection_master_edition_account = MasterEditionV2::new(&test_collection);
        collection_master_edition_account
            .create(&mut context, Some(1))
            .await
            .unwrap();

        let name = "Test".to_string();
        let symbol = "TST".to_string();
        let uri = "uri".to_string();
        let test_metadata = Metadata::new();
        let uses = Some(Uses {
            total: 1,
            remaining: 1,
            use_method: UseMethod::Single,
        });
        test_metadata
            .create_v2(
                &mut context,
                name,
                symbol,
                uri,
                None,
                10,
                false,
                None,
                Some(Collection {
                    key: test_collection.mint.pubkey(),
                    verified: false,
                }),
                uses.to_owned(),
            )
            .await
            .unwrap();

        let kpbytes = &context.payer;
        let kp = Keypair::from_bytes(&kpbytes.to_bytes()).unwrap();
        let err = test_metadata
            .verify_collection(
                &mut context,
                test_collection.pubkey,
                &kp,
                test_collection.mint.pubkey(),
                collection_master_edition_account.pubkey,
                None,
            )
            .await
            .unwrap_err();
        assert_custom_error!(err, MetadataError::CollectionMustBeAUniqueMasterEdition);
        let metadata_after = test_metadata.get_data(&mut context).await;
        assert_eq!(
            metadata_after.collection.to_owned().unwrap().key,
            test_collection.mint.pubkey()
        );
        assert_eq!(metadata_after.collection.unwrap().verified, false);
    }

    #[tokio::test]
    async fn fail_no_master_edition() {
        let mut context = program_test().start_with_context().await;

        let test_collection = Metadata::new();
        test_collection
            .create_v2(
                &mut context,
                "Test".to_string(),
                "TST".to_string(),
                "uri".to_string(),
                None,
                10,
                false,
                None,
                None,
                None,
            )
            .await
            .unwrap();

        let name = "Test".to_string();
        let symbol = "TST".to_string();
        let uri = "uri".to_string();
        let test_metadata = Metadata::new();

        let uses = Some(Uses {
            total: 1,
            remaining: 1,
            use_method: UseMethod::Single,
        });
        test_metadata
            .create_v2(
                &mut context,
                name,
                symbol,
                uri,
                None,
                10,
                false,
                None,
                Some(Collection {
                    key: test_collection.mint.pubkey(),
                    verified: false,
                }),
                uses.to_owned(),
            )
            .await
            .unwrap();

        let kpbytes = &context.payer;
        let kp = Keypair::from_bytes(&kpbytes.to_bytes()).unwrap();
        let err = test_metadata
            .verify_collection(
                &mut context,
                test_collection.pubkey,
                &kp,
                test_collection.mint.pubkey(),
                test_collection.pubkey,
                None,
            )
            .await
            .unwrap_err();
        assert_custom_error!(err, MetadataError::CollectionMustBeAUniqueMasterEdition);
        let metadata_after = test_metadata.get_data(&mut context).await;
        assert_eq!(
            metadata_after.collection.to_owned().unwrap().key,
            test_collection.mint.pubkey()
        );
        assert_eq!(metadata_after.collection.unwrap().verified, false);
    }

    #[tokio::test]
    async fn fail_collection_authority_mismatch() {
        let mut context = program_test().start_with_context().await;
        let collection_authority = Keypair::new();

        let test_collection = Metadata::new();
        test_collection
            .create_v2(
                &mut context,
                "Test".to_string(),
                "TST".to_string(),
                "uri".to_string(),
                None,
                10,
                false,
                None,
                None,
                None,
            )
            .await
            .unwrap();
        let collection_master_edition_account = MasterEditionV2::new(&test_collection);
        collection_master_edition_account
            .create_v3(&mut context, Some(0))
            .await
            .unwrap();

        let name = "Test".to_string();
        let symbol = "TST".to_string();
        let uri = "uri".to_string();
        let test_metadata = Metadata::new();

        let uses = Some(Uses {
            total: 1,
            remaining: 1,
            use_method: UseMethod::Single,
        });
        test_metadata
            .create_v2(
                &mut context,
                name,
                symbol,
                uri,
                None,
                10,
                false,
                None,
                Some(Collection {
                    key: test_collection.mint.pubkey(),
                    verified: false,
                }),
                uses.to_owned(),
            )
            .await
            .unwrap();

        let err = test_metadata
            .verify_collection(
                &mut context,
                test_collection.pubkey,
                &collection_authority,
                test_collection.mint.pubkey(),
                collection_master_edition_account.pubkey,
                None,
            )
            .await
            .unwrap_err();
        assert_custom_error!(err, MetadataError::InvalidCollectionUpdateAuthority);
        let metadata_after = test_metadata.get_data(&mut context).await;
        assert_eq!(
            metadata_after.collection.to_owned().unwrap().key,
            test_collection.mint.pubkey()
        );
        assert_eq!(metadata_after.collection.unwrap().verified, false);
    }

    #[tokio::test]
    async fn success() {
        let mut context = program_test().start_with_context().await;

        let test_collection = Metadata::new();
        test_collection
            .create_v2(
                &mut context,
                "Test".to_string(),
                "TST".to_string(),
                "uri".to_string(),
                None,
                10,
                false,
                None,
                None,
                None,
            )
            .await
            .unwrap();
        let collection_master_edition_account = MasterEditionV2::new(&test_collection);
        collection_master_edition_account
            .create_v3(&mut context, Some(0))
            .await
            .unwrap();

        let name = "Test".to_string();
        let symbol = "TST".to_string();
        let uri = "uri".to_string();
        let test_metadata = Metadata::new();

        let puffed_name = puffed_out_string(&name, MAX_NAME_LENGTH);
        let puffed_symbol = puffed_out_string(&symbol, MAX_SYMBOL_LENGTH);
        let puffed_uri = puffed_out_string(&uri, MAX_URI_LENGTH);

        let uses = Some(Uses {
            total: 1,
            remaining: 1,
            use_method: UseMethod::Single,
        });
        test_metadata
            .create_v2(
                &mut context,
                name,
                symbol,
                uri,
                None,
                10,
                false,
                None,
                Some(Collection {
                    key: test_collection.mint.pubkey(),
                    verified: false,
                }),
                uses.to_owned(),
            )
            .await
            .unwrap();

        let metadata = test_metadata.get_data(&mut context).await;

        assert_eq!(metadata.data.name, puffed_name);
        assert_eq!(metadata.data.symbol, puffed_symbol);
        assert_eq!(metadata.data.uri, puffed_uri);
        assert_eq!(metadata.data.seller_fee_basis_points, 10);
        assert_eq!(metadata.data.creators, None);
        assert_eq!(metadata.uses, uses.to_owned());

        assert_eq!(
            metadata.collection.to_owned().unwrap().key,
            test_collection.mint.pubkey()
        );
        assert_eq!(metadata.collection.unwrap().verified, false);

        assert_eq!(metadata.primary_sale_happened, false);
        assert_eq!(metadata.is_mutable, false);
        assert_eq!(metadata.mint, test_metadata.mint.pubkey());
        assert_eq!(metadata.update_authority, context.payer.pubkey());
        assert_eq!(metadata.key, Key::MetadataV1);
        let kpbytes = &context.payer;
        let kp = Keypair::from_bytes(&kpbytes.to_bytes()).unwrap();
        test_metadata
            .verify_collection(
                &mut context,
                test_collection.pubkey,
                &kp,
                test_collection.mint.pubkey(),
                collection_master_edition_account.pubkey,
                None,
            )
            .await
            .unwrap();

        let metadata_after = test_metadata.get_data(&mut context).await;
        assert_eq!(
            metadata_after.collection.to_owned().unwrap().key,
            test_collection.mint.pubkey()
        );
        assert_eq!(metadata_after.collection.unwrap().verified, true);
    }

    #[tokio::test]
    async fn success_verify_collection_with_authority() {
        let mut context = program_test().start_with_context().await;
        let new_collection_authority = Keypair::new();
        let test_collection = Metadata::new();
        test_collection
            .create_v2(
                &mut context,
                "Test".to_string(),
                "TST".to_string(),
                "uri".to_string(),
                None,
                10,
                false,
                None,
                None,
                None,
            )
            .await
            .unwrap();
        let collection_master_edition_account = MasterEditionV2::new(&test_collection);
        collection_master_edition_account
            .create_v3(&mut context, Some(0))
            .await
            .unwrap();

        let name = "Test".to_string();
        let symbol = "TST".to_string();
        let uri = "uri".to_string();
        let test_metadata = Metadata::new();
        test_metadata
            .create_v2(
                &mut context,
                name,
                symbol,
                uri,
                None,
                10,
                false,
                None,
                Some(Collection {
                    key: test_collection.mint.pubkey(),
                    verified: false,
                }),
                None,
            )
            .await
            .unwrap();

        let metadata = test_metadata.get_data(&mut context).await;
        assert_eq!(
            metadata.collection.to_owned().unwrap().key,
            test_collection.mint.pubkey()
        );
        assert_eq!(metadata.collection.unwrap().verified, false);
        let (record, _) = find_collection_authority_account(
            &test_collection.mint.pubkey(),
            &new_collection_authority.pubkey(),
        );
        let ix = mpl_token_metadata::instruction::approve_collection_authority(
            mpl_token_metadata::id(),
            record,
            new_collection_authority.pubkey(),
            context.payer.pubkey(),
            context.payer.pubkey(),
            test_collection.pubkey,
            test_collection.mint.pubkey(),
        );

        let tx = Transaction::new_signed_with_payer(
            &[ix],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await.unwrap();

        let record_account = get_account(&mut context, &record).await;
        let record_data: CollectionAuthorityRecord =
            try_from_slice_unchecked(&record_account.data).unwrap();
        assert_eq!(record_data.key, Key::CollectionAuthorityRecord);

        test_metadata
            .verify_collection(
                &mut context,
                test_collection.pubkey,
                &new_collection_authority,
                test_collection.mint.pubkey(),
                collection_master_edition_account.pubkey,
                Some(record),
            )
            .await
            .unwrap();

        let metadata_after = test_metadata.get_data(&mut context).await;
        assert_eq!(
            metadata_after.collection.to_owned().unwrap().key,
            test_collection.mint.pubkey()
        );
        assert_eq!(metadata_after.collection.unwrap().verified, true);

        test_metadata
            .unverify_collection(
                &mut context,
                test_collection.pubkey,
                &new_collection_authority,
                test_collection.mint.pubkey(),
                collection_master_edition_account.pubkey,
                Some(record),
            )
            .await
            .unwrap();
        let metadata_after_unverify = test_metadata.get_data(&mut context).await;
        assert_eq!(metadata_after_unverify.collection.unwrap().verified, false);
    }

    #[tokio::test]
    async fn success_set_and_verify_collection_with_authority() {
        let mut context = program_test().start_with_context().await;
        let new_collection_authority = Keypair::new();
        let test_collection = Metadata::new();
        test_collection
            .create_v2(
                &mut context,
                "Test".to_string(),
                "TST".to_string(),
                "uri".to_string(),
                None,
                10,
                false,
                None,
                None,
                None
            )
            .await
            .unwrap();
        let collection_master_edition_account = MasterEditionV2::new(&test_collection);
        collection_master_edition_account
            .create_v3(&mut context, Some(0))
            .await
            .unwrap();

        let name = "Test".to_string();
        let symbol = "TST".to_string();
        let uri = "uri".to_string();
        let test_metadata = Metadata::new();
        test_metadata
            .create_v2(&mut context, name, symbol, uri, None, 10, false, None, None, None)
            .await
            .unwrap();

        let metadata = test_metadata.get_data(&mut context).await;
        assert_eq!(metadata.collection.is_none(), true);
        let update_authority = context.payer.pubkey().clone();
        let (record, _) = find_collection_authority_account(
            &test_collection.mint.pubkey(),
            &new_collection_authority.pubkey(),
        );
        let ix = mpl_token_metadata::instruction::approve_collection_authority(
            mpl_token_metadata::id(),
            record,
            new_collection_authority.pubkey(),
            update_authority,
            context.payer.pubkey(),
            test_collection.pubkey,
            test_collection.mint.pubkey(),
        );

        let tx = Transaction::new_signed_with_payer(
            &[ix],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await.unwrap();

        let record_account = get_account(&mut context, &record).await;
        let record_data: CollectionAuthorityRecord =
            try_from_slice_unchecked(&record_account.data).unwrap();
        assert_eq!(record_data.key, Key::CollectionAuthorityRecord);

        test_metadata
            .set_and_verify_collection(
                &mut context,
                test_collection.pubkey,
                &new_collection_authority,
                update_authority,
                test_collection.mint.pubkey(),
                collection_master_edition_account.pubkey,
                Some(record),
            )
            .await
            .unwrap();

        let metadata_after = test_metadata.get_data(&mut context).await;
        assert_eq!(
            metadata_after.collection.to_owned().unwrap().key,
            test_collection.mint.pubkey()
        );
        assert_eq!(metadata_after.collection.unwrap().verified, true);

        test_metadata
            .unverify_collection(
                &mut context,
                test_collection.pubkey,
                &new_collection_authority,
                test_collection.mint.pubkey(),
                collection_master_edition_account.pubkey,
                Some(record),
            )
            .await
            .unwrap();
        let metadata_after_unverify = test_metadata.get_data(&mut context).await;
        assert_eq!(metadata_after_unverify.collection.unwrap().verified, false);
        
    }

    #[tokio::test]
    async fn fail_verify_collection_with_authority() {
        let mut context = program_test().start_with_context().await;
        let new_collection_authority = Keypair::new();
        let test_collection = Metadata::new();
        test_collection
            .create_v2(
                &mut context,
                "Test".to_string(),
                "TST".to_string(),
                "uri".to_string(),
                None,
                10,
                false,
                None,
                None,
                None,
            )
            .await
            .unwrap();
        let collection_master_edition_account = MasterEditionV2::new(&test_collection);
        collection_master_edition_account
            .create_v3(&mut context, Some(0))
            .await
            .unwrap();

        let name = "Test".to_string();
        let symbol = "TST".to_string();
        let uri = "uri".to_string();
        let test_metadata = Metadata::new();
        let uses = Some(Uses {
            total: 1,
            remaining: 1,
            use_method: UseMethod::Single,
        });
        test_metadata
            .create_v2(
                &mut context,
                name,
                symbol,
                uri,
                None,
                10,
                false,
                None,
                Some(Collection {
                    key: test_collection.mint.pubkey(),
                    verified: false,
                }),
                uses.to_owned(),
            )
            .await
            .unwrap();

        let metadata = test_metadata.get_data(&mut context).await;
        assert_eq!(
            metadata.collection.to_owned().unwrap().key,
            test_collection.mint.pubkey()
        );
        assert_eq!(metadata.collection.unwrap().verified, false);
        let (record, _) = find_collection_authority_account(
            &test_collection.mint.pubkey(),
            &new_collection_authority.pubkey(),
        );
        let ix = mpl_token_metadata::instruction::approve_collection_authority(
            mpl_token_metadata::id(),
            record,
            new_collection_authority.pubkey(),
            context.payer.pubkey(),
            context.payer.pubkey(),
            test_collection.pubkey,
            test_collection.mint.pubkey(),
        );

        let tx = Transaction::new_signed_with_payer(
            &[ix],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await.unwrap();

        let account_before = context.banks_client.get_account(record).await.unwrap().unwrap();
        assert_eq!(account_before.data.len(), COLLECTION_AUTHORITY_RECORD_SIZE);

        let ixrevoke = mpl_token_metadata::instruction::revoke_collection_authority(
            mpl_token_metadata::id(),
            record,
            new_collection_authority.pubkey(),
            context.payer.pubkey(),
            test_collection.pubkey,
            test_collection.mint.pubkey(),
        );

        let txrevoke = Transaction::new_signed_with_payer(
            &[ixrevoke],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );

        context
            .banks_client
            .process_transaction(txrevoke)
            .await
            .unwrap();

        let account_after_none = context.banks_client.get_account(record).await.unwrap().is_none();
        assert_eq!(account_after_none, true);

        let err = test_metadata
            .verify_collection(
                &mut context,
                test_collection.pubkey,
                &new_collection_authority,
                test_collection.mint.pubkey(),
                collection_master_edition_account.pubkey,
                Some(record),
            )
            .await
            .unwrap_err();
        assert_custom_error!(err, MetadataError::InvalidCollectionUpdateAuthority);
        let metadata_after = test_metadata.get_data(&mut context).await;
        assert_eq!(metadata_after.collection.unwrap().verified, false);
    }
}
