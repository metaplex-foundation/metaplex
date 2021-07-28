mod utils;

use solana_program_test::*;
use utils::*;

#[tokio::test]
async fn success() {
    let mut context = program_test().start_with_context().await;
    let metadata = Metadata::new();

    metadata
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

    metadata
        .update_primary_sale_happened_via_token(&mut context)
        .await
        .unwrap();

    let metadata = metadata.get_data(&mut context).await;

    assert_eq!(metadata.data.name, "Test");
    assert_eq!(metadata.data.symbol, "TST");
    assert_eq!(metadata.data.uri, "uri");
    assert_eq!(metadata.data.seller_fee_basis_points, 10);
    assert_eq!(metadata.primary_sale_happened, true);
}
