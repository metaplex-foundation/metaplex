mod utils;

use metaplex_nft_packs::{
    instruction::{AddVoucherToPackArgs, InitPackSetArgs},
    state::ActionOnProve,
};
use solana_program_test::*;
use solana_sdk::{signature::Keypair, signer::Signer};
use utils::*;

async fn setup() -> (
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
                total_packs: 5,
                mutable: true,
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
        test_pack_voucher,
        test_metadata,
        test_master_edition,
        user,
    )
}

#[tokio::test]
async fn success() {
    let (mut context, test_pack_set, test_pack_voucher, test_metadata, _test_master_edition, user) =
        setup().await;

    let new_token_owner_acc = Keypair::new();
    create_token_account(
        &mut context,
        &new_token_owner_acc,
        &test_metadata.mint.pubkey(),
        &test_pack_set.authority.pubkey(),
    )
    .await
    .unwrap();

    let pack_set = test_pack_set.get_data(&mut context).await;
    assert_eq!(pack_set.pack_vouchers, 1);

    test_pack_set
        .delete_voucher(
            &mut context,
            &test_pack_voucher,
            &user.pubkey(),
            &new_token_owner_acc.pubkey(),
        )
        .await
        .unwrap();

    let pack_set = test_pack_set.get_data(&mut context).await;
    assert_eq!(pack_set.pack_vouchers, 0);
}
