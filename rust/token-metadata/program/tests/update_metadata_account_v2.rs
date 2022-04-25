#![cfg(feature = "test-bpf")]
mod utils;

use mpl_token_metadata::{
    error::MetadataError,
    id, instruction,
    state::{Collection, DataV2, Key, MAX_NAME_LENGTH, MAX_SYMBOL_LENGTH, MAX_URI_LENGTH},
    utils::puffed_out_string,
};
use num_traits::FromPrimitive;
use solana_program_test::*;
use solana_sdk::{
    instruction::InstructionError,
    signature::{Keypair, Signer},
    transaction::{Transaction, TransactionError},
    transport::TransportError,
};
use utils::*;

mod update_metadata_account_v2 {
    use super::*;

    #[tokio::test]
    async fn success_compatible() {
        let mut context = program_test().start_with_context().await;
        let test_metadata = Metadata::new();
        let name = "Test".to_string();
        let symbol = "TST".to_string();
        let uri = "uri".to_string();

        let puffed_symbol = puffed_out_string(&symbol, MAX_SYMBOL_LENGTH);
        let puffed_uri = puffed_out_string(&uri, MAX_URI_LENGTH);

        test_metadata
            .create(
                &mut context,
                name,
                symbol.clone(),
                uri.clone(),
                None,
                10,
                true,
            )
            .await
            .unwrap();

        let updated_name = "New Name".to_string();
        let puffed_updated_name = puffed_out_string(&updated_name, MAX_NAME_LENGTH);

        test_metadata
            .update_v2(
                &mut context,
                updated_name,
                symbol,
                uri,
                None,
                10,
                false,
                Some(Collection {
                    key: test_metadata.pubkey,
                    verified: false,
                }),
                None,
            )
            .await
            .unwrap();

        let metadata = test_metadata.get_data(&mut context).await;

        assert_eq!(metadata.data.name, puffed_updated_name,);
        assert_eq!(metadata.data.symbol, puffed_symbol);
        assert_eq!(metadata.data.uri, puffed_uri);
        assert_eq!(metadata.data.seller_fee_basis_points, 10);
        assert_eq!(metadata.data.creators, None);

        assert_eq!(metadata.primary_sale_happened, false);
        assert_eq!(metadata.is_mutable, false);
        assert_eq!(metadata.mint, test_metadata.mint.pubkey());
        assert_eq!(metadata.update_authority, context.payer.pubkey());
        assert_eq!(metadata.key, Key::MetadataV1);
        assert_eq!(metadata.collection.unwrap().key, test_metadata.pubkey);
    }

    #[tokio::test]
    async fn success() {
        let mut context = program_test().start_with_context().await;
        let test_metadata = Metadata::new();
        let name = "Test".to_string();
        let symbol = "TST".to_string();
        let uri = "uri".to_string();

        let puffed_symbol = puffed_out_string(&symbol, MAX_SYMBOL_LENGTH);
        let puffed_uri = puffed_out_string(&uri, MAX_URI_LENGTH);

        test_metadata
            .create_v2(
                &mut context,
                name,
                symbol.clone(),
                uri.clone(),
                None,
                10,
                true,
                None,
                None,
                None,
            )
            .await
            .unwrap();

        let updated_name = "New Name".to_string();
        let puffed_updated_name = puffed_out_string(&updated_name, MAX_NAME_LENGTH);

        test_metadata
            .update_v2(
                &mut context,
                updated_name,
                symbol,
                uri,
                None,
                10,
                false,
                None,
                None,
            )
            .await
            .unwrap();

        let metadata = test_metadata.get_data(&mut context).await;

        assert_eq!(metadata.data.name, puffed_updated_name,);
        assert_eq!(metadata.data.symbol, puffed_symbol);
        assert_eq!(metadata.data.uri, puffed_uri);
        assert_eq!(metadata.data.seller_fee_basis_points, 10);
        assert_eq!(metadata.data.creators, None);

        assert_eq!(metadata.primary_sale_happened, false);
        assert_eq!(metadata.is_mutable, false);
        assert_eq!(metadata.mint, test_metadata.mint.pubkey());
        assert_eq!(metadata.update_authority, context.payer.pubkey());
        assert_eq!(metadata.key, Key::MetadataV1);
    }

    #[tokio::test]
    async fn fail_invalid_update_authority() {
        let mut context = program_test().start_with_context().await;
        let test_metadata = Metadata::new();
        let fake_update_authority = Keypair::new();

        test_metadata
            .create(
                &mut context,
                "Test".to_string(),
                "TST".to_string(),
                "uri".to_string(),
                None,
                10,
                true,
            )
            .await
            .unwrap();

        let tx = Transaction::new_signed_with_payer(
            &[instruction::update_metadata_accounts_v2(
                id(),
                test_metadata.pubkey,
                fake_update_authority.pubkey(),
                None,
                None,
                None,
                None,
            )],
            Some(&context.payer.pubkey()),
            &[&context.payer, &fake_update_authority],
            context.last_blockhash,
        );

        let result = context
            .banks_client
            .process_transaction(tx)
            .await
            .unwrap_err();

        assert_custom_error!(result, MetadataError::UpdateAuthorityIncorrect);
    }

    #[tokio::test]
    async fn cannot_flip_is_mutable_from_false_to_true() {
        let mut context = program_test().start_with_context().await;
        let test_metadata = Metadata::new();
        let name = "Test".to_string();
        let symbol = "TST".to_string();
        let uri = "uri".to_string();

        // Start with NFT immutable.
        let is_mutable = false;

        test_metadata
            .create(
                &mut context,
                name,
                symbol.clone(),
                uri.clone(),
                None,
                10,
                is_mutable,
            )
            .await
            .unwrap();

        let tx = Transaction::new_signed_with_payer(
            &[instruction::update_metadata_accounts_v2(
                id(),
                test_metadata.pubkey,
                context.payer.pubkey().clone(),
                None,
                None,
                None,
                // Try to flip to be mutable.
                Some(true),
            )],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );

        let result = context
            .banks_client
            .process_transaction(tx)
            .await
            .unwrap_err();

        // We should not be able to make an immutable NFT mutable again.
        assert_custom_error!(result, MetadataError::IsMutableCanOnlyBeFlippedToFalse);
    }

    #[tokio::test]
    async fn fail_cannot_verify_collection() {
        let mut context = program_test().start_with_context().await;
        let test_metadata = Metadata::new();

        test_metadata
            .create_v2(
                &mut context,
                "Test".to_string(),
                "TST".to_string(),
                "uri".to_string(),
                None,
                10,
                true,
                None,
                None,
                None,
            )
            .await
            .unwrap();
        let test_collection = Metadata::new();
        test_collection
            .create_v2(
                &mut context,
                "Test Col".to_string(),
                "TSTCOL".to_string(),
                "uricol".to_string(),
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
            .create_v3(&mut context, Some(1))
            .await
            .unwrap();

        let tx = Transaction::new_signed_with_payer(
            &[instruction::update_metadata_accounts_v2(
                id(),
                test_metadata.pubkey,
                context.payer.pubkey().clone(),
                None,
                Some(DataV2 {
                    name: "Test".to_string(),
                    symbol: "TST".to_string(),
                    uri: "uri".to_string(),
                    creators: None,
                    seller_fee_basis_points: 10,
                    collection: Some(Collection {
                        key: test_collection.pubkey,
                        verified: true,
                    }),
                    uses: None,
                }),
                None,
                None,
            )],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );

        let result = context
            .banks_client
            .process_transaction(tx)
            .await
            .unwrap_err();

        assert_custom_error!(
            result,
            MetadataError::CollectionCannotBeVerifiedInThisInstruction
        );
    }
} 
