mod utils;

use num_traits::FromPrimitive;
use solana_program_test::*;
use solana_sdk::{
    instruction::InstructionError,
    signature::{Keypair, Signer},
    transaction::{Transaction, TransactionError},
    transport::TransportError,
};
use spl_token_metadata::error::MetadataError;
use spl_token_metadata::state::Key;
use spl_token_metadata::{id, instruction};
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
            true,
        )
        .await
        .unwrap();

    test_metadata
        .update(
            &mut context,
            "Cool".to_string(),
            "TST".to_string(),
            "uri".to_string(),
            None,
            10,
        )
        .await
        .unwrap();

    let metadata = test_metadata.get_data(&mut context).await;

    assert_eq!(metadata.data.name, "Cool");
    assert_eq!(metadata.data.symbol, "TST");
    assert_eq!(metadata.data.uri, "uri");
    assert_eq!(metadata.data.seller_fee_basis_points, 10);
    assert_eq!(metadata.data.creators, None);

    assert_eq!(metadata.primary_sale_happened, false);
    assert_eq!(metadata.is_mutable, true);
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
        &[instruction::update_metadata_accounts(
            id(),
            test_metadata.pubkey,
            fake_update_authority.pubkey(),
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
