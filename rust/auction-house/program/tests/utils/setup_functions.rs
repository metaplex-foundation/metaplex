use std::io;

use anchor_client::solana_sdk::{
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    system_program, sysvar,
};
use anchor_lang::*;
use mpl_auction_house::{
    pda::{
        find_auction_house_address, find_auction_house_fee_account_address,
        find_auction_house_treasury_address, find_bid_receipt_address, find_escrow_payment_address,
        find_listing_receipt_address, find_program_as_signer_address,
        find_public_bid_trade_state_address, find_purchase_receipt_address,
        find_trade_state_address,
    },
    AuctionHouse,
};
use mpl_testing_utils::{solana::airdrop, utils::Metadata};

use mpl_token_metadata::pda::find_metadata_account;
use solana_program_test::*;
use solana_sdk::{instruction::Instruction, transaction::Transaction, transport::TransportError};
use spl_associated_token_account::get_associated_token_address;

pub fn auction_house_program_test<'a>() -> ProgramTest {
    let mut program = ProgramTest::new("mpl_auction_house", mpl_auction_house::id(), None);
    program.add_program("mpl_token_metadata", mpl_token_metadata::id(), None);
    program
}

pub async fn create_auction_house(
    context: &mut ProgramTestContext,
    payer_wallet: &Keypair,
    twd_key: &Pubkey,
    fwd_key: &Pubkey,
    t_mint_key: &Pubkey,
    tdw_ata: &Pubkey,
    auction_house_key: &Pubkey,
    auction_house_key_bump: u8,
    auction_fee_account_key: &Pubkey,
    auction_fee_account_key_bump: u8,
    auction_house_treasury_key: &Pubkey,
    auction_house_treasury_key_bump: u8,
    seller_fee_basis_points: u16,
    requires_sign_off: bool,
    can_change_sale_price: bool,
) -> std::result::Result<Pubkey, TransportError> {
    let accounts = mpl_auction_house::accounts::CreateAuctionHouse {
        treasury_mint: *t_mint_key,
        payer: payer_wallet.pubkey(),
        authority: payer_wallet.pubkey(),
        fee_withdrawal_destination: *fwd_key,
        treasury_withdrawal_destination: *tdw_ata,
        treasury_withdrawal_destination_owner: *twd_key,
        auction_house: *auction_house_key,
        auction_house_fee_account: *auction_fee_account_key,
        auction_house_treasury: *auction_house_treasury_key,
        token_program: spl_token::id(),
        system_program: system_program::id(),
        ata_program: spl_associated_token_account::id(),
        rent: sysvar::rent::id(),
    }
    .to_account_metas(None);

    let data = mpl_auction_house::instruction::CreateAuctionHouse {
        _bump: auction_house_key_bump,
        fee_payer_bump: auction_fee_account_key_bump,
        treasury_bump: auction_house_treasury_key_bump,
        seller_fee_basis_points,
        requires_sign_off,
        can_change_sale_price,
    }
    .data();

    let instruction = Instruction {
        program_id: mpl_auction_house::id(),
        data,
        accounts,
    };

    let tx = Transaction::new_signed_with_payer(
        &[instruction],
        Some(&payer_wallet.pubkey()),
        &[payer_wallet],
        context.last_blockhash,
    );

    context
        .banks_client
        .process_transaction(tx)
        .await
        .map(|_| auction_house_key.clone())
}

pub fn deposit(
    context: &mut ProgramTestContext,
    ahkey: &Pubkey,
    ah: &AuctionHouse,
    test_metadata: &Metadata,
    buyer: &Keypair,
    sale_price: u64,
) -> (mpl_auction_house::accounts::Deposit, Transaction) {
    let seller_token_account =
        get_associated_token_address(&test_metadata.token.pubkey(), &test_metadata.mint.pubkey());
    let (_buyer_trade_state, _sts_bump) = find_trade_state_address(
        &buyer.pubkey(),
        &ahkey,
        &seller_token_account,
        &ah.treasury_mint,
        &test_metadata.mint.pubkey(),
        sale_price,
        1,
    );
    let (escrow, escrow_bump) = find_escrow_payment_address(&ahkey, &buyer.pubkey());
    let accounts = mpl_auction_house::accounts::Deposit {
        wallet: buyer.pubkey(),
        authority: ah.authority,
        auction_house: *ahkey,
        auction_house_fee_account: ah.auction_house_fee_account,
        token_program: spl_token::id(),
        treasury_mint: ah.treasury_mint,
        payment_account: buyer.pubkey(),
        transfer_authority: buyer.pubkey(),
        system_program: solana_program::system_program::id(),
        rent: sysvar::rent::id(),
        escrow_payment_account: escrow,
    };
    let account_metas = accounts.to_account_metas(None);

    let data = mpl_auction_house::instruction::Deposit {
        amount: sale_price,
        escrow_payment_bump: escrow_bump,
    }
    .data();

    let instruction = Instruction {
        program_id: mpl_auction_house::id(),
        data,
        accounts: account_metas,
    };

    (
        accounts,
        Transaction::new_signed_with_payer(
            &[instruction],
            Some(&buyer.pubkey()),
            &[buyer],
            context.last_blockhash,
        ),
    )
}

pub fn buy(
    context: &mut ProgramTestContext,
    ahkey: &Pubkey,
    ah: &AuctionHouse,
    test_metadata: &Metadata,
    owner: &Pubkey,
    buyer: &Keypair,
    sale_price: u64,
) -> (
    (
        mpl_auction_house::accounts::Buy,
        mpl_auction_house::accounts::PrintBidReceipt,
    ),
    Transaction,
) {
    let seller_token_account = get_associated_token_address(&owner, &test_metadata.mint.pubkey());
    let trade_state = find_trade_state_address(
        &buyer.pubkey(),
        &ahkey,
        &seller_token_account,
        &ah.treasury_mint,
        &test_metadata.mint.pubkey(),
        sale_price,
        1,
    );
    let (escrow, escrow_bump) = find_escrow_payment_address(&ahkey, &buyer.pubkey());
    let (bts, bts_bump) = trade_state;
    let accounts = mpl_auction_house::accounts::Buy {
        wallet: buyer.pubkey(),
        token_account: seller_token_account,
        metadata: test_metadata.pubkey,
        authority: ah.authority,
        auction_house: *ahkey,
        auction_house_fee_account: ah.auction_house_fee_account,
        buyer_trade_state: bts,
        token_program: spl_token::id(),
        treasury_mint: ah.treasury_mint,
        payment_account: buyer.pubkey(),
        transfer_authority: buyer.pubkey(),
        system_program: solana_program::system_program::id(),
        rent: sysvar::rent::id(),
        escrow_payment_account: escrow,
    };

    let account_metas = accounts.to_account_metas(None);

    let buy_ix = mpl_auction_house::instruction::Buy {
        trade_state_bump: bts_bump,
        escrow_payment_bump: escrow_bump,
        token_size: 1,
        buyer_price: sale_price,
    };
    let data = buy_ix.data();

    let instruction = Instruction {
        program_id: mpl_auction_house::id(),
        data,
        accounts: account_metas,
    };

    let (bid_receipt, bid_receipt_bump) = find_bid_receipt_address(&bts);
    let print_receipt_accounts = mpl_auction_house::accounts::PrintBidReceipt {
        receipt: bid_receipt,
        bookkeeper: buyer.pubkey(),
        system_program: solana_program::system_program::id(),
        rent: sysvar::rent::id(),
        instruction: sysvar::instructions::id(),
    };

    let account_metas = print_receipt_accounts.to_account_metas(None);

    let print_bid_receipt_ix = mpl_auction_house::instruction::PrintBidReceipt {
        receipt_bump: bid_receipt_bump,
    };
    let data = print_bid_receipt_ix.data();

    let print_bid_receipt_instruction = Instruction {
        program_id: mpl_auction_house::id(),
        data,
        accounts: account_metas,
    };

    (
        (accounts, print_receipt_accounts),
        Transaction::new_signed_with_payer(
            &[instruction, print_bid_receipt_instruction],
            Some(&buyer.pubkey()),
            &[buyer],
            context.last_blockhash,
        ),
    )
}

pub fn public_buy(
    context: &mut ProgramTestContext,
    ahkey: &Pubkey,
    ah: &AuctionHouse,
    test_metadata: &Metadata,
    owner: &Pubkey,
    buyer: &Keypair,
    sale_price: u64,
) -> (
    (
        mpl_auction_house::accounts::PublicBuy,
        mpl_auction_house::accounts::PrintBidReceipt,
    ),
    Transaction,
) {
    let seller_token_account = get_associated_token_address(&owner, &test_metadata.mint.pubkey());
    let trade_state = find_public_bid_trade_state_address(
        &buyer.pubkey(),
        &ahkey,
        &ah.treasury_mint,
        &test_metadata.mint.pubkey(),
        sale_price,
        1,
    );
    let (escrow, escrow_bump) = find_escrow_payment_address(&ahkey, &buyer.pubkey());
    let (bts, bts_bump) = trade_state;

    let accounts = mpl_auction_house::accounts::PublicBuy {
        wallet: buyer.pubkey(),
        token_account: seller_token_account,
        metadata: test_metadata.pubkey,
        authority: ah.authority,
        auction_house: *ahkey,
        auction_house_fee_account: ah.auction_house_fee_account,
        buyer_trade_state: bts,
        token_program: spl_token::id(),
        treasury_mint: ah.treasury_mint,
        payment_account: buyer.pubkey(),
        transfer_authority: buyer.pubkey(),
        system_program: solana_program::system_program::id(),
        rent: sysvar::rent::id(),
        escrow_payment_account: escrow,
    };
    let account_metas = accounts.to_account_metas(None);

    let buy_ix = mpl_auction_house::instruction::PublicBuy {
        trade_state_bump: bts_bump,
        escrow_payment_bump: escrow_bump,
        token_size: 1,
        buyer_price: sale_price,
    };
    let data = buy_ix.data();

    let instruction = Instruction {
        program_id: mpl_auction_house::id(),
        data,
        accounts: account_metas,
    };

    let (bid_receipt, bid_receipt_bump) = find_bid_receipt_address(&bts);
    let print_receipt_accounts = mpl_auction_house::accounts::PrintBidReceipt {
        receipt: bid_receipt,
        bookkeeper: buyer.pubkey(),
        system_program: solana_program::system_program::id(),
        rent: sysvar::rent::id(),
        instruction: sysvar::instructions::id(),
    };

    let account_metas = print_receipt_accounts.to_account_metas(None);

    let print_bid_receipt_ix = mpl_auction_house::instruction::PrintBidReceipt {
        receipt_bump: bid_receipt_bump,
    };
    let data = print_bid_receipt_ix.data();

    let print_bid_receipt_instruction = Instruction {
        program_id: mpl_auction_house::id(),
        data,
        accounts: account_metas,
    };

    (
        (accounts, print_receipt_accounts),
        Transaction::new_signed_with_payer(
            &[instruction, print_bid_receipt_instruction],
            Some(&buyer.pubkey()),
            &[buyer],
            context.last_blockhash,
        ),
    )
}

pub fn execute_sale(
    context: &mut ProgramTestContext,
    ahkey: &Pubkey,
    ah: &AuctionHouse,
    authority: &Keypair,
    test_metadata: &Metadata,
    buyer: &Pubkey,
    seller: &Pubkey,
    token_account: &Pubkey,
    seller_trade_state: &Pubkey,
    buyer_trade_state: &Pubkey,
    token_size: u64,
    buyer_price: u64,
) -> (
    (
        mpl_auction_house::accounts::ExecuteSale,
        mpl_auction_house::accounts::PrintPurchaseReceipt,
    ),
    Transaction,
) {
    let program_id = mpl_auction_house::id();
    let buyer_token_account = get_associated_token_address(&buyer, &test_metadata.mint.pubkey());

    let (program_as_signer, pas_bump) = find_program_as_signer_address();

    let (free_trade_state, free_sts_bump) = find_trade_state_address(
        &seller,
        &ahkey,
        &token_account,
        &ah.treasury_mint,
        &test_metadata.mint.pubkey(),
        0,
        token_size,
    );
    let (escrow_payment_account, escrow_bump) = find_escrow_payment_address(&ahkey, &buyer);
    let (purchase_receipt, purchase_receipt_bump) =
        find_purchase_receipt_address(seller_trade_state, buyer_trade_state);
    let (listing_receipt, _listing_receipt_bump) = find_listing_receipt_address(seller_trade_state);
    let (bid_receipt, _public_bid_receipt_bump) = find_bid_receipt_address(buyer_trade_state);
    let execute_sale_accounts = mpl_auction_house::accounts::ExecuteSale {
        buyer: *buyer,
        seller: *seller,
        auction_house: *ahkey,
        token_account: *token_account,
        token_mint: test_metadata.mint.pubkey(),
        treasury_mint: ah.treasury_mint,
        metadata: test_metadata.pubkey,
        authority: ah.authority,
        seller_trade_state: *seller_trade_state,
        buyer_trade_state: *buyer_trade_state,
        free_trade_state: free_trade_state,
        seller_payment_receipt_account: *seller,
        buyer_receipt_token_account: buyer_token_account,
        escrow_payment_account: escrow_payment_account,
        auction_house_fee_account: ah.auction_house_fee_account,
        auction_house_treasury: ah.auction_house_treasury,
        program_as_signer: program_as_signer,
        token_program: spl_token::id(),
        system_program: system_program::id(),
        ata_program: spl_associated_token_account::id(),
        rent: sysvar::rent::id(),
    };

    let execute_sale_account_metas = execute_sale_accounts.to_account_metas(None);

    let execute_sale_instruction = Instruction {
        program_id,
        data: mpl_auction_house::instruction::ExecuteSale {
            escrow_payment_bump: escrow_bump,
            _free_trade_state_bump: free_sts_bump,
            program_as_signer_bump: pas_bump,
            token_size,
            buyer_price,
        }
        .data(),
        accounts: execute_sale_account_metas,
    };

    let print_purchase_receipt_accounts = mpl_auction_house::accounts::PrintPurchaseReceipt {
        purchase_receipt,
        listing_receipt,
        bid_receipt,
        bookkeeper: authority.pubkey(),
        system_program: system_program::id(),
        rent: sysvar::rent::id(),
        instruction: sysvar::instructions::id(),
    };

    let print_purchase_receipt_instruction = Instruction {
        program_id,
        data: mpl_auction_house::instruction::PrintPurchaseReceipt {
            purchase_receipt_bump,
        }
        .data(),
        accounts: print_purchase_receipt_accounts.to_account_metas(None),
    };

    let tx = Transaction::new_signed_with_payer(
        &[execute_sale_instruction, print_purchase_receipt_instruction],
        Some(&authority.pubkey()),
        &[authority],
        context.last_blockhash,
    );

    ((execute_sale_accounts, print_purchase_receipt_accounts), tx)
}

pub fn sell_mint(
    context: &mut ProgramTestContext,
    ahkey: &Pubkey,
    ah: &AuctionHouse,
    test_metadata_mint: &Pubkey,
    seller: &Keypair,
    sale_price: u64,
) -> (
    (
        mpl_auction_house::accounts::Sell,
        mpl_auction_house::accounts::PrintListingReceipt,
    ),
    Transaction,
) {
    let token = get_associated_token_address(&seller.pubkey(), &test_metadata_mint);
    let (metadata, _) = find_metadata_account(test_metadata_mint);
    let (seller_trade_state, sts_bump) = find_trade_state_address(
        &seller.pubkey(),
        &ahkey,
        &token,
        &ah.treasury_mint,
        &test_metadata_mint,
        sale_price,
        1,
    );
    let (free_seller_trade_state, free_sts_bump) = find_trade_state_address(
        &seller.pubkey(),
        &ahkey,
        &token,
        &ah.treasury_mint,
        &test_metadata_mint,
        0,
        1,
    );
    let (pas, pas_bump) = find_program_as_signer_address();
    let (listing_receipt, receipt_bump) = find_listing_receipt_address(&seller_trade_state);

    let accounts = mpl_auction_house::accounts::Sell {
        wallet: seller.pubkey(),
        token_account: token,
        metadata,
        authority: ah.authority,
        auction_house: *ahkey,
        auction_house_fee_account: ah.auction_house_fee_account,
        seller_trade_state,
        free_seller_trade_state,
        token_program: spl_token::id(),
        system_program: solana_program::system_program::id(),
        program_as_signer: pas,
        rent: sysvar::rent::id(),
    };
    let account_metas = accounts.to_account_metas(None);

    let data = mpl_auction_house::instruction::Sell {
        trade_state_bump: sts_bump,
        _free_trade_state_bump: free_sts_bump,
        _program_as_signer_bump: pas_bump,
        token_size: 1,
        buyer_price: sale_price,
    }
    .data();

    let instruction = Instruction {
        program_id: mpl_auction_house::id(),
        data,
        accounts: account_metas,
    };

    let listing_receipt_accounts = mpl_auction_house::accounts::PrintListingReceipt {
        receipt: listing_receipt,
        bookkeeper: seller.pubkey(),
        system_program: system_program::id(),
        rent: sysvar::rent::id(),
        instruction: sysvar::instructions::id(),
    };

    let print_receipt_instruction = Instruction {
        program_id: mpl_auction_house::id(),
        data: mpl_auction_house::instruction::PrintListingReceipt { receipt_bump }.data(),
        accounts: listing_receipt_accounts.to_account_metas(None),
    };

    (
        (accounts, listing_receipt_accounts),
        Transaction::new_signed_with_payer(
            &[instruction, print_receipt_instruction],
            Some(&seller.pubkey()),
            &[seller],
            context.last_blockhash,
        ),
    )
}

pub fn sell(
    context: &mut ProgramTestContext,
    ahkey: &Pubkey,
    ah: &AuctionHouse,
    test_metadata: &Metadata,
    sale_price: u64,
) -> (
    (
        mpl_auction_house::accounts::Sell,
        mpl_auction_house::accounts::PrintListingReceipt,
    ),
    Transaction,
) {
    let program_id = mpl_auction_house::id();
    let token =
        get_associated_token_address(&test_metadata.token.pubkey(), &test_metadata.mint.pubkey());
    let (seller_trade_state, sts_bump) = find_trade_state_address(
        &test_metadata.token.pubkey(),
        &ahkey,
        &token,
        &ah.treasury_mint,
        &test_metadata.mint.pubkey(),
        sale_price,
        1,
    );
    let (listing_receipt, receipt_bump) = find_listing_receipt_address(&seller_trade_state);

    let (free_seller_trade_state, free_sts_bump) = find_trade_state_address(
        &test_metadata.token.pubkey(),
        &ahkey,
        &token,
        &ah.treasury_mint,
        &test_metadata.mint.pubkey(),
        0,
        1,
    );
    let (pas, pas_bump) = find_program_as_signer_address();

    let accounts = mpl_auction_house::accounts::Sell {
        wallet: test_metadata.token.pubkey(),
        token_account: token,
        metadata: test_metadata.pubkey,
        authority: ah.authority,
        auction_house: *ahkey,
        auction_house_fee_account: ah.auction_house_fee_account,
        seller_trade_state,
        free_seller_trade_state,
        token_program: spl_token::id(),
        system_program: solana_program::system_program::id(),
        program_as_signer: pas,
        rent: sysvar::rent::id(),
    };
    let account_metas = accounts.to_account_metas(None);

    let data = mpl_auction_house::instruction::Sell {
        trade_state_bump: sts_bump,
        _free_trade_state_bump: free_sts_bump,
        _program_as_signer_bump: pas_bump,
        token_size: 1,
        buyer_price: sale_price,
    }
    .data();

    let instruction = Instruction {
        program_id,
        data,
        accounts: account_metas,
    };

    let listing_receipt_accounts = mpl_auction_house::accounts::PrintListingReceipt {
        receipt: listing_receipt,
        bookkeeper: test_metadata.token.pubkey(),
        system_program: system_program::id(),
        rent: sysvar::rent::id(),
        instruction: sysvar::instructions::id(),
    };

    let print_receipt_instruction = Instruction {
        program_id,
        data: mpl_auction_house::instruction::PrintListingReceipt { receipt_bump }.data(),
        accounts: listing_receipt_accounts.to_account_metas(None),
    };

    (
        (accounts, listing_receipt_accounts),
        Transaction::new_signed_with_payer(
            &[instruction, print_receipt_instruction],
            Some(&test_metadata.token.pubkey()),
            &[&test_metadata.token],
            context.last_blockhash,
        ),
    )
}

pub async fn existing_auction_house_test_context(
    context: &mut ProgramTestContext,
) -> std::result::Result<(AuctionHouse, Pubkey, Keypair), TransportError> {
    let twd_key = context.payer.pubkey().clone();
    let fwd_key = context.payer.pubkey().clone();
    let t_mint_key = spl_token::native_mint::id();
    let tdw_ata = twd_key;
    let seller_fee_basis_points: u16 = 100;
    let authority = Keypair::new();
    airdrop(context, &authority.pubkey(), 10_000_000_000).await?;
    // Derive Auction House Key
    let (auction_house_address, bump) =
        find_auction_house_address(&authority.pubkey(), &t_mint_key);
    let (auction_fee_account_key, fee_payer_bump) =
        find_auction_house_fee_account_address(&auction_house_address);
    // Derive Auction House Treasury Key
    let (auction_house_treasury_key, treasury_bump) =
        find_auction_house_treasury_address(&auction_house_address);
    let auction_house = create_auction_house(
        context,
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
        .await?
        .expect("account empty");

    let auction_house_data = AuctionHouse::try_deserialize(&mut auction_house_acc.data.as_ref())
        .map_err(|e| TransportError::IoError(io::Error::new(io::ErrorKind::InvalidData, e)))?;
    return Ok((auction_house_data, auction_house_address, authority));
}
