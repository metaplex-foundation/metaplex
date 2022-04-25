mod utils;

use mpl_nft_packs::{
    error::NFTPacksError, instruction::InitPackSetArgs, state::PackDistributionType,
};
use num_traits::FromPrimitive;
use solana_program::{clock::Clock, instruction::InstructionError};
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
    TestMetadata,
    TestMasterEditionV2,
    User,
) {
    let mut context = nft_packs_program_test().start_with_context().await;

    let name = [7; 32];
    let uri = String::from("some link to storage");
    let description = String::from("Pack description");

    let clock = context.banks_client.get_sysvar::<Clock>().await.unwrap();

    let redeem_start_date = Some(clock.unix_timestamp as u64);
    let redeem_end_date = None;

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
                mutable,
                distribution_type: PackDistributionType::Fixed,
                allowed_amount_to_redeem: 10,
                redeem_start_date,
                redeem_end_date,
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
    let (mut context, test_pack_set, _test_metadata, _test_master_edition, _user) =
        setup(true).await;

    assert_eq!(test_pack_set.get_data(&mut context).await.name, [7; 32]);

    test_pack_set
        .edit(&mut context, None, Some([8; 32]), None, None)
        .await
        .unwrap();

    assert_eq!(test_pack_set.get_data(&mut context).await.name, [8; 32]);
}

#[tokio::test]
async fn fail_immutable() {
    let (mut context, test_pack_set, _test_metadata, _test_master_edition, _user) =
        setup(false).await;

    let result = test_pack_set
        .edit(&mut context, None, Some([8; 32]), None, None)
        .await;

    assert_custom_error!(result.unwrap_err(), NFTPacksError::ImmutablePackSet, 0);
}
