mod utils;

use solana_program_test::*;
use spl_token_metadata::state::Key;
use utils::*;

#[tokio::test]
async fn success() {
    let mut context = program_test().start_with_context().await;
    let test_metadata = Metadata::new();
    let test_master_edition = MasterEditionV2::new(&test_metadata);

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

    let mint = get_mint(&mut context, &test_master_edition.mint_pubkey).await;
    let old_authority = mint.mint_authority.unwrap();

    test_master_edition
        .create(&mut context, Some(10))
        .await
        .unwrap();

    let master_edition = test_master_edition.get_data(&mut context).await;

    let mint = get_mint(&mut context, &test_master_edition.mint_pubkey).await;
    let new_authority = mint.mint_authority.unwrap();

    assert_eq!(new_authority, new_authority);
    assert_ne!(old_authority, new_authority);
    assert_eq!(master_edition.supply, 0);
    assert_eq!(master_edition.max_supply.unwrap(), 10);
    assert_eq!(master_edition.key, Key::MasterEditionV2);
}
