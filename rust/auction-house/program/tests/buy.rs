#![cfg(feature = "test-bpf")]
pub mod utils;

use anchor_lang::AccountDeserialize;
use mpl_auction_house::receipt::BidReceipt;
use mpl_testing_utils::{solana::airdrop, utils::Metadata};
use solana_program_test::*;
use solana_sdk::{signature::Keypair, signer::Signer};
use std::assert_eq;
use utils::setup_functions::*;

#[tokio::test]
async fn buy_success() {
    let mut context = auction_house_program_test().start_with_context().await;
    // Payer Wallet
    let (ah, ahkey, _) = existing_auction_house_test_context(&mut context)
        .await
        .unwrap();
    let test_metadata = Metadata::new();

    airdrop(&mut context, &test_metadata.token.pubkey(), 1000000000)
        .await
        .unwrap();
    test_metadata
        .create(
            &mut context,
            "Test".to_string(),
            "TST".to_string(),
            "uri".to_string(),
            None,
            10,
            false,
        )
        .await
        .unwrap();
    let buyer = Keypair::new();
    airdrop(&mut context, &buyer.pubkey(), 10000000000)
        .await
        .unwrap();
    let (_, deposit_tx) = deposit(
        &mut context,
        &ahkey,
        &ah,
        &test_metadata,
        &buyer,
        1000000000,
    );
    context
        .banks_client
        .process_transaction(deposit_tx)
        .await
        .unwrap();
    let ((acc, print_bid_acc), buy_tx) = buy(
        &mut context,
        &ahkey,
        &ah,
        &test_metadata,
        &test_metadata.token.pubkey(),
        &buyer,
        1000000000,
    );
    context
        .banks_client
        .process_transaction(buy_tx)
        .await
        .unwrap();
    let bts = context
        .banks_client
        .get_account(acc.buyer_trade_state)
        .await
        .expect("Error Getting Trade State")
        .expect("Trade State Empty");
    assert_eq!(bts.data.len(), 1);

    let bid_receipt_account = context
        .banks_client
        .get_account(print_bid_acc.receipt)
        .await
        .expect("Error Getting Public Bid Receipt")
        .expect("Public Bid Empty");

    let bid_receipt = BidReceipt::try_deserialize(&mut bid_receipt_account.data.as_ref()).unwrap();

    assert_eq!(bid_receipt.price, 1000000000);
    assert_eq!(bid_receipt.auction_house, acc.auction_house);
    assert_eq!(bid_receipt.metadata, acc.metadata);
    assert_eq!(bid_receipt.token_account, Some(acc.token_account));
    assert_eq!(bid_receipt.buyer, acc.wallet);
    assert_eq!(bid_receipt.trade_state, acc.buyer_trade_state);
    assert_eq!(bid_receipt.token_size, 1);
    assert_eq!(bid_receipt.purchase_receipt, None);
    assert_eq!(bid_receipt.bookkeeper, buyer.pubkey());
}
