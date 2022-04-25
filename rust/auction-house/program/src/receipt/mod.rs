//! Create PDAs to to track the status and results of various Auction House actions.
use crate::{
    constants::*,
    id,
    instruction::{Buy, ExecuteSale, Sell},
    utils::*,
    ErrorCode,
};
use anchor_lang::{prelude::*, AnchorDeserialize, AnchorSerialize};
use solana_program::{sysvar, sysvar::instructions::get_instruction_relative};

pub const BID_RECEIPT_SIZE: usize = 8 + //key
32 + // trade_state
32 + // bookkeeper
32 + // auction_house
32 + // buyer
32 + // metadata
1 + 32 + // token_account
1 + 32 + // purchase_receipt
8 + // price
8 + // token_size
1 + // bump
1 + // trade_state_bump
8 + // created_at
1 + 8; // canceled_at

/// Receipt for a bid transaction.
#[account]
pub struct BidReceipt {
    pub trade_state: Pubkey,
    pub bookkeeper: Pubkey,
    pub auction_house: Pubkey,
    pub buyer: Pubkey,
    pub metadata: Pubkey,
    pub token_account: Option<Pubkey>,
    pub purchase_receipt: Option<Pubkey>,
    pub price: u64,
    pub token_size: u64,
    pub bump: u8,
    pub trade_state_bump: u8,
    pub created_at: i64,
    pub canceled_at: Option<i64>,
}

pub const LISTING_RECEIPT_SIZE: usize = 8 + //key
32 + // trade_state
32 + // bookkeeper
32 + // auction_house
32 + // seller
32 + // metadata
1 + 32 + // purchase_receipt
8 + // price
8 + // token_size
1 + // bump
1 + // trade_state_bump
8 + // created_at
1 + 8; // canceled_at;

/// Receipt for a listing transaction.
#[account]
pub struct ListingReceipt {
    pub trade_state: Pubkey,
    pub bookkeeper: Pubkey,
    pub auction_house: Pubkey,
    pub seller: Pubkey,
    pub metadata: Pubkey,
    pub purchase_receipt: Option<Pubkey>,
    pub price: u64,
    pub token_size: u64,
    pub bump: u8,
    pub trade_state_bump: u8,
    pub created_at: i64,
    pub canceled_at: Option<i64>,
}

pub const PURCHASE_RECEIPT_SIZE: usize = 8 + //key
32 + // bookkeeper
32 + // buyer
32 + // seller
32 + // auction_house
32 + // metadata
8 + // token_size
8 + // price
1 + // bump
8; // created_at

/// Receipt for a purchase transaction.
#[account]
pub struct PurchaseReceipt {
    pub bookkeeper: Pubkey,
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub auction_house: Pubkey,
    pub metadata: Pubkey,
    pub token_size: u64,
    pub price: u64,
    pub bump: u8,
    pub created_at: i64,
}

/// Accounts for the [`print_listing_receipt` hanlder](fn.print_listing_receipt.html).
#[derive(Accounts)]
#[instruction(receipt_bump: u8)]
pub struct PrintListingReceipt<'info> {
    /// CHECK: Verified through CPI
    #[account(mut)]
    pub receipt: UncheckedAccount<'info>,
    #[account(mut)]
    pub bookkeeper: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    /// CHECK: Verified through instruction ID
    #[account(address = sysvar::instructions::id())]
    pub instruction: UncheckedAccount<'info>,
}

/// Create a Listing Receipt account at a PDA with the seeds:
/// "listing_receipt", <SELLER_TRADE_STATE_PUBKEY>.
///
/// The previous instruction is checked to ensure that it is a "Listing" type to
/// match the receipt type being created. Passing in an empty account results in the PDA
/// being created; an existing account will be written over.
pub fn print_listing_receipt<'info>(
    ctx: Context<'_, '_, '_, 'info, PrintListingReceipt<'info>>,
    receipt_bump: u8,
) -> Result<()> {
    let receipt_account = &ctx.accounts.receipt;
    let instruction_account = &ctx.accounts.instruction;
    let bookkeeper_account = &ctx.accounts.bookkeeper;

    let rent = &ctx.accounts.rent;
    let system_program = &ctx.accounts.system_program;
    let clock = Clock::get()?;

    let prev_instruction = get_instruction_relative(-1, instruction_account)?;
    let prev_instruction_accounts = prev_instruction.accounts;

    let wallet = &prev_instruction_accounts[0];
    let auction_house = &prev_instruction_accounts[4];
    let seller_trade_state = &prev_instruction_accounts[6];
    let metadata = &prev_instruction_accounts[2];

    let mut buffer = &prev_instruction.data[8..];
    let sell_data = Sell::deserialize(&mut buffer)?;

    assert_program_instruction_equal(
        &prev_instruction.data[..8],
        [51, 230, 133, 164, 1, 127, 131, 173],
    )?;

    assert_keys_equal(prev_instruction.program_id, id())?;

    let receipt_info = receipt_account.to_account_info();

    assert_derivation(
        &id(),
        &receipt_info,
        &[
            LISTING_RECEIPT_PREFIX.as_ref(),
            seller_trade_state.pubkey.as_ref(),
        ],
    )?;

    if receipt_info.data_is_empty() {
        let receipt_seeds = [
            LISTING_RECEIPT_PREFIX.as_bytes(),
            seller_trade_state.pubkey.as_ref(),
            &[receipt_bump],
        ];

        create_or_allocate_account_raw(
            *ctx.program_id,
            &receipt_info,
            &rent.to_account_info(),
            &system_program,
            &bookkeeper_account,
            LISTING_RECEIPT_SIZE,
            &[],
            &receipt_seeds,
        )?;
    }

    let receipt = ListingReceipt {
        trade_state: seller_trade_state.pubkey,
        bookkeeper: bookkeeper_account.key(),
        auction_house: auction_house.pubkey,
        seller: wallet.pubkey,
        metadata: metadata.pubkey,
        purchase_receipt: None,
        price: sell_data.buyer_price,
        token_size: sell_data.token_size,
        bump: receipt_bump,
        trade_state_bump: sell_data.trade_state_bump,
        created_at: clock.unix_timestamp,
        canceled_at: None,
    };

    receipt.try_serialize(&mut *receipt_account.try_borrow_mut_data()?)?;

    Ok(())
}

/// Accounts for the [`cancel_listing_receipt` handler](fn.cancel_listing_receipt.html).
#[derive(Accounts)]
pub struct CancelListingReceipt<'info> {
    /// CHECK: Verified through CPI
    #[account(mut)]
    pub receipt: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    /// CHECK: Verified through instruction ID
    #[account(address = sysvar::instructions::id())]
    pub instruction: UncheckedAccount<'info>,
}

/// Add a cancelation time to a listing receipt.
pub fn cancel_listing_receipt<'info>(
    ctx: Context<'_, '_, '_, 'info, CancelListingReceipt<'info>>,
) -> Result<()> {
    let receipt_account = &ctx.accounts.receipt;
    let instruction_account = &ctx.accounts.instruction;
    let clock = Clock::get()?;

    let receipt_info = receipt_account.to_account_info();

    let prev_instruction = get_instruction_relative(-1, instruction_account)?;
    let prev_instruction_accounts = prev_instruction.accounts;

    let trade_state = &prev_instruction_accounts[6];

    assert_program_instruction_equal(
        &prev_instruction.data[..8],
        [232, 219, 223, 41, 219, 236, 220, 190],
    )?;

    if receipt_info.data_is_empty() {
        return Err(ErrorCode::ReceiptIsEmpty.into());
    }

    assert_derivation(
        &id(),
        &receipt_info,
        &[LISTING_RECEIPT_PREFIX.as_ref(), trade_state.pubkey.as_ref()],
    )?;

    let mut receipt_data = receipt_info.try_borrow_mut_data()?;
    let mut receipt_data_slice: &[u8] = &receipt_data;

    let mut receipt = ListingReceipt::try_deserialize(&mut receipt_data_slice)?;

    receipt.canceled_at = Some(clock.unix_timestamp);

    receipt.try_serialize(&mut *receipt_data)?;

    Ok(())
}

/// Accounts for the [`print_bid_receipt` handler](fn.print_bid_receipt.html).
#[derive(Accounts)]
#[instruction(receipt_bump: u8)]
pub struct PrintBidReceipt<'info> {
    /// CHECK: Verified through CPI
    #[account(mut)]
    receipt: UncheckedAccount<'info>,
    #[account(mut)]
    bookkeeper: Signer<'info>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
    /// CHECK: Verified through instruction ID
    #[account(address = sysvar::instructions::id())]
    instruction: UncheckedAccount<'info>,
}

/// Create a Bid Receipt account at a PDA with the seeds:
/// "bid_receipt", <BUYER_TRADE_STATE_PUBKEY>.
///
/// The previous instruction is checked to ensure that it is a "Bid" type to
/// match the receipt type being created. Passing in an empty account results in the PDA
/// being created; an existing account will be written over.
pub fn print_bid_receipt<'info>(
    ctx: Context<'_, '_, '_, 'info, PrintBidReceipt<'info>>,
    receipt_bump: u8,
) -> Result<()> {
    let receipt_account = &ctx.accounts.receipt;
    let instruction_account = &ctx.accounts.instruction;
    let bookkeeper_account = &ctx.accounts.bookkeeper;

    let rent = &ctx.accounts.rent;
    let system_program = &ctx.accounts.system_program;
    let clock = Clock::get()?;

    let receipt_info = receipt_account.to_account_info();

    let prev_instruction = get_instruction_relative(-1, instruction_account)?;
    let prev_instruction_accounts = prev_instruction.accounts;

    let wallet = &prev_instruction_accounts[0];
    let token_account = &prev_instruction_accounts[4];
    let auction_house = &prev_instruction_accounts[8];
    let buyer_trade_state = &prev_instruction_accounts[10];
    let metadata = &prev_instruction_accounts[5];

    let mut buffer = &prev_instruction.data[8..];
    let buy_data = Buy::deserialize(&mut buffer)?;

    let bid_type = assert_program_bid_instruction(&prev_instruction.data[..8])?;

    let token_account = match bid_type {
        BidType::PrivateSale => Some(token_account.pubkey),
        BidType::PublicSale => None,
    };

    assert_derivation(
        &id(),
        &receipt_info,
        &[
            BID_RECEIPT_PREFIX.as_ref(),
            buyer_trade_state.pubkey.as_ref(),
        ],
    )?;

    assert_keys_equal(prev_instruction.program_id, id())?;

    let receipt_info = receipt_account.to_account_info();

    if receipt_info.data_is_empty() {
        let receipt_seeds = [
            BID_RECEIPT_PREFIX.as_bytes(),
            buyer_trade_state.pubkey.as_ref(),
            &[receipt_bump],
        ];

        create_or_allocate_account_raw(
            *ctx.program_id,
            &receipt_info,
            &rent.to_account_info(),
            &system_program,
            &bookkeeper_account,
            BID_RECEIPT_SIZE,
            &[],
            &receipt_seeds,
        )?;
    }

    let receipt = BidReceipt {
        token_account,
        trade_state: buyer_trade_state.pubkey,
        bookkeeper: bookkeeper_account.key(),
        auction_house: auction_house.pubkey,
        buyer: wallet.pubkey,
        metadata: metadata.pubkey,
        purchase_receipt: None,
        price: buy_data.buyer_price,
        token_size: buy_data.token_size,
        bump: receipt_bump,
        trade_state_bump: buy_data.trade_state_bump,
        created_at: clock.unix_timestamp,
        canceled_at: None,
    };

    receipt.try_serialize(&mut *receipt_account.try_borrow_mut_data()?)?;

    Ok(())
}

/// Accounts for the [`cancel_bid_receipt` handler](fn.cancel_bid_receipt.html).
#[derive(Accounts)]
pub struct CancelBidReceipt<'info> {
    /// CHECK: Verified through CPI
    #[account(mut)]
    receipt: UncheckedAccount<'info>,
    system_program: Program<'info, System>,
    /// CHECK: Verified through instruction ID
    #[account(address = sysvar::instructions::id())]
    instruction: UncheckedAccount<'info>,
}

/// Add a canceled_at timestamp to the Bid Receipt account.
pub fn cancel_bid_receipt<'info>(
    ctx: Context<'_, '_, '_, 'info, CancelBidReceipt<'info>>,
) -> Result<()> {
    let receipt_account = &ctx.accounts.receipt;
    let instruction_account = &ctx.accounts.instruction;
    let clock = Clock::get()?;

    let receipt_info = receipt_account.to_account_info();

    let prev_instruction = get_instruction_relative(-1, instruction_account)?;
    let prev_instruction_accounts = prev_instruction.accounts;

    let trade_state = &prev_instruction_accounts[6];

    assert_program_instruction_equal(
        &prev_instruction.data[..8],
        [232, 219, 223, 41, 219, 236, 220, 190],
    )?;

    if receipt_info.data_is_empty() {
        return Err(ErrorCode::ReceiptIsEmpty.into());
    }

    assert_derivation(
        &id(),
        &receipt_info,
        &[BID_RECEIPT_PREFIX.as_ref(), trade_state.pubkey.as_ref()],
    )?;

    let mut receipt_data = receipt_info.try_borrow_mut_data()?;
    let mut receipt_data_slice: &[u8] = &receipt_data;

    let mut receipt = BidReceipt::try_deserialize(&mut receipt_data_slice)?;

    receipt.canceled_at = Some(clock.unix_timestamp);

    receipt.try_serialize(&mut *receipt_data)?;

    Ok(())
}

/// Accounts for the [`print_purchase_receipt` handler](fn.print_purchase_receipt.html).
#[derive(Accounts)]
#[instruction(receipt_bump: u8)]
pub struct PrintPurchaseReceipt<'info> {
    /// CHECK: Verified through CPI
    #[account(mut)]
    purchase_receipt: UncheckedAccount<'info>,
    /// CHECK: Verified through CPI
    #[account(mut)]
    listing_receipt: UncheckedAccount<'info>,
    /// CHECK: Verified through CPI
    #[account(mut)]
    bid_receipt: UncheckedAccount<'info>,
    #[account(mut)]
    bookkeeper: Signer<'info>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
    /// CHECK: Verified through instruction ID
    #[account(address = sysvar::instructions::id())]
    instruction: UncheckedAccount<'info>,
}

/// Create a Purchase Receipt account at a PDA with the seeds:
/// "listing_receipt", <SELLER_TRADE_STATE_PUBKEY>, <BUYER_TRADE_STATE_PUBKEY>.
///
/// The previous instruction is checked to ensure that it is a "Purchase" type to
/// match the receipt type being created. Passing in an empty account results in the PDA
/// being created; an existing account will be written over.
pub fn print_purchase_receipt<'info>(
    ctx: Context<'_, '_, '_, 'info, PrintPurchaseReceipt<'info>>,
    purchase_receipt_bump: u8,
) -> Result<()> {
    let purchase_receipt_account = &ctx.accounts.purchase_receipt;
    let listing_receipt_account = &ctx.accounts.listing_receipt;
    let bid_receipt_account = &ctx.accounts.bid_receipt;
    let instruction_account = &ctx.accounts.instruction;
    let bookkeeper = &ctx.accounts.bookkeeper;
    let rent = &ctx.accounts.rent;
    let system_program = &ctx.accounts.system_program;
    let clock = Clock::get()?;

    let prev_instruction = get_instruction_relative(-1, instruction_account)?;
    let prev_instruction_accounts = prev_instruction.accounts;

    let mut buffer = &prev_instruction.data[8..];
    let execute_sale_data = ExecuteSale::deserialize(&mut buffer)?;

    assert_program_instruction_equal(
        &prev_instruction.data[..8],
        [37, 74, 217, 157, 79, 49, 35, 6],
    )?;

    assert_keys_equal(prev_instruction.program_id, id())?;

    let buyer = &prev_instruction_accounts[0];
    let seller = &prev_instruction_accounts[1];
    let metadata = &prev_instruction_accounts[4];
    let auction_house = &prev_instruction_accounts[10];
    let buyer_trade_state = &prev_instruction_accounts[13];
    let seller_trade_state = &prev_instruction_accounts[14];

    let timestamp = clock.unix_timestamp;

    let purchase_receipt_info = purchase_receipt_account.to_account_info();
    let listing_receipt_info = listing_receipt_account.to_account_info();
    let bid_receipt_info = bid_receipt_account.to_account_info();

    assert_derivation(
        &id(),
        &listing_receipt_info,
        &[
            LISTING_RECEIPT_PREFIX.as_ref(),
            seller_trade_state.pubkey.as_ref(),
        ],
    )?;
    assert_derivation(
        &id(),
        &purchase_receipt_account,
        &[
            PURCHASE_RECEIPT_PREFIX.as_ref(),
            seller_trade_state.pubkey.as_ref(),
            buyer_trade_state.pubkey.as_ref(),
        ],
    )?;
    assert_derivation(
        &id(),
        &bid_receipt_info,
        &[
            BID_RECEIPT_PREFIX.as_ref(),
            buyer_trade_state.pubkey.as_ref(),
        ],
    )?;

    if listing_receipt_info.data_is_empty() || bid_receipt_info.data_is_empty() {
        return Err(ErrorCode::ReceiptIsEmpty.into());
    }

    if purchase_receipt_info.data_is_empty() {
        let purchase_receipt_seeds = [
            PURCHASE_RECEIPT_PREFIX.as_bytes(),
            seller_trade_state.pubkey.as_ref(),
            buyer_trade_state.pubkey.as_ref(),
            &[purchase_receipt_bump],
        ];

        create_or_allocate_account_raw(
            *ctx.program_id,
            &purchase_receipt_info,
            &rent.to_account_info(),
            &system_program,
            &bookkeeper,
            PURCHASE_RECEIPT_SIZE,
            &[],
            &purchase_receipt_seeds,
        )?;
    }

    let purchase = PurchaseReceipt {
        buyer: buyer.pubkey,
        seller: seller.pubkey,
        auction_house: auction_house.pubkey,
        metadata: metadata.pubkey,
        bookkeeper: bookkeeper.key(),
        bump: purchase_receipt_bump,
        price: execute_sale_data.buyer_price,
        token_size: execute_sale_data.token_size,
        created_at: timestamp,
    };

    purchase.try_serialize(&mut *purchase_receipt_account.try_borrow_mut_data()?)?;

    let mut listing_receipt_data = listing_receipt_info.try_borrow_mut_data()?;
    let mut listing_receipt_data_slice: &[u8] = &listing_receipt_data;

    let mut listing_receipt = ListingReceipt::try_deserialize(&mut listing_receipt_data_slice)?;

    listing_receipt.purchase_receipt = Some(purchase_receipt_account.key());

    listing_receipt.try_serialize(&mut *listing_receipt_data)?;

    let mut bid_receipt_data = bid_receipt_account.try_borrow_mut_data()?;
    let mut bid_receipt_slice: &[u8] = &bid_receipt_data;

    let mut bid_receipt = BidReceipt::try_deserialize(&mut bid_receipt_slice)?;

    bid_receipt.purchase_receipt = Some(purchase_receipt_account.key());

    bid_receipt.try_serialize(&mut *bid_receipt_data)?;

    Ok(())
}
