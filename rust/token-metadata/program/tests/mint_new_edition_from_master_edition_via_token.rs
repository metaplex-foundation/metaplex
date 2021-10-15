mod utils;

use num_traits::FromPrimitive;
use solana_program_test::*;
use solana_sdk::{
    instruction::InstructionError,
    signature::{Keypair, Signer},
    transaction::{Transaction, TransactionError},
    transport::TransportError,
};
use metaplex_token_metadata::error::MetadataError;
use metaplex_token_metadata::state::Key;
use metaplex_token_metadata::{id, instruction};
use utils::*;

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
