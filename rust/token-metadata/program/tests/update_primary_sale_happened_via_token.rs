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

    test_metadata
        .update_primary_sale_happened_via_token(&mut context)
        .await
        .unwrap();

    let metadata = test_metadata.get_data(&mut context).await;

    assert_eq!(metadata.data.name, "Test");
    assert_eq!(metadata.data.symbol, "TST");
    assert_eq!(metadata.data.uri, "uri");
    assert_eq!(metadata.data.seller_fee_basis_points, 10);
    assert_eq!(metadata.data.creators, None);

    assert_eq!(metadata.primary_sale_happened, true);
    assert_eq!(metadata.is_mutable, false);
    assert_eq!(metadata.mint, test_metadata.mint.pubkey());
    assert_eq!(metadata.update_authority, context.payer.pubkey());
    assert_eq!(metadata.key, Key::MetadataV1);
}

#[tokio::test]
async fn fail_invalid_mint() {
    let mut context = program_test().start_with_context().await;
    let test_metadata = Metadata::new();

    let fake_mint = Keypair::new();
    let fake_token_account = Keypair::new();
    let payer_pubkey = context.payer.pubkey();
    create_mint(&mut context, &fake_mint, &payer_pubkey, None)
        .await
        .unwrap();
    create_token_account(
        &mut context,
        &fake_token_account,
        &fake_mint.pubkey(),
        &payer_pubkey,
    )
    .await
    .unwrap();
    mint_tokens(
        &mut context,
        &fake_mint.pubkey(),
        &fake_token_account.pubkey(),
        10000000,
        &payer_pubkey,
        None,
    )
    .await
    .unwrap();

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
        &[instruction::update_primary_sale_happened_via_token(
            id(),
            test_metadata.pubkey,
            context.payer.pubkey(),
            fake_token_account.pubkey(),
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

    assert_custom_error!(result, MetadataError::MintMismatch);
}
