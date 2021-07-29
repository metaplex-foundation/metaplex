mod utils;

use solana_program_test::*;
use spl_token_metadata::state::Key;
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
