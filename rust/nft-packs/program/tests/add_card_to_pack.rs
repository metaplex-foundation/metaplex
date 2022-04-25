mod utils;

use mpl_nft_packs::{
    error::NFTPacksError,
    instruction::{AddCardToPackArgs, InitPackSetArgs},
    state::{AccountType, PackDistributionType},
};
use num_traits::FromPrimitive;
use solana_program::instruction::InstructionError;
use solana_program_test::*;
use solana_sdk::{
    signature::Keypair, signer::Signer, transaction::TransactionError, transport::TransportError,
};
use utils::*;

async fn setup(
    distribution_type: PackDistributionType,
) -> (
    ProgramTestContext,
    TestPackSet,
    TestMetadata,
    TestMasterEditionV2,
    User,
) {
    let mut context = nft_packs_program_test().start_with_context().await;

    let store_admin = Keypair::new();
    let store_key = create_store(&mut context, &store_admin, true)
        .await
        .unwrap();

    let name = [7; 32];
    let uri = String::from("some link to storage");
    let description = String::from("Pack description");

    let test_pack_set = TestPackSet::new(store_key);
    test_pack_set
        .init(
            &mut context,
            InitPackSetArgs {
                name,
                uri: uri.clone(),
                description: description.clone(),
                mutable: true,
                distribution_type,
                allowed_amount_to_redeem: 10,
                redeem_start_date: None,
                redeem_end_date: None,
            },
        )
        .await
        .unwrap();

    let test_metadata = TestMetadata::new();
    let test_master_edition = TestMasterEditionV2::new(&test_metadata);

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
    let (mut context, test_pack_set, test_metadata, test_master_edition, user) =
        setup(PackDistributionType::MaxSupply).await;

    let test_pack_card = TestPackCard::new(&test_pack_set, 1);
    test_pack_set
        .add_card(
            &mut context,
            &test_pack_card,
            &test_master_edition,
            &test_metadata,
            &user,
            AddCardToPackArgs {
                max_supply: 5,
                weight: 0,
                index: test_pack_card.index,
            },
        )
        .await
        .unwrap();

    let pack_card = test_pack_card.get_data(&mut context).await;

    assert_eq!(pack_card.account_type, AccountType::PackCard);
}

#[tokio::test]
async fn fail_invalid_index() {
    let (mut context, test_pack_set, test_metadata, test_master_edition, user) =
        setup(PackDistributionType::MaxSupply).await;

    let test_pack_card = TestPackCard::new(&test_pack_set, 1);
    test_pack_set
        .add_card(
            &mut context,
            &test_pack_card,
            &test_master_edition,
            &test_metadata,
            &user,
            AddCardToPackArgs {
                max_supply: 5,
                weight: 0,
                index: test_pack_card.index,
            },
        )
        .await
        .unwrap();

    context.warp_to_slot(3).unwrap();

    let test_pack_card = TestPackCard::new(&test_pack_set, 1);
    let result = test_pack_set
        .add_card(
            &mut context,
            &test_pack_card,
            &test_master_edition,
            &test_metadata,
            &user,
            AddCardToPackArgs {
                max_supply: 5,
                weight: 0,
                index: test_pack_card.index,
            },
        )
        .await;

    assert_transport_error!(
        result.unwrap_err(),
        TransportError::TransactionError(TransactionError::InstructionError(
            1,
            InstructionError::InvalidArgument
        ))
    );
}

#[tokio::test]
async fn fail_wrong_probability() {
    let (mut context, test_pack_set, test_metadata, test_master_edition, user) =
        setup(PackDistributionType::MaxSupply).await;

    let test_pack_card = TestPackCard::new(&test_pack_set, 1);
    let result = test_pack_set
        .add_card(
            &mut context,
            &test_pack_card,
            &test_master_edition,
            &test_metadata,
            &user,
            AddCardToPackArgs {
                max_supply: 5,
                weight: 100,
                index: test_pack_card.index,
            },
        )
        .await;

    assert_custom_error!(
        result.unwrap_err(),
        NFTPacksError::CardShouldntHaveProbabilityValue,
        1
    );
}

#[tokio::test]
async fn fail_unlimited_probability() {
    let (mut context, test_pack_set, test_metadata, test_master_edition, user) =
        setup(PackDistributionType::Unlimited).await;

    let test_pack_card = TestPackCard::new(&test_pack_set, 1);

    let result = test_pack_set
        .add_card(
            &mut context,
            &test_pack_card,
            &test_master_edition,
            &test_metadata,
            &user,
            AddCardToPackArgs {
                max_supply: 0,
                weight: 100,
                index: test_pack_card.index,
            },
        )
        .await;

    assert_custom_error!(result.unwrap_err(), NFTPacksError::WrongMasterSupply, 1);
}
