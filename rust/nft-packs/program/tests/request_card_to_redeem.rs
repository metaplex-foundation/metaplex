mod utils;

use mpl_nft_packs::{
    error::NFTPacksError,
    find_proving_process_program_address,
    instruction::{AddCardToPackArgs, InitPackSetArgs},
    state::{PackDistributionType, ProvingProcess},
};
use num_traits::FromPrimitive;
use solana_program::{
    clock::Clock, instruction::InstructionError, program_pack::Pack, system_instruction,
};
use solana_program_test::*;
use solana_sdk::{
    signature::Keypair,
    signer::Signer,
    transaction::{Transaction, TransactionError},
    transport::TransportError,
};
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
async fn success() {
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
    test_pack_set
        .add_card(
            &mut context,
            &test_pack_card,
            &card_master_edition,
            &card_metadata,
            &card_master_token_holder,
            AddCardToPackArgs {
                max_supply: 5,
                weight: 100,
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

    let (proving_process_key, _) = find_proving_process_program_address(
        &mpl_nft_packs::id(),
        &test_pack_set.keypair.pubkey(),
        &edition_authority.pubkey(),
        &voucher_edition.mint.pubkey(),
    );
    let proving_process_data = get_account(&mut context, &proving_process_key).await;
    let proving_process = ProvingProcess::unpack(&proving_process_data.data).unwrap();

    assert_eq!(proving_process.pack_set, test_pack_set.keypair.pubkey());

    // should be 1 such as we have only one card in a pack
    assert_eq!(proving_process.cards_to_redeem.len(), 1);
}

#[tokio::test]
async fn success_two_cards() {
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

    let (card_metadata2, card_master_edition2, card_master_token_holder2) =
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
    test_pack_set
        .add_card(
            &mut context,
            &test_pack_card,
            &card_master_edition,
            &card_metadata,
            &card_master_token_holder,
            AddCardToPackArgs {
                max_supply: 5,
                weight: 100,
                index: test_pack_card.index,
            },
        )
        .await
        .unwrap();

    let test_pack_card2 = TestPackCard::new(&test_pack_set, 2);
    test_pack_set
        .add_card(
            &mut context,
            &test_pack_card2,
            &card_master_edition2,
            &card_metadata2,
            &card_master_token_holder2,
            AddCardToPackArgs {
                max_supply: 5,
                weight: 100,
                index: test_pack_card2.index,
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

    let (proving_process_key, _) = find_proving_process_program_address(
        &mpl_nft_packs::id(),
        &test_pack_set.keypair.pubkey(),
        &edition_authority.pubkey(),
        &voucher_edition.mint.pubkey(),
    );
    let proving_process_data = get_account(&mut context, &proving_process_key).await;
    let proving_process = ProvingProcess::unpack_from_slice(&proving_process_data.data).unwrap();

    assert_eq!(proving_process.pack_set, test_pack_set.keypair.pubkey());

    assert_eq!(proving_process.cards_to_redeem.len(), 1);

    println!("Chosen card index: {:?}", proving_process.cards_to_redeem);
}

#[tokio::test]
async fn fail_request_without_clean_up() {
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
    test_pack_set
        .add_card(
            &mut context,
            &test_pack_card,
            &card_master_edition,
            &card_metadata,
            &card_master_token_holder,
            AddCardToPackArgs {
                max_supply: 5,
                weight: 100,
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

    // do wrap to update state
    context.warp_to_slot(5).unwrap();

    let result = test_pack_set
        .request_card_for_redeem(
            &mut context,
            &store_key,
            &voucher_edition.new_edition_pubkey,
            &voucher_edition.mint.pubkey(),
            &edition_authority,
            &Some(voucher_edition.token.pubkey()),
            1,
        )
        .await;

    assert_transport_error!(
        result.unwrap_err(),
        TransportError::TransactionError(TransactionError::InstructionError(
            0,
            InstructionError::IllegalOwner
        ))
    );
}

#[tokio::test]
async fn fail_request_after_end_date() {
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

    let (card_metadata2, card_master_edition2, card_master_token_holder2) =
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
    test_pack_set
        .add_card(
            &mut context,
            &test_pack_card,
            &card_master_edition,
            &card_metadata,
            &card_master_token_holder,
            AddCardToPackArgs {
                max_supply: 5,
                weight: 100,
                index: test_pack_card.index,
            },
        )
        .await
        .unwrap();

    let test_pack_card2 = TestPackCard::new(&test_pack_set, 2);
    test_pack_set
        .add_card(
            &mut context,
            &test_pack_card2,
            &card_master_edition2,
            &card_metadata2,
            &card_master_token_holder2,
            AddCardToPackArgs {
                max_supply: 5,
                weight: 100,
                index: test_pack_card2.index,
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

    // Wait until we reach over `redeem_end_date` timestamp
    warp_sleep(&mut context, std::time::Duration::from_secs(5)).await;
    let last_timestamp = context
        .banks_client
        .get_sysvar::<Clock>()
        .await
        .unwrap()
        .unix_timestamp as u64;
    assert_eq!(last_timestamp > redeem_end_date.unwrap(), true);

    let err = test_pack_set
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
        .unwrap_err();

    assert_custom_error!(err, NFTPacksError::WrongRedeemDate, 0);
}

#[tokio::test]
async fn fail_request_with_invalid_voucher() {
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

    let (card_metadata2, card_master_edition2, card_master_token_holder2) =
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
    test_pack_set
        .add_card(
            &mut context,
            &test_pack_card,
            &card_master_edition,
            &card_metadata,
            &card_master_token_holder,
            AddCardToPackArgs {
                max_supply: 5,
                weight: 100,
                index: test_pack_card.index,
            },
        )
        .await
        .unwrap();

    let test_pack_card2 = TestPackCard::new(&test_pack_set, 2);
    test_pack_set
        .add_card(
            &mut context,
            &test_pack_card2,
            &card_master_edition2,
            &card_metadata2,
            &card_master_token_holder2,
            AddCardToPackArgs {
                max_supply: 5,
                weight: 100,
                index: test_pack_card2.index,
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

    // Wait until we reach over `redeem_end_date` timestamp
    warp_sleep(&mut context, std::time::Duration::from_secs(5)).await;
    let last_timestamp = context
        .banks_client
        .get_sysvar::<Clock>()
        .await
        .unwrap()
        .unix_timestamp as u64;
    assert_eq!(last_timestamp > redeem_end_date.unwrap(), true);

    let err = test_pack_set
        .request_card_for_redeem_fake_voucher(
            &mut context,
            &store_key,
            &voucher_edition.new_edition_pubkey,
            &voucher_edition.mint.pubkey(),
            &edition_authority,
            &Some(voucher_edition.token.pubkey()),
            1,
        )
        .await
        .unwrap_err();

    assert_transport_error!(
        err,
        TransportError::TransactionError(TransactionError::InstructionError(
            0,
            InstructionError::IllegalOwner
        ))
    );
}
