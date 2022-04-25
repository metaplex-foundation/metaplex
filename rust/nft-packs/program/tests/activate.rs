mod utils;

use mpl_nft_packs::{
    error::NFTPacksError,
    instruction::{AddCardToPackArgs, InitPackSetArgs},
    state::{PackDistributionType, PackSetState},
};
use num_traits::FromPrimitive;
use solana_program::{instruction::InstructionError, system_instruction};
use solana_program_test::*;
use solana_sdk::{
    signature::Keypair,
    signer::Signer,
    transaction::{Transaction, TransactionError},
    transport::TransportError,
};
use utils::*;

async fn setup() -> (
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
                distribution_type: PackDistributionType::MaxSupply,
                allowed_amount_to_redeem: 10,
                redeem_start_date: None,
                redeem_end_date: None,
            },
        )
        .await
        .unwrap();

    let test_metadata = TestMetadata::new();
    let test_master_edition = TestMasterEditionV2::new(&test_metadata);

    let test_metadata2 = TestMetadata::new();
    let test_master_edition2 = TestMasterEditionV2::new(&test_metadata2);

    let user_token_acc = Keypair::new();
    let user_token_acc2 = Keypair::new();

    let user = User {
        owner: Keypair::new(),
        token_account: user_token_acc.pubkey(),
    };

    let user2 = User {
        owner: Keypair::new(),
        token_account: user_token_acc2.pubkey(),
    };

    // Create 1st metadata and master edition
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
                max_supply: 5,
                weight: 0,
                index: test_pack_card.index,
            },
        )
        .await
        .unwrap();

    let voucher_edition = TestEditionMarker::new(&test_metadata2, &test_master_edition2, 1);

    let edition_authority = Keypair::new();

    let tx = Transaction::new_signed_with_payer(
        &[system_instruction::create_account(
            &context.payer.pubkey(),
            &edition_authority.pubkey(),
            100000000000000,
            0,
            &solana_program::system_program::id(),
        )],
        Some(&context.payer.pubkey()),
        &[&context.payer, &edition_authority],
        context.last_blockhash,
    );

    context.banks_client.process_transaction(tx).await.unwrap();

    voucher_edition
        .create(
            &mut context,
            &edition_authority,
            &test_pack_set.authority,
            &user2.token_account,
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
        )
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
    let (mut context, test_pack_set, _test_metadata, _test_master_edition, _user) = setup().await;
    assert_eq!(
        test_pack_set.get_data(&mut context).await.pack_state,
        PackSetState::NotActivated
    );

    test_pack_set.activate(&mut context).await.unwrap();
    assert_eq!(
        test_pack_set.get_data(&mut context).await.pack_state,
        PackSetState::Activated
    );
}

#[tokio::test]
async fn fail_invalid_state() {
    let (mut context, test_pack_set, _test_metadata, _test_master_edition, _user) = setup().await;
    test_pack_set.activate(&mut context).await.unwrap();

    context.warp_to_slot(3).unwrap();

    let result = test_pack_set.activate(&mut context).await;
    assert_custom_error!(result.unwrap_err(), NFTPacksError::CantActivatePack, 0);
}

#[tokio::test]
async fn fail_activate_after_close() {
    let (mut context, test_pack_set, _test_metadata, _test_master_edition, _user) = setup().await;
    test_pack_set.activate(&mut context).await.unwrap();

    context.warp_to_slot(3).unwrap();

    test_pack_set.close(&mut context).await.unwrap();

    context.warp_to_slot(6).unwrap();

    let result = test_pack_set.activate(&mut context).await;
    assert_custom_error!(result.unwrap_err(), NFTPacksError::CantActivatePack, 0);
}
