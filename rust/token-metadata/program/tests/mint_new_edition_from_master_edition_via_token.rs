#![cfg(feature = "test-bpf")]
mod utils;

use mpl_token_metadata::{error::MetadataError, id, instruction, state::Key};
use num_traits::FromPrimitive;
use solana_program_test::*;
use solana_sdk::{
    instruction::InstructionError,
    signature::{Keypair, Signer},
    transaction::{Transaction, TransactionError},
    transport::TransportError,
};
use utils::*;

// NOTE: these tests depend on the token-vault program having been compiled
// via (cd ../../token-vault/program/ && cargo build-bpf)
mod mint_new_edition_from_master_edition_via_token {
    use super::*;
    use mpl_token_metadata::state::Collection;
    #[tokio::test]
    async fn success() {
        let mut context = program_test().start_with_context().await;
        let test_metadata = Metadata::new();
        let test_master_edition = MasterEditionV2::new(&test_metadata);
        let test_edition_marker = EditionMarker::new(&test_metadata, &test_master_edition, 1);

        test_metadata
            .create(
                &mut context,
                "Test".to_string(),
                "TST".to_string(),
                "uri".to_string(),
                None,
                10,
                false,
            )
            .await
            .unwrap();

        test_master_edition
            .create(&mut context, Some(10))
            .await
            .unwrap();

        test_edition_marker.create(&mut context).await.unwrap();

        let edition_marker = test_edition_marker.get_data(&mut context).await;

        assert_eq!(edition_marker.ledger[0], 64);
        assert_eq!(edition_marker.key, Key::EditionMarker);
    }

    #[tokio::test]
    async fn success_v2() {
        let mut context = program_test().start_with_context().await;
        let test_metadata = Metadata::new();
        let test_master_edition = MasterEditionV2::new(&test_metadata);
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
        test_metadata
            .create_v2(
                &mut context,
                "Test".to_string(),
                "TST".to_string(),
                "uri".to_string(),
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

        test_master_edition
            .create(&mut context, Some(10))
            .await
            .unwrap();
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
        let test_edition_marker = EditionMarker::new(&test_metadata, &test_master_edition, 1);
        test_edition_marker.create(&mut context).await.unwrap();

        let edition_marker = test_edition_marker.get_data(&mut context).await;

        assert_eq!(edition_marker.ledger[0], 64);
        assert_eq!(edition_marker.key, Key::EditionMarker);
    }

    #[tokio::test]
    async fn fail_invalid_token_program() {
        let mut context = program_test().start_with_context().await;
        let test_metadata = Metadata::new();
        let test_master_edition = MasterEditionV2::new(&test_metadata);
        let test_edition_marker = EditionMarker::new(&test_metadata, &test_master_edition, 1);

        test_metadata
            .create(
                &mut context,
                "Test".to_string(),
                "TST".to_string(),
                "uri".to_string(),
                None,
                10,
                false,
            )
            .await
            .unwrap();

        test_master_edition
            .create(&mut context, Some(10))
            .await
            .unwrap();

        let result = test_edition_marker
            .create_with_invalid_token_program(&mut context)
            .await
            .unwrap_err();
        assert_custom_error!(result, MetadataError::InvalidTokenProgram);
    }

    #[tokio::test]
    async fn fail_invalid_mint() {
        let mut context = program_test().start_with_context().await;
        let test_metadata = Metadata::new();
        let test_master_edition = MasterEditionV2::new(&test_metadata);
        let test_edition_marker = EditionMarker::new(&test_metadata, &test_master_edition, 1);
        let fake_mint = Keypair::new();
        let fake_account = Keypair::new();
        let payer_pubkey = context.payer.pubkey();

        test_metadata
            .create(
                &mut context,
                "Test".to_string(),
                "TST".to_string(),
                "uri".to_string(),
                None,
                10,
                false,
            )
            .await
            .unwrap();

        test_master_edition
            .create(&mut context, Some(10))
            .await
            .unwrap();

        create_mint(&mut context, &fake_mint, &payer_pubkey, None)
            .await
            .unwrap();

        create_token_account(
            &mut context,
            &fake_account,
            &fake_mint.pubkey(),
            &payer_pubkey,
        )
        .await
        .unwrap();

        mint_tokens(
            &mut context,
            &fake_mint.pubkey(),
            &fake_account.pubkey(),
            1,
            &payer_pubkey,
            None,
        )
        .await
        .unwrap();

        let tx = Transaction::new_signed_with_payer(
            &[instruction::mint_new_edition_from_master_edition_via_token(
                id(),
                test_edition_marker.new_metadata_pubkey,
                test_edition_marker.new_edition_pubkey,
                test_edition_marker.master_edition_pubkey,
                fake_mint.pubkey(),
                context.payer.pubkey(),
                context.payer.pubkey(),
                context.payer.pubkey(),
                fake_account.pubkey(),
                context.payer.pubkey(),
                test_edition_marker.metadata_pubkey,
                test_edition_marker.metadata_mint_pubkey,
                test_edition_marker.edition,
            )],
            Some(&context.payer.pubkey()),
            &[&context.payer, &context.payer, &context.payer],
            context.last_blockhash,
        );

        let result = context
            .banks_client
            .process_transaction(tx)
            .await
            .unwrap_err();

        assert_custom_error!(result, MetadataError::TokenAccountMintMismatchV2);
    }

    #[tokio::test]
    async fn fail_edition_already_initialized() {
        let mut context = program_test().start_with_context().await;
        let test_metadata = Metadata::new();
        let test_master_edition = MasterEditionV2::new(&test_metadata);
        let test_edition_marker = EditionMarker::new(&test_metadata, &test_master_edition, 1);
        let test_edition_marker1 = EditionMarker::new(&test_metadata, &test_master_edition, 1);

        test_metadata
            .create(
                &mut context,
                "Test".to_string(),
                "TST".to_string(),
                "uri".to_string(),
                None,
                10,
                false,
            )
            .await
            .unwrap();

        test_master_edition
            .create(&mut context, Some(10))
            .await
            .unwrap();

        test_edition_marker.create(&mut context).await.unwrap();
        let result = test_edition_marker1.create(&mut context).await.unwrap_err();
        assert_custom_error!(result, MetadataError::AlreadyInitialized);
    }

    #[tokio::test]
    async fn fail_to_mint_edition_override_0() {
        let mut context = program_test().start_with_context().await;
        let test_metadata = Metadata::new();
        let test_master_edition = MasterEditionV2::new(&test_metadata);
        let test_edition_marker = EditionMarker::new(&test_metadata, &test_master_edition, 0);

        test_metadata
            .create(
                &mut context,
                "Test".to_string(),
                "TST".to_string(),
                "uri".to_string(),
                None,
                10,
                false,
            )
            .await
            .unwrap();

        test_master_edition
            .create(&mut context, Some(0))
            .await
            .unwrap();

        let result = test_edition_marker.create(&mut context).await.unwrap_err();
        assert_custom_error!(result, MetadataError::EditionOverrideCannotBeZero);
    }
}
