mod utils;

use solana_program_test::*;
use spl_token_metadata::{instruction};
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
        )
        .await
        .unwrap();

    let metadata = metadata.get_data(&mut context).await;

    assert_eq!(metadata.data.name, "Test");
    assert_eq!(metadata.data.symbol, "TST");
    assert_eq!(metadata.data.uri, "uri");
}
