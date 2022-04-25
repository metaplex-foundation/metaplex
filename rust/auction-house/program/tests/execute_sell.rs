#![cfg(feature = "test-bpf")]
pub mod utils;

use anchor_lang::{prelude::*, AccountDeserialize, InstructionData, ToAccountMetas};
use mpl_testing_utils::{solana::airdrop, utils::Metadata};
use solana_program_test::*;
use solana_sdk::signer::Signer;

use std::assert_eq;

use solana_program::{instruction::Instruction, system_program, sysvar};

use solana_program::program_pack::Pack;

use mpl_auction_house::{
    pda::{find_escrow_payment_address, find_program_as_signer_address, find_trade_state_address},
    receipt::{BidReceipt, ListingReceipt, PurchaseReceipt},
};
use solana_sdk::{signature::Keypair, transaction::Transaction};
use spl_associated_token_account::get_associated_token_address;
use spl_token::state::Account;
use utils::setup_functions::*;

#[tokio::test]
async fn execute_sale_success() {
    let mut context = auction_house_program_test().start_with_context().await;
    // Payer Wallet
    let (ah, ahkey, authority) = existing_auction_house_test_context(&mut context)
        .await
        .unwrap();
    let test_metadata = Metadata::new();
    airdrop(&mut context, &test_metadata.token.pubkey(), 10_000_000_000)
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
    let ((sell_acc, _), sell_tx) = sell(&mut context, &ahkey, &ah, &test_metadata, 100_000_000);
    context
        .banks_client
        .process_transaction(sell_tx)
        .await
        .unwrap();
    let buyer = Keypair::new();
    airdrop(&mut context, &buyer.pubkey(), 10_000_000_000)
        .await
        .unwrap();
    let ((bid_acc, _), buy_tx) = buy(
        &mut context,
        &ahkey,
        &ah,
        &test_metadata,
        &test_metadata.token.pubkey(),
        &buyer,
        100_000_000,
    );
    context
        .banks_client
        .process_transaction(buy_tx)
        .await
        .unwrap();
    let buyer_token_account =
        get_associated_token_address(&buyer.pubkey(), &test_metadata.mint.pubkey());

    let accounts = mpl_auction_house::accounts::ExecuteSale {
        buyer: buyer.pubkey(),
        seller: test_metadata.token.pubkey(),
        auction_house: ahkey,
        metadata: test_metadata.pubkey,
        token_account: sell_acc.token_account,
        authority: ah.authority,
        seller_trade_state: sell_acc.seller_trade_state,
        buyer_trade_state: bid_acc.buyer_trade_state,
        token_program: spl_token::id(),
        free_trade_state: sell_acc.free_seller_trade_state,
        seller_payment_receipt_account: test_metadata.token.pubkey(),
        buyer_receipt_token_account: buyer_token_account,
        escrow_payment_account: bid_acc.escrow_payment_account,
        token_mint: test_metadata.mint.pubkey(),
        auction_house_fee_account: ah.auction_house_fee_account,
        auction_house_treasury: ah.auction_house_treasury,
        treasury_mint: ah.treasury_mint,
        program_as_signer: sell_acc.program_as_signer,
        system_program: system_program::id(),
        ata_program: spl_associated_token_account::id(),
        rent: sysvar::rent::id(),
    }
    .to_account_metas(None);
    let (_, free_sts_bump) = find_trade_state_address(
        &test_metadata.token.pubkey(),
        &ahkey,
        &sell_acc.token_account,
        &ah.treasury_mint,
        &test_metadata.mint.pubkey(),
        0,
        1,
    );
    let (_, escrow_bump) = find_escrow_payment_address(&ahkey, &buyer.pubkey());
    let (_, pas_bump) = find_program_as_signer_address();

    let instruction = Instruction {
        program_id: mpl_auction_house::id(),
        data: mpl_auction_house::instruction::ExecuteSale {
            escrow_payment_bump: escrow_bump,
            _free_trade_state_bump: free_sts_bump,
            program_as_signer_bump: pas_bump,
            token_size: 1,
            buyer_price: 100_000_000,
        }
        .data(),
        accounts,
    };
    airdrop(&mut context, &ah.auction_house_fee_account, 10_000_000_000)
        .await
        .unwrap();

    let tx = Transaction::new_signed_with_payer(
        &[instruction],
        Some(&authority.pubkey()),
        &[&authority],
        context.last_blockhash,
    );
    let seller_before = context
        .banks_client
        .get_account(test_metadata.token.pubkey())
        .await
        .unwrap()
        .unwrap();
    let buyer_token_before = &context
        .banks_client
        .get_account(buyer_token_account)
        .await
        .unwrap();
    assert_eq!(buyer_token_before.is_none(), true);
    context.banks_client.process_transaction(tx).await.unwrap();

    let seller_after = context
        .banks_client
        .get_account(test_metadata.token.pubkey())
        .await
        .unwrap()
        .unwrap();
    let buyer_token_after = Account::unpack_from_slice(
        &context
            .banks_client
            .get_account(buyer_token_account)
            .await
            .unwrap()
            .unwrap()
            .data
            .as_slice(),
    )
    .unwrap();
    let fee_minus: u64 = 100_000_000 - ((ah.seller_fee_basis_points as u64 * 100_000_000) / 10000);
    assert_eq!(seller_before.lamports + fee_minus, seller_after.lamports);
    assert_eq!(seller_before.lamports < seller_after.lamports, true);
    assert_eq!(buyer_token_after.amount, 1);
}

#[tokio::test]
async fn execute_public_sale_success() {
    let mut context = auction_house_program_test().start_with_context().await;
    // Payer Wallet
    let (ah, ahkey, authority) = existing_auction_house_test_context(&mut context)
        .await
        .unwrap();
    let test_metadata = Metadata::new();
    airdrop(&mut context, &test_metadata.token.pubkey(), 10_000_000_000)
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
    let price = 100_000_000;
    let fee_minus: u64 = price - ((ah.seller_fee_basis_points as u64 * 100_000_000) / 10000);
    // Create Listing
    let ((sell_acc, _), sell_tx) = sell(&mut context, &ahkey, &ah, &test_metadata, price);
    context
        .banks_client
        .process_transaction(sell_tx)
        .await
        .unwrap();
    // Create Long Lasting Bid
    let public_bidder = Keypair::new();
    airdrop(&mut context, &public_bidder.pubkey(), 10_000_000_000)
        .await
        .unwrap();

    let ((public_bid_acc, _print_bid_receipt_acc), public_bid_tx) = public_buy(
        &mut context,
        &ahkey,
        &ah,
        &test_metadata,
        &test_metadata.token.pubkey(),
        &public_bidder,
        price,
    );
    context
        .banks_client
        .process_transaction(public_bid_tx)
        .await
        .unwrap();
    // Create first regular private bid
    let buyer = Keypair::new();
    airdrop(&mut context, &buyer.pubkey(), 10_000_000_000)
        .await
        .unwrap();
    let ((bid_acc, _), buy_tx) = buy(
        &mut context,
        &ahkey,
        &ah,
        &test_metadata,
        &test_metadata.token.pubkey(),
        &buyer,
        price,
    );
    context
        .banks_client
        .process_transaction(buy_tx)
        .await
        .unwrap();
    let buyer_token_account =
        get_associated_token_address(&buyer.pubkey(), &test_metadata.mint.pubkey());
    let ((_es_acc, _purchase_receipt_acc), first_sale_tx) = execute_sale(
        &mut context,
        &ahkey,
        &ah,
        &authority,
        &test_metadata,
        &buyer.pubkey(),
        &test_metadata.token.pubkey(),
        &sell_acc.token_account,
        &sell_acc.seller_trade_state,
        &bid_acc.buyer_trade_state,
        1,
        price,
    );
    airdrop(&mut context, &ah.auction_house_fee_account, 10_000_000_000)
        .await
        .unwrap();
    let seller_before = context
        .banks_client
        .get_account(test_metadata.token.pubkey())
        .await
        .unwrap()
        .unwrap();
    let buyer_token_before = &context
        .banks_client
        .get_account(buyer_token_account)
        .await
        .unwrap();
    assert_eq!(buyer_token_before.is_none(), true);
    context
        .banks_client
        .process_transaction(first_sale_tx)
        .await
        .unwrap();
    let seller_after = context
        .banks_client
        .get_account(test_metadata.token.pubkey())
        .await
        .unwrap()
        .unwrap();
    let buyer_token_after = Account::unpack_from_slice(
        &context
            .banks_client
            .get_account(buyer_token_account)
            .await
            .unwrap()
            .unwrap()
            .data
            .as_slice(),
    )
    .unwrap();

    assert_eq!(seller_before.lamports + fee_minus, seller_after.lamports);
    assert_eq!(seller_before.lamports < seller_after.lamports, true);
    assert_eq!(buyer_token_after.amount, 1);
    let new_seller = buyer;
    let public_bidder_token_account =
        get_associated_token_address(&public_bidder.pubkey(), &test_metadata.mint.pubkey());
    let new_seller_before = context
        .banks_client
        .get_account(new_seller.pubkey())
        .await
        .unwrap()
        .unwrap();
    let public_bidder_token_before = &context
        .banks_client
        .get_account(public_bidder_token_account)
        .await
        .unwrap();
    assert_eq!(public_bidder_token_before.is_none(), true);
    let ((second_sell_acc, _), second_sell_tx) = sell_mint(
        &mut context,
        &ahkey,
        &ah,
        &test_metadata.mint.pubkey(),
        &new_seller,
        price,
    );
    context
        .banks_client
        .process_transaction(second_sell_tx)
        .await
        .unwrap();

    let ((public_sale_acc, purchase_receipt_acc), public_sale_tx) = execute_sale(
        &mut context,
        &ahkey,
        &ah,
        &authority,
        &test_metadata,
        &public_bidder.pubkey(),
        &new_seller.pubkey(),
        &second_sell_acc.token_account,
        &second_sell_acc.seller_trade_state,
        &public_bid_acc.buyer_trade_state,
        1,
        price.to_owned(),
    );

    context
        .banks_client
        .process_transaction(public_sale_tx)
        .await
        .unwrap();

    let new_seller_after = context
        .banks_client
        .get_account(new_seller.pubkey())
        .await
        .unwrap()
        .unwrap();
    let public_bidder_token_after = Account::unpack_from_slice(
        &context
            .banks_client
            .get_account(public_bidder_token_account)
            .await
            .unwrap()
            .unwrap()
            .data
            .as_slice(),
    )
    .unwrap();
    assert_eq!(new_seller_before.lamports < new_seller_after.lamports, true);
    assert_eq!(public_bidder_token_after.amount, 1);

    let timestamp = context
        .banks_client
        .get_sysvar::<Clock>()
        .await
        .unwrap()
        .unix_timestamp;

    let purchase_receipt_account = context
        .banks_client
        .get_account(purchase_receipt_acc.purchase_receipt)
        .await
        .expect("no purchase receipt")
        .expect("purchase receipt empty");

    let purchase_receipt =
        PurchaseReceipt::try_deserialize(&mut purchase_receipt_account.data.as_ref()).unwrap();

    assert_eq!(purchase_receipt.buyer, public_bidder.pubkey());
    assert_eq!(purchase_receipt.seller, new_seller.pubkey());
    assert_eq!(purchase_receipt.bookkeeper, authority.pubkey());
    assert_eq!(purchase_receipt.price, price);
    assert_eq!(purchase_receipt.created_at, timestamp);
    assert_eq!(purchase_receipt.metadata, public_sale_acc.metadata);
    assert_eq!(
        purchase_receipt.auction_house,
        public_sale_acc.auction_house
    );

    let bid_receipt_account = context
        .banks_client
        .get_account(purchase_receipt_acc.bid_receipt)
        .await
        .expect("no bid receipt")
        .expect("bid receipt empty");

    let bid_receipt = BidReceipt::try_deserialize(&mut bid_receipt_account.data.as_ref()).unwrap();

    assert_eq!(
        bid_receipt.purchase_receipt,
        Some(purchase_receipt_acc.purchase_receipt)
    );
    assert_eq!(bid_receipt.canceled_at, None);
    assert_eq!(bid_receipt.token_account, None);

    let listing_receipt_account = context
        .banks_client
        .get_account(purchase_receipt_acc.listing_receipt)
        .await
        .expect("no listing receipt")
        .expect("listing receipt empty");

    let listing_receipt =
        ListingReceipt::try_deserialize(&mut listing_receipt_account.data.as_ref()).unwrap();

    assert_eq!(
        listing_receipt.purchase_receipt,
        Some(purchase_receipt_acc.purchase_receipt)
    );
    assert_eq!(listing_receipt.canceled_at, None);

    ()
}
