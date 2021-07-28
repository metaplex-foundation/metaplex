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
            true,
        )
        .await
        .unwrap();

    metadata
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

    let metadata = metadata.get_data(&mut context).await;

    assert_eq!(metadata.data.name, "Cool");
    assert_eq!(metadata.data.symbol, "TST");
    assert_eq!(metadata.data.uri, "uri");
    assert_eq!(metadata.data.seller_fee_basis_points, 10);
}
