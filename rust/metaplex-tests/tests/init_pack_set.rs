mod utils;

use metaplex_nft_packs::{
    error::NFTPacksError,
    instruction,
    state::{AccountType, PackDistributionType, PackSetState},
};
use num_traits::FromPrimitive;
use solana_program::instruction::InstructionError;
use solana_program_test::*;
use solana_sdk::{transaction::TransactionError, transport::TransportError};
use utils::*;

#[tokio::test]
async fn success() {
    let mut context = nft_packs_program_test().start_with_context().await;

    let name = [7; 32];
    let uri = String::from("some link to storage");

    let clock = context.banks_client.get_clock().await.unwrap();

    let redeem_start_date = Some(clock.unix_timestamp as u64);
    let redeem_end_date = Some(redeem_start_date.unwrap() + 100);

    let test_pack_set = TestPackSet::new();
    test_pack_set
        .init(
            &mut context,
            instruction::InitPackSetArgs {
                name,
                uri: uri.clone(),
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
    assert_eq!(pack_set.uri, uri);
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

    let clock = context.banks_client.get_clock().await.unwrap();

    let redeem_start_date = Some(clock.unix_timestamp as u64);

    let test_pack_set = TestPackSet::new();
    let result = test_pack_set
        .init(
            &mut context,
            instruction::InitPackSetArgs {
                name,
                uri: uri.clone(),
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
