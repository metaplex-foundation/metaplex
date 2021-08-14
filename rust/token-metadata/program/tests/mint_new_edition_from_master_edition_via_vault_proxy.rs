mod utils;

use solana_program_test::*;
use solana_sdk::signature::Signer;
use spl_token_metadata::state::Key;
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
