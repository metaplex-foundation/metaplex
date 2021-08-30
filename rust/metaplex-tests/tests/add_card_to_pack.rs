#![cfg(feature = "test-bpf")]

mod utils;

use metaplex_nft_packs::{
    instruction::{AddCardToPackArgs, InitPackSetArgs},
    state::{AccountType, ProbabilityType},
};
use solana_program_test::*;
use utils::*;

async fn setup() -> (
    ProgramTestContext,
    TestPackSet,
    TestMetadata,
    TestMasterEditionV2,
    User,
) {
    let mut context = nft_packs_program_test().start_with_context().await;

    let test_pack_set = TestPackSet::new();
    test_pack_set
        .init(
            &mut context,
            InitPackSetArgs {
                name: [7; 32],
                total_packs: 5,
                mutable: true,
            },
        )
        .await
        .unwrap();

    let test_metadata = TestMetadata::new();
    let test_master_edition = TestMasterEditionV2::new(&test_metadata);

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

    let user = add_user(&mut context, &test_master_edition).await.unwrap();

    (
        context,
        test_pack_set,
        test_metadata,
        test_master_edition,
        user,
    )
}

#[tokio::test]
async fn success() {
    let (mut context, test_pack_set, test_metadata, test_master_edition, user) = setup().await;

    let test_pack_card = TestPackCard::new(&test_pack_set, 0);
    test_pack_set
        .add_card(
            &mut context,
            &test_pack_card,
            &test_master_edition,
            &test_metadata,
            &user,
            AddCardToPackArgs {
                max_supply: Some(5),
                probability_type: ProbabilityType::ProbabilityBased,
                probability: 1000000,
                index: test_pack_card.index,
            },
        )
        .await
        .unwrap();

    let pack_card = test_pack_card.get_data(&mut context).await;

    assert_eq!(pack_card.account_type, AccountType::PackCard);
}
