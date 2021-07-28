mod utils;

use solana_program_test::*;
use utils::*;

#[tokio::test]
async fn success() {
    let mut context = program_test().start_with_context().await;
    let metadata = Metadata::new();
    let master_edition = MasterEditionV2::new(&metadata);
    let edition_marker = EditionMarker::new(&metadata, &master_edition, 10);

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

    master_edition.create(&mut context, Some(10)).await.unwrap();

    edition_marker.create(&mut context).await.unwrap();

    edition_marker.get_data(&mut context).await;
}
