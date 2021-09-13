mod utils;

use metaplex_nft_packs::{
    error::NFTPacksError,
    instruction::{AddCardToPackArgs, AddVoucherToPackArgs, InitPackSetArgs},
    state::{ActionOnProve, DistributionType},
};
use num_traits::FromPrimitive;
use solana_program::instruction::InstructionError;
use solana_program_test::*;
use solana_sdk::{
    signature::Keypair, signer::Signer, transaction::TransactionError, transport::TransportError,
};
use utils::*;

async fn setup() -> (
    ProgramTestContext,
    TestPackSet,
    TestPackCard,
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

    let test_metadata2 = TestMetadata::new();
    let test_master_edition2 = TestMasterEditionV2::new(&test_metadata2);

    let user_token_acc = Keypair::new();
    let user = User {
        owner: Keypair::new(),
        token_account: user_token_acc.pubkey(),
    };

    let user_token_acc2 = Keypair::new();
    let user2 = User {
        owner: Keypair::new(),
        token_account: user_token_acc2.pubkey(),
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

    // Create 2nd metadata and master edition
    test_metadata2
        .create(
            &mut context,
            "Test2".to_string(),
            "TST2".to_string(),
            "uri2".to_string(),
            None,
            10,
            false,
            &user_token_acc2,
            &test_pack_set.authority.pubkey(),
        )
        .await
        .unwrap();

    test_master_edition2
        .create(&mut context, Some(10))
        .await
        .unwrap();

    // Add pack card
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
                probability_type: DistributionType::ProbabilityBased(1000000),
                index: test_pack_card.index,
            },
        )
        .await
        .unwrap();

    // Add pack voucher
    let test_pack_voucher = TestPackVoucher::new(&test_pack_set, 1);
    test_pack_set
        .add_voucher(
            &mut context,
            &test_pack_voucher,
            &test_master_edition2,
            &test_metadata2,
            &user2,
            AddVoucherToPackArgs {
                max_supply: Some(5),
                number_to_open: 4,
                action_on_prove: ActionOnProve::Burn,
            },
        )
        .await
        .unwrap();

    (
        context,
        test_pack_set,
        test_pack_card,
        test_metadata,
        test_master_edition,
        user,
    )
}

#[tokio::test]
async fn success() {
    let (mut context, test_pack_set, _test_pack_card, _test_metadata, _test_master_edition, _user) =
        setup().await;

    let new_minting_authority = Keypair::new();

    assert_ne!(
        test_pack_set.get_data(&mut context).await.minting_authority,
        new_minting_authority.pubkey()
    );

    test_pack_set
        .transfer_minting_authority(&mut context, &new_minting_authority.pubkey())
        .await
        .unwrap();

    assert_eq!(
        test_pack_set.get_data(&mut context).await.minting_authority,
        new_minting_authority.pubkey()
    );
}

#[tokio::test]
async fn fail_invalid_state() {
    let (mut context, test_pack_set, _test_pack_card, _test_metadata, _test_master_edition, _user) =
        setup().await;

    let new_minting_authority = Keypair::new();
    test_pack_set.activate(&mut context).await.unwrap();

    context.warp_to_slot(3).unwrap();

    let result = test_pack_set
        .transfer_minting_authority(&mut context, &new_minting_authority.pubkey())
        .await;

    assert_custom_error!(result.unwrap_err(), NFTPacksError::WrongPackState);
}
