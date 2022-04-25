mod utils;

use mpl_nft_packs::{
    find_pack_config_program_address,
    instruction::{AddCardToPackArgs, InitPackSetArgs},
    state::{CleanUpActions, PackConfig, PackDistributionType},
};
use solana_program::{clock::Clock, program_pack::Pack, system_instruction};
use solana_program_test::*;
use solana_sdk::{signature::Keypair, signer::Signer, transaction::Transaction};
use utils::*;

async fn create_master_edition(
    context: &mut ProgramTestContext,
    test_pack_set: &TestPackSet,
) -> (TestMetadata, TestMasterEditionV2, User) {
    let test_metadata = TestMetadata::new();
    let test_master_edition = TestMasterEditionV2::new(&test_metadata);

    let user_token_acc = Keypair::new();
    let master_token_holder = User {
        owner: Keypair::new(),
        token_account: user_token_acc.pubkey(),
    };

    test_metadata
        .create(
            context,
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

    test_master_edition.create(context, Some(10)).await.unwrap();

    (test_metadata, test_master_edition, master_token_holder)
}

#[tokio::test]
async fn success_clean_up_change() {
    let mut context = nft_packs_program_test().start_with_context().await;

    let name = [7; 32];
    let uri = String::from("some link to storage");
    let description = String::from("Pack description");

    let clock = context.banks_client.get_sysvar::<Clock>().await.unwrap();

    let redeem_start_date = Some(clock.unix_timestamp as u64);
    let redeem_end_date = Some(redeem_start_date.unwrap() + 100);

    let store_admin = Keypair::new();
    let store_key = create_store(&mut context, &store_admin, true)
        .await
        .unwrap();

    let test_pack_set = TestPackSet::new(store_key);
    test_pack_set
        .init(
            &mut context,
            InitPackSetArgs {
                name,
                uri: uri.clone(),
                description: description.clone(),
                mutable: true,
                distribution_type: PackDistributionType::Fixed,
                allowed_amount_to_redeem: 10,
                redeem_start_date,
                redeem_end_date,
            },
        )
        .await
        .unwrap();

    let (card_metadata, card_master_edition, card_master_token_holder) =
        create_master_edition(&mut context, &test_pack_set).await;

    let (voucher_metadata, voucher_master_edition, voucher_master_token_holder) =
        create_master_edition(&mut context, &test_pack_set).await;

    let voucher_edition = TestEditionMarker::new(&voucher_metadata, &voucher_master_edition, 1);
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
            &voucher_master_token_holder.token_account,
        )
        .await
        .unwrap();

    let test_pack_card = TestPackCard::new(&test_pack_set, 1);
    let card_max_supply = 5;
    let card_weight = 100;
    test_pack_set
        .add_card(
            &mut context,
            &test_pack_card,
            &card_master_edition,
            &card_metadata,
            &card_master_token_holder,
            AddCardToPackArgs {
                max_supply: card_max_supply,
                weight: card_weight,
                index: test_pack_card.index,
            },
        )
        .await
        .unwrap();

    let test_pack_voucher = TestPackVoucher::new(&test_pack_set, 1);
    test_pack_set
        .add_voucher(
            &mut context,
            &test_pack_voucher,
            &voucher_master_edition,
            &voucher_metadata,
            &voucher_master_token_holder,
        )
        .await
        .unwrap();

    test_pack_set.activate(&mut context).await.unwrap();
    test_pack_set.clean_up(&mut context).await.unwrap();

    test_pack_set
        .request_card_for_redeem(
            &mut context,
            &store_key,
            &voucher_edition.new_edition_pubkey,
            &voucher_edition.mint.pubkey(),
            &edition_authority,
            &Some(voucher_edition.token.pubkey()),
            1,
        )
        .await
        .unwrap();

    context.warp_to_slot(5).unwrap();

    let (pack_config_key, _) =
        find_pack_config_program_address(&mpl_nft_packs::id(), &test_pack_set.keypair.pubkey());

    let pack_config_account = get_account(&mut context, &pack_config_key).await;
    let pack_config = PackConfig::unpack_from_slice(&pack_config_account.data).unwrap();

    assert_eq!(pack_config.weights[0] == (1, 100, 5), true);
    assert_eq!(
        pack_config.action_to_do == CleanUpActions::Change(1, 4),
        true
    );

    test_pack_set.clean_up(&mut context).await.unwrap();

    let pack_config_account = get_account(&mut context, &pack_config_key).await;
    let pack_config = PackConfig::unpack_from_slice(&pack_config_account.data).unwrap();

    assert_eq!(pack_config.weights[0] == (1, 100, 4), true);
    assert_eq!(pack_config.action_to_do == CleanUpActions::None, true);
}

#[tokio::test]
async fn success_clean_up_sort() {
    let mut context = nft_packs_program_test().start_with_context().await;

    let name = [7; 32];
    let uri = String::from("some link to storage");
    let description = String::from("Pack description");

    let clock = context.banks_client.get_sysvar::<Clock>().await.unwrap();

    let redeem_start_date = Some(clock.unix_timestamp as u64);
    let redeem_end_date = Some(redeem_start_date.unwrap() + 100);

    let store_admin = Keypair::new();
    let store_key = create_store(&mut context, &store_admin, true)
        .await
        .unwrap();

    let test_pack_set = TestPackSet::new(store_key);
    test_pack_set
        .init(
            &mut context,
            InitPackSetArgs {
                name,
                uri: uri.clone(),
                description: description.clone(),
                mutable: true,
                distribution_type: PackDistributionType::Fixed,
                allowed_amount_to_redeem: 10,
                redeem_start_date,
                redeem_end_date,
            },
        )
        .await
        .unwrap();

    let (card_metadata, card_master_edition, card_master_token_holder) =
        create_master_edition(&mut context, &test_pack_set).await;

    let (card_metadata1, card_master_edition1, card_master_token_holder1) =
        create_master_edition(&mut context, &test_pack_set).await;

    let (voucher_metadata, voucher_master_edition, voucher_master_token_holder) =
        create_master_edition(&mut context, &test_pack_set).await;

    let voucher_edition = TestEditionMarker::new(&voucher_metadata, &voucher_master_edition, 1);
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
            &voucher_master_token_holder.token_account,
        )
        .await
        .unwrap();

    // Add first pack card
    let test_pack_card = TestPackCard::new(&test_pack_set, 1);
    let card_max_supply = 5;
    let card_weight = 40;
    test_pack_set
        .add_card(
            &mut context,
            &test_pack_card,
            &card_master_edition,
            &card_metadata,
            &card_master_token_holder,
            AddCardToPackArgs {
                max_supply: card_max_supply,
                weight: card_weight,
                index: test_pack_card.index,
            },
        )
        .await
        .unwrap();

    // Add second pack card
    let test_pack_card1 = TestPackCard::new(&test_pack_set, 2);
    let card_max_supply = 5;
    let card_weight = 60;
    test_pack_set
        .add_card(
            &mut context,
            &test_pack_card1,
            &card_master_edition1,
            &card_metadata1,
            &card_master_token_holder1,
            AddCardToPackArgs {
                max_supply: card_max_supply,
                weight: card_weight,
                index: test_pack_card1.index,
            },
        )
        .await
        .unwrap();

    let test_pack_voucher = TestPackVoucher::new(&test_pack_set, 1);
    test_pack_set
        .add_voucher(
            &mut context,
            &test_pack_voucher,
            &voucher_master_edition,
            &voucher_metadata,
            &voucher_master_token_holder,
        )
        .await
        .unwrap();

    test_pack_set.activate(&mut context).await.unwrap();

    let (pack_config_key, _) =
        find_pack_config_program_address(&mpl_nft_packs::id(), &test_pack_set.keypair.pubkey());
    let pack_config_account = get_account(&mut context, &pack_config_key).await;
    let pack_config = PackConfig::unpack_from_slice(&pack_config_account.data).unwrap();

    assert_eq!(pack_config.action_to_do == CleanUpActions::Sort, true);
    assert_eq!(pack_config.weights[0] == (1, 40, 5), true);

    test_pack_set.clean_up(&mut context).await.unwrap();

    let pack_config_account = get_account(&mut context, &pack_config_key).await;
    let pack_config = PackConfig::unpack_from_slice(&pack_config_account.data).unwrap();

    assert_eq!(pack_config.action_to_do == CleanUpActions::None, true);
    assert_eq!(pack_config.weights[0] == (2, 60, 5), true);
}
