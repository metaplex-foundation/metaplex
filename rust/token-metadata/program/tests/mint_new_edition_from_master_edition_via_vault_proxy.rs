mod utils;

use num_traits::FromPrimitive;
use solana_program_test::*;
use solana_sdk::{
    instruction::InstructionError,
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    transaction::{Transaction, TransactionError},
    transport::TransportError,
};
use spl_token_metadata::error::MetadataError;
use spl_token_metadata::state::Key;
use spl_token_metadata::{id, instruction};
use spl_token_vault::state::PREFIX;
use utils::*;

#[tokio::test]
async fn success() {
    let mut program_test = program_test();
    program_test.add_program("spl_token_vault", spl_token_vault::id(), None);
    let mut context = program_test.start_with_context().await;

    let test_metadata = Metadata::new();
    let test_master_edition = MasterEditionV2::new(&test_metadata);
    let test_external_price = ExternalPrice::new();
    let test_vault = Vault::new();
    let test_edition_marker = EditionMarker::new(&test_metadata, &test_master_edition, 10);

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

    test_external_price.create(&mut context).await.unwrap();
    test_external_price
        .update(
            &mut context,
            1,
            &test_external_price.price_mint.pubkey(),
            true,
        )
        .await
        .unwrap();

    test_vault
        .create(&mut context, &test_external_price)
        .await
        .unwrap();

    let (safety_deposit_box, store) = test_vault
        .add_token_to_inactive_vault(&mut context, 1, &test_metadata)
        .await
        .unwrap();

    test_vault.activate(&mut context, 1).await.unwrap();

    test_vault
        .combine(&mut context, &test_external_price)
        .await
        .unwrap();

    test_edition_marker
        .create_via_vault(&mut context, &test_vault, &safety_deposit_box, &store)
        .await
        .unwrap();

    let edition_marker = test_edition_marker.get_data(&mut context).await;

    assert_eq!(edition_marker.ledger[1], 32);
    assert_eq!(edition_marker.key, Key::EditionMarker);
}

#[tokio::test]
async fn fail_invalid_store_owner_pda() {
    let mut program_test = program_test();
    program_test.add_program("spl_token_vault", spl_token_vault::id(), None);
    let mut context = program_test.start_with_context().await;

    let test_metadata = Metadata::new();
    let test_master_edition = MasterEditionV2::new(&test_metadata);
    let test_external_price = ExternalPrice::new();
    let test_vault = Vault::new();
    let test_edition_marker = EditionMarker::new(&test_metadata, &test_master_edition, 10);
    let fake_store = Keypair::new();
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

    test_external_price.create(&mut context).await.unwrap();
    test_external_price
        .update(
            &mut context,
            1,
            &test_external_price.price_mint.pubkey(),
            true,
        )
        .await
        .unwrap();

    test_vault
        .create(&mut context, &test_external_price)
        .await
        .unwrap();

    let (safety_deposit_box, _) = test_vault
        .add_token_to_inactive_vault(&mut context, 1, &test_metadata)
        .await
        .unwrap();

    test_vault.activate(&mut context, 1).await.unwrap();

    test_vault
        .combine(&mut context, &test_external_price)
        .await
        .unwrap();

    create_token_account(
        &mut context,
        &fake_store,
        &test_vault.mint.pubkey(),
        &payer_pubkey,
    )
    .await
    .unwrap();
    let tx = Transaction::new_signed_with_payer(
        &[
            instruction::mint_edition_from_master_edition_via_vault_proxy(
                id(),
                test_edition_marker.new_metadata_pubkey,
                test_edition_marker.new_edition_pubkey,
                test_edition_marker.master_edition_pubkey,
                test_edition_marker.mint.pubkey(),
                test_edition_marker.pubkey,
                context.payer.pubkey(),
                context.payer.pubkey(),
                context.payer.pubkey(),
                fake_store.pubkey(),
                safety_deposit_box,
                test_vault.keypair.pubkey(),
                context.payer.pubkey(),
                test_edition_marker.metadata_pubkey,
                spl_token::id(),
                spl_token_vault::id(),
                test_edition_marker.edition,
            ),
        ],
        Some(&context.payer.pubkey()),
        &[&context.payer, &context.payer],
        context.last_blockhash,
    );

    let result = context
        .banks_client
        .process_transaction(tx)
        .await
        .unwrap_err();

    assert_custom_error!(result, MetadataError::InvalidOwner);
}

#[tokio::test]
async fn fail_invalid_vault_authority() {
    let mut program_test = program_test();
    program_test.add_program("spl_token_vault", spl_token_vault::id(), None);
    let mut context = program_test.start_with_context().await;

    let test_metadata = Metadata::new();
    let test_master_edition = MasterEditionV2::new(&test_metadata);
    let test_external_price = ExternalPrice::new();
    let test_vault = Vault::new();
    let test_edition_marker = EditionMarker::new(&test_metadata, &test_master_edition, 10);
    let fake_vault_authority = Keypair::new();

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

    test_external_price.create(&mut context).await.unwrap();
    test_external_price
        .update(
            &mut context,
            1,
            &test_external_price.price_mint.pubkey(),
            true,
        )
        .await
        .unwrap();

    test_vault
        .create(&mut context, &test_external_price)
        .await
        .unwrap();

    let (safety_deposit_box, store) = test_vault
        .add_token_to_inactive_vault(&mut context, 1, &test_metadata)
        .await
        .unwrap();

    test_vault.activate(&mut context, 1).await.unwrap();

    test_vault
        .combine(&mut context, &test_external_price)
        .await
        .unwrap();

    let tx = Transaction::new_signed_with_payer(
        &[
            instruction::mint_edition_from_master_edition_via_vault_proxy(
                id(),
                test_edition_marker.new_metadata_pubkey,
                test_edition_marker.new_edition_pubkey,
                test_edition_marker.master_edition_pubkey,
                test_edition_marker.mint.pubkey(),
                test_edition_marker.pubkey,
                context.payer.pubkey(),
                context.payer.pubkey(),
                fake_vault_authority.pubkey(),
                store,
                safety_deposit_box,
                test_vault.keypair.pubkey(),
                context.payer.pubkey(),
                test_edition_marker.metadata_pubkey,
                spl_token::id(),
                spl_token_vault::id(),
                test_edition_marker.edition,
            ),
        ],
        Some(&context.payer.pubkey()),
        &[&context.payer, &context.payer, &fake_vault_authority],
        context.last_blockhash,
    );

    let result = context
        .banks_client
        .process_transaction(tx)
        .await
        .unwrap_err();

    assert_custom_error!(
        result,
        spl_token_vault::error::VaultError::AuthorityDoesNotMatch
    );
}

#[tokio::test]
async fn fail_store_account_mismatch() {
    let mut program_test = program_test();
    program_test.add_program("spl_token_vault", spl_token_vault::id(), None);
    let mut context = program_test.start_with_context().await;

    let test_metadata = Metadata::new();
    let test_master_edition = MasterEditionV2::new(&test_metadata);
    let test_external_price = ExternalPrice::new();
    let test_vault = Vault::new();

    let test_edition_marker = EditionMarker::new(&test_metadata, &test_master_edition, 10);

    // TEST VAULT
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

    test_external_price.create(&mut context).await.unwrap();
    test_external_price
        .update(
            &mut context,
            1,
            &test_external_price.price_mint.pubkey(),
            true,
        )
        .await
        .unwrap();

    test_vault
        .create(&mut context, &test_external_price)
        .await
        .unwrap();

    let (safety_deposit_box, _) = test_vault
        .add_token_to_inactive_vault(&mut context, 1, &test_metadata)
        .await
        .unwrap();

    test_vault.activate(&mut context, 1).await.unwrap();

    test_vault
        .combine(&mut context, &test_external_price)
        .await
        .unwrap();

    // Generate fake store
    let store = Keypair::new();
    let token_mint_pubkey = test_metadata.mint.pubkey();
    let spl_token_vault_id = spl_token_vault::id();
    let vault_pubkey = test_vault.keypair.pubkey();

    let seeds = &[
        PREFIX.as_bytes(),
        &vault_pubkey.as_ref(),
        &token_mint_pubkey.as_ref(),
    ];
    let (_, _) = Pubkey::find_program_address(seeds, &spl_token_vault_id);
    let seeds = &[
        PREFIX.as_bytes(),
        &spl_token_vault_id.as_ref(),
        &vault_pubkey.as_ref(),
    ];
    let (authority, _) = Pubkey::find_program_address(seeds, &spl_token_vault_id);
    create_token_account(&mut context, &store, &token_mint_pubkey, &authority)
        .await
        .unwrap();

    let tx = Transaction::new_signed_with_payer(
        &[
            instruction::mint_edition_from_master_edition_via_vault_proxy(
                id(),
                test_edition_marker.new_metadata_pubkey,
                test_edition_marker.new_edition_pubkey,
                test_edition_marker.master_edition_pubkey,
                test_edition_marker.mint.pubkey(),
                test_edition_marker.pubkey,
                context.payer.pubkey(),
                context.payer.pubkey(),
                context.payer.pubkey(),
                store.pubkey(),
                safety_deposit_box,
                test_vault.keypair.pubkey(),
                context.payer.pubkey(),
                test_edition_marker.metadata_pubkey,
                spl_token::id(),
                spl_token_vault::id(),
                test_edition_marker.edition,
            ),
        ],
        Some(&context.payer.pubkey()),
        &[&context.payer, &context.payer],
        context.last_blockhash,
    );

    let result = context
        .banks_client
        .process_transaction(tx)
        .await
        .unwrap_err();

    assert_custom_error!(
        result,
        spl_token_vault::error::VaultError::StoreDoesNotMatchSafetyDepositBox
    );
}
