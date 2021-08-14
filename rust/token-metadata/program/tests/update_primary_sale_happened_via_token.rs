mod utils;

use solana_program_test::*;
use solana_sdk::signature::Signer;
use spl_token_metadata::state::Key;
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
