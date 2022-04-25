#![cfg(feature = "test-bpf")]
pub mod utils;
use anchor_lang::AccountDeserialize;

use mpl_auction_house::{pda::*, AuctionHouse};
use mpl_testing_utils::{
    assert_error,
    solana::{airdrop, create_associated_token_account, create_mint},
};
use solana_program_test::*;
use solana_sdk::{
    instruction::InstructionError, signature::Keypair, signer::Signer,
    transaction::TransactionError, transport::TransportError,
};
use spl_token;
use std::assert_eq;
use utils::setup_functions;
#[tokio::test]
async fn init_native_success() {
    let mut context = setup_functions::auction_house_program_test()
        .start_with_context()
        .await;
    // Payer Wallet
    let payer_wallet = Keypair::new();

    airdrop(&mut context, &payer_wallet.pubkey(), 10_000_000_000)
        .await
        .unwrap();
    let twd_key = payer_wallet.pubkey();
    let fwd_key = payer_wallet.pubkey();
    let t_mint_key = spl_token::native_mint::id();
    let tdw_ata = twd_key;
    let seller_fee_basis_points: u16 = 100;
    let authority = Keypair::new();
    airdrop(&mut context, &authority.pubkey(), 10_000_000_000)
        .await
        .unwrap();
    // Derive Auction House Key
    let (auction_house_address, bump) =
        find_auction_house_address(&authority.pubkey(), &t_mint_key);
    let (auction_fee_account_key, fee_payer_bump) =
        find_auction_house_fee_account_address(&auction_house_address);
    // Derive Auction House Treasury Key
    let (auction_house_treasury_key, treasury_bump) =
        find_auction_house_treasury_address(&auction_house_address);
    let auction_house = setup_functions::create_auction_house(
        &mut context,
        &authority,
        &twd_key,
        &fwd_key,
        &t_mint_key,
        &tdw_ata,
        &auction_house_address,
        bump,
        &auction_fee_account_key,
        fee_payer_bump,
        &auction_house_treasury_key,
        treasury_bump,
        seller_fee_basis_points,
        false,
        false,
    );

    let auction_house_account = auction_house.await.unwrap();

    let auction_house_acc = context
        .banks_client
        .get_account(auction_house_account)
        .await
        .expect("account not found")
        .expect("account empty");

    let auction_house_data =
        AuctionHouse::try_deserialize(&mut auction_house_acc.data.as_ref()).unwrap();

    assert_eq!(
        auction_fee_account_key,
        auction_house_data.auction_house_fee_account
    );
    assert_eq!(
        auction_house_treasury_key,
        auction_house_data.auction_house_treasury
    );
    assert_eq!(tdw_ata, auction_house_data.treasury_withdrawal_destination);
    assert_eq!(fwd_key, auction_house_data.fee_withdrawal_destination);
    assert_eq!(t_mint_key, auction_house_data.treasury_mint);
    assert_eq!(authority.pubkey(), auction_house_data.authority);
    assert_eq!(authority.pubkey(), auction_house_data.creator);

    assert_eq!(bump, auction_house_data.bump);
    assert_eq!(treasury_bump, auction_house_data.treasury_bump);
    assert_eq!(fee_payer_bump, auction_house_data.fee_payer_bump);
    assert_eq!(
        seller_fee_basis_points,
        auction_house_data.seller_fee_basis_points
    );
    assert_eq!(false, auction_house_data.requires_sign_off);
    assert_eq!(false, auction_house_data.can_change_sale_price);
}

#[tokio::test]
async fn init_native_success_reinitialize_fail() {
    let mut context = setup_functions::auction_house_program_test()
        .start_with_context()
        .await;
    // Payer Wallet
    let payer_wallet = Keypair::new();

    airdrop(&mut context, &payer_wallet.pubkey(), 10_000_000_000)
        .await
        .unwrap();
    let twd_key = payer_wallet.pubkey();
    let fwd_key = payer_wallet.pubkey();
    let t_mint_key = spl_token::native_mint::id();
    let tdw_ata = twd_key;
    let seller_fee_basis_points: u16 = 100;
    let authority = Keypair::new();
    airdrop(&mut context, &authority.pubkey(), 10_000_000_000)
        .await
        .unwrap();
    // Derive Auction House Key
    let (auction_house_address, bump) =
        find_auction_house_address(&authority.pubkey(), &t_mint_key);
    let (auction_fee_account_key, fee_payer_bump) =
        find_auction_house_fee_account_address(&auction_house_address);
    // Derive Auction House Treasury Key
    let (auction_house_treasury_key, treasury_bump) =
        find_auction_house_treasury_address(&auction_house_address);
    setup_functions::create_auction_house(
        &mut context,
        &authority,
        &twd_key,
        &fwd_key,
        &t_mint_key,
        &tdw_ata,
        &auction_house_address,
        bump,
        &auction_fee_account_key,
        fee_payer_bump,
        &auction_house_treasury_key,
        treasury_bump,
        seller_fee_basis_points,
        false,
        false,
    )
    .await
    .unwrap();

    let malicious_wallet = Keypair::new();
    airdrop(&mut context, &malicious_wallet.pubkey(), 10_000_000_000)
        .await
        .unwrap();
    let hacked_twd_key = malicious_wallet.pubkey();
    let hacked_fwd_key = malicious_wallet.pubkey();
    let hacked_tdw_ata = twd_key;
    let seller_fee_basis_points: u16 = 100;
    // Derive Auction House Key

    let hacked_auction_house = setup_functions::create_auction_house(
        &mut context,
        &authority,
        &hacked_twd_key,
        &hacked_fwd_key,
        &t_mint_key,
        &hacked_tdw_ata,
        &auction_house_address,
        bump,
        &auction_fee_account_key,
        fee_payer_bump,
        &auction_house_treasury_key,
        treasury_bump,
        seller_fee_basis_points,
        false,
        false,
    )
    .await
    .unwrap_err();
    match hacked_auction_house {
        TransportError::TransactionError(TransactionError::InstructionError(
            0,
            InstructionError::Custom(0),
        )) => (),
        _ => assert!(false, "Expected custom error"),
    }
}

#[tokio::test]
async fn init_mint_success() {
    let mut context = setup_functions::auction_house_program_test()
        .start_with_context()
        .await;
    // Payer Wallet
    let payer_wallet = Keypair::new();
    airdrop(&mut context, &payer_wallet.pubkey(), 10_000_000_000)
        .await
        .unwrap();
    let mint_key = Keypair::new();
    create_mint(&mut context, &mint_key, &payer_wallet.pubkey(), None)
        .await
        .unwrap();
    let twd_key = payer_wallet.pubkey();
    let fwd_key = payer_wallet.pubkey();
    let t_mint_key = mint_key.pubkey();
    let tdw_ata = create_associated_token_account(&mut context, &payer_wallet, &t_mint_key)
        .await
        .unwrap();
    let seller_fee_basis_points: u16 = 100;
    let authority = Keypair::new();
    airdrop(&mut context, &authority.pubkey(), 10_000_000_000)
        .await
        .unwrap();
    // Derive Auction House Key
    let (auction_house_address, bump) =
        find_auction_house_address(&authority.pubkey(), &t_mint_key);
    let (auction_fee_account_key, fee_payer_bump) =
        find_auction_house_fee_account_address(&auction_house_address);
    // Derive Auction House Treasury Key
    let (auction_house_treasury_key, treasury_bump) =
        find_auction_house_treasury_address(&auction_house_address);
    let auction_house = setup_functions::create_auction_house(
        &mut context,
        &authority,
        &twd_key,
        &fwd_key,
        &t_mint_key,
        &tdw_ata,
        &auction_house_address,
        bump,
        &auction_fee_account_key,
        fee_payer_bump,
        &auction_house_treasury_key,
        treasury_bump,
        seller_fee_basis_points,
        false,
        false,
    );

    let auction_house_account = auction_house.await.unwrap();

    let auction_house_acc = context
        .banks_client
        .get_account(auction_house_account)
        .await
        .expect("account not found")
        .expect("account empty");

    let auction_house_data =
        AuctionHouse::try_deserialize(&mut auction_house_acc.data.as_ref()).unwrap();

    assert_eq!(
        auction_fee_account_key,
        auction_house_data.auction_house_fee_account
    );
    assert_eq!(
        auction_house_treasury_key,
        auction_house_data.auction_house_treasury
    );

    assert_eq!(tdw_ata, auction_house_data.treasury_withdrawal_destination);
    assert_eq!(fwd_key, auction_house_data.fee_withdrawal_destination);
    assert_eq!(t_mint_key, auction_house_data.treasury_mint);
    assert_eq!(authority.pubkey(), auction_house_data.authority);
    assert_eq!(authority.pubkey(), auction_house_data.creator);

    assert_eq!(bump, auction_house_data.bump);
    assert_eq!(treasury_bump, auction_house_data.treasury_bump);
    assert_eq!(fee_payer_bump, auction_house_data.fee_payer_bump);
    assert_eq!(
        seller_fee_basis_points,
        auction_house_data.seller_fee_basis_points
    );
    assert_eq!(false, auction_house_data.requires_sign_off);
    assert_eq!(false, auction_house_data.can_change_sale_price);
}

#[tokio::test]
async fn init_mint_failure() {
    let mut context = setup_functions::auction_house_program_test()
        .start_with_context()
        .await;
    // Payer Wallet
    let payer_wallet = Keypair::new();
    airdrop(&mut context, &payer_wallet.pubkey(), 10_000_000_000)
        .await
        .unwrap();
    let twd_key = payer_wallet.pubkey();
    let fwd_key = payer_wallet.pubkey();
    let t_mint_key = spl_token::native_mint::id();
    let tdw_ata = create_associated_token_account(&mut context, &payer_wallet, &t_mint_key)
        .await
        .unwrap();
    let seller_fee_basis_points: u16 = 100;
    let authority = Keypair::new();
    airdrop(&mut context, &authority.pubkey(), 10_000_000_000)
        .await
        .unwrap();
    // Derive Auction House Key
    let (auction_house_address, bump) =
        find_auction_house_address(&authority.pubkey(), &t_mint_key);
    let (auction_fee_account_key, fee_payer_bump) =
        find_auction_house_fee_account_address(&auction_house_address);
    // Derive Auction House Treasury Key
    let (auction_house_treasury_key, treasury_bump) =
        find_auction_house_treasury_address(&auction_house_address);
    let err = setup_functions::create_auction_house(
        &mut context,
        &authority,
        &twd_key,
        &fwd_key,
        &t_mint_key,
        &tdw_ata,
        &auction_house_address,
        bump,
        &auction_fee_account_key,
        fee_payer_bump,
        &auction_house_treasury_key,
        treasury_bump,
        seller_fee_basis_points,
        false,
        false,
    )
    .await
    .unwrap_err();
    println!("{:?}", err.to_string());
    assert_error!(err, 6000);
}
