mod utils;

use metaplex_nft_packs::{
    error::NFTPacksError,
    instruction::{AddVoucherToPackArgs, InitPackSetArgs},
    state::{AccountType, ActionOnProve, PackDistributionType},
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
                uri: String::from("some link to storage"),
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

    test_pack_set
        .add_voucher(
            &mut context,
            &test_pack_voucher,
            &test_master_edition,
            &test_metadata,
            &user,
            AddVoucherToPackArgs {
                number_to_open: 4,
                action_on_prove: ActionOnProve::Burn,
            },
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

    test_pack_set
        .add_voucher(
            &mut context,
            &test_pack_voucher,
            &test_master_edition,
            &test_metadata,
            &user,
            AddVoucherToPackArgs {
                number_to_open: 4,
                action_on_prove: ActionOnProve::Burn,
            },
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
            AddVoucherToPackArgs {
                number_to_open: 4,
                action_on_prove: ActionOnProve::Burn,
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
async fn fail_wrong_number_to_open() {
    let (mut context, test_pack_set, test_metadata, test_master_edition, user) = setup().await;
    let test_pack_voucher = TestPackVoucher::new(&test_pack_set, 1);

    let result = test_pack_set
        .add_voucher(
            &mut context,
            &test_pack_voucher,
            &test_master_edition,
            &test_metadata,
            &user,
            AddVoucherToPackArgs {
                number_to_open: 20,
                action_on_prove: ActionOnProve::Burn,
            },
        )
        .await;

    assert_custom_error!(result.unwrap_err(), NFTPacksError::WrongNumberToOpen, 1);
}
