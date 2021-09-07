mod utils;

use metaplex_nft_packs::{
    instruction::{AddCardToPackArgs, InitPackSetArgs},
    state::DistributionType,
};
use solana_program_test::*;
use solana_sdk::{signature::Keypair, signer::Signer};
use utils::*;

async fn setup() -> (
    ProgramTestContext,
    TestPackSet,
    TestMetadata,
    TestMetadata,
    TestPackCard,
    TestMasterEditionV2,
    TestEdition,
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

    // Create only instance to obtain generated PDA later
    let test_new_metadata = TestMetadata::new();
    let test_new_edition = TestEdition::new(&test_metadata);

    let user_token_acc = Keypair::new();
    let user = User {
        owner: Keypair::new(),
        token_account: user_token_acc.pubkey(),
    };

    test_metadata
        .create(
            &mut context,
            "Test".to_string(),
            "TST".to_string(),
            "uri".to_string(),
            None,
            10,
            false,
            &user_token_acc,
            &test_pack_set.authority.pubkey(),
        )
        .await
        .unwrap();

    test_master_edition
        .create(&mut context, Some(10))
        .await
        .unwrap();

    let test_pack_card = TestPackCard::new(&test_pack_set, 1);
    test_pack_set
        .add_card(
            &mut context,
            &test_pack_card,
            &test_master_edition,
            &test_metadata,
            &user,
            AddCardToPackArgs {
                max_supply: Some(5),
                probability_type: DistributionType::ProbabilityBased,
                probability: 1000000,
                index: test_pack_card.index,
            },
        )
        .await
        .unwrap();

    (
        context,
        test_pack_set,
        test_metadata,
        test_new_metadata,
        test_pack_card,
        test_master_edition,
        test_new_edition,
        user,
    )
}

#[tokio::test]
async fn success() {
    let (
        mut context,
        test_pack_set,
        test_metadata,
        test_new_metadata,
        test_pack_card,
        test_master_edition,
        test_new_edition,
        _user,
    ) = setup().await;

    let payer_pubkey = context.payer.pubkey();

    test_pack_set
        .mint_edition_with_card(
            &mut context,
            &test_metadata,
            &test_pack_card,
            &test_new_metadata,
            &test_new_edition,
            &test_master_edition,
            &payer_pubkey,
            &payer_pubkey,
        )
        .await
        .unwrap();
}
