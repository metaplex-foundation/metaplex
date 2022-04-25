mod utils;

use mpl_nft_packs::{
    error::NFTPacksError,
    instruction,
    state::{AccountType, PackDistributionType, PackSetState},
};
use num_traits::FromPrimitive;
use solana_program::{clock::Clock, instruction::InstructionError};
use solana_program_test::*;
use solana_sdk::{
    signer::keypair::Keypair, transaction::TransactionError, transport::TransportError,
};
use utils::*;

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
            instruction::InitPackSetArgs {
                name,
                uri: uri.clone(),
                description: description.clone(),
                mutable: true,
                distribution_type: PackDistributionType::MaxSupply,
                allowed_amount_to_redeem: 10,
                redeem_start_date,
                redeem_end_date,
            },
        )
        .await
        .unwrap();

    let pack_set = test_pack_set.get_data(&mut context).await;

    assert_eq!(pack_set.name, name);
    assert_eq!(pack_set.uri.trim_matches(char::from(0)), uri);
    assert_eq!(
        pack_set.description.trim_matches(char::from(0)),
        description
    );
    assert_eq!(pack_set.account_type, AccountType::PackSet);
    assert!(pack_set.mutable);
    assert_eq!(pack_set.pack_state, PackSetState::NotActivated);
    assert_eq!(pack_set.pack_cards, 0);
    assert_eq!(pack_set.pack_vouchers, 0);
}

#[tokio::test]
async fn fail() {
    let mut context = nft_packs_program_test().start_with_context().await;

    let name = [7; 32];
    let uri = String::from("some link to storage");
    let description = String::from("Pack description");

    let clock = context.banks_client.get_sysvar::<Clock>().await.unwrap();

    let redeem_start_date = Some(clock.unix_timestamp as u64);

    let store_admin = Keypair::new();
    let store_key = create_store(&mut context, &store_admin, true)
        .await
        .unwrap();

    let test_pack_set = TestPackSet::new(store_key);
    let result = test_pack_set
        .init(
            &mut context,
            instruction::InitPackSetArgs {
                name,
                uri: uri.clone(),
                description: description.clone(),
                mutable: true,
                distribution_type: PackDistributionType::MaxSupply,
                allowed_amount_to_redeem: 10,
                redeem_start_date,
                redeem_end_date: redeem_start_date,
            },
        )
        .await;

    assert_custom_error!(result.unwrap_err(), NFTPacksError::WrongRedeemDate, 1);
}
