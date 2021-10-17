mod utils;

use metaplex_nft_packs::{
    error::NFTPacksError,
    instruction::{AddVoucherToPackArgs, InitPackSetArgs},
    state::{ActionOnProve, PackDistributionType},
};
use num_traits::FromPrimitive;
use solana_program::instruction::InstructionError;
use solana_program_test::*;
use solana_sdk::{
    signature::Keypair, signer::Signer, transaction::TransactionError, transport::TransportError,
};
use utils::*;

async fn setup(
    mutable: bool,
) -> (
    ProgramTestContext,
    TestPackSet,
    TestPackVoucher,
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
                mutable,
                distribution_type: PackDistributionType::Fixed,
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

    // Add pack card
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

    (
        context,
        test_pack_set,
        test_pack_voucher,
        test_metadata,
        test_master_edition,
        user,
    )
}

#[tokio::test]
async fn success() {
    let (mut context, test_pack_set, test_pack_voucher, _test_metadata, test_master_edition, _user) =
        setup(true).await;

    assert_eq!(
        test_pack_voucher
            .get_data(&mut context)
            .await
            .number_to_open,
        4
    );

    test_pack_set
        .edit_voucher(
            &mut context,
            &test_pack_voucher,
            &test_master_edition.pubkey,
            None,
            Some(2),
        )
        .await
        .unwrap();

    assert_eq!(
        test_pack_voucher
            .get_data(&mut context)
            .await
            .number_to_open,
        2
    );
}

#[tokio::test]
async fn fail_immutable() {
    let (mut context, test_pack_set, test_pack_voucher, _test_metadata, test_master_edition, _user) =
        setup(false).await;

    let result = test_pack_set
        .edit_voucher(
            &mut context,
            &test_pack_voucher,
            &test_master_edition.pubkey,
            None,
            Some(2),
        )
        .await;

    assert_custom_error!(result.unwrap_err(), NFTPacksError::ImmutablePackSet, 0);
}
