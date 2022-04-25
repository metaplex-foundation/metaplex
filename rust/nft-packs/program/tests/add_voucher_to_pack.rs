mod utils;

use mpl_nft_packs::{
    instruction::InitPackSetArgs,
    state::{AccountType, PackDistributionType},
};
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
    let (mut context, test_pack_set, test_metadata, test_master_edition, user) = setup().await;
    let test_pack_voucher = TestPackVoucher::new(&test_pack_set, 1);

    let voucher_edition = TestEditionMarker::new(&test_metadata, &test_master_edition, 1);

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
            &user.token_account,
        )
        .await
        .unwrap();

    test_pack_set
        .add_voucher(
            &mut context,
            &test_pack_voucher,
            &test_master_edition,
            &test_metadata,
            &user,
        )
        .await
        .unwrap();

    let pack_voucher = test_pack_voucher.get_data(&mut context).await;
    assert_eq!(pack_voucher.account_type, AccountType::PackVoucher);
}

#[tokio::test]
async fn fail_invalid_index() {
    let (mut context, test_pack_set, test_metadata, test_master_edition, user) = setup().await;
    let test_pack_voucher = TestPackVoucher::new(&test_pack_set, 1);

    let voucher_edition = TestEditionMarker::new(&test_metadata, &test_master_edition, 1);

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
            &user.token_account,
        )
        .await
        .unwrap();

    test_pack_set
        .add_voucher(
            &mut context,
            &test_pack_voucher,
            &test_master_edition,
            &test_metadata,
            &user,
        )
        .await
        .unwrap();

    context.warp_to_slot(3).unwrap();

    let test_pack_voucher = TestPackVoucher::new(&test_pack_set, 1);
    let result = test_pack_set
        .add_voucher(
            &mut context,
            &test_pack_voucher,
            &test_master_edition,
            &test_metadata,
            &user,
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
