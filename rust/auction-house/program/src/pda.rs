use super::constants::*;
use crate::id;
use anchor_lang::prelude::Pubkey;

pub fn find_auction_house_address(authority: &Pubkey, mint_address: &Pubkey) -> (Pubkey, u8) {
    let auction_house_seeds = &[PREFIX.as_bytes(), authority.as_ref(), mint_address.as_ref()];
    Pubkey::find_program_address(auction_house_seeds, &id())
}

pub fn find_auction_house_fee_account_address(auction_house_address: &Pubkey) -> (Pubkey, u8) {
    let auction_fee_account_seeds = &[
        PREFIX.as_bytes(),
        auction_house_address.as_ref(),
        FEE_PAYER.as_bytes(),
    ];
    Pubkey::find_program_address(auction_fee_account_seeds, &id())
}

pub fn find_auction_house_treasury_address(auction_house_address: &Pubkey) -> (Pubkey, u8) {
    let auction_house_treasury_seeds = &[
        PREFIX.as_bytes(),
        auction_house_address.as_ref(),
        TREASURY.as_bytes(),
    ];
    Pubkey::find_program_address(auction_house_treasury_seeds, &id())
}

pub fn find_auction_house_buyer_escrow_account_address(
    auction_house_address: &Pubkey,
    wallet: &Pubkey,
) -> (Pubkey, u8) {
    let auction_house_buyer_escrow_seeds = &[
        PREFIX.as_bytes(),
        auction_house_address.as_ref(),
        wallet.as_ref(),
    ];
    Pubkey::find_program_address(auction_house_buyer_escrow_seeds, &id())
}

pub fn find_program_as_signer_address() -> (Pubkey, u8) {
    Pubkey::find_program_address(&[PREFIX.as_bytes(), SIGNER.as_bytes()], &id())
}

pub fn find_escrow_payment_address(auction_house: &Pubkey, wallet: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[PREFIX.as_bytes(), auction_house.as_ref(), wallet.as_ref()],
        &id(),
    )
}

/// Return trade state `Pubkey` address and bump seed.
pub fn find_trade_state_address(
    wallet: &Pubkey,
    auction_house: &Pubkey,
    token_account: &Pubkey,
    treasury_mint: &Pubkey,
    token_mint: &Pubkey,
    price: u64,
    token_size: u64,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            PREFIX.as_bytes(),
            wallet.as_ref(),
            auction_house.as_ref(),
            token_account.as_ref(),
            treasury_mint.as_ref(),
            token_mint.as_ref(),
            &price.to_le_bytes(),
            &token_size.to_le_bytes(),
        ],
        &id(),
    )
}

/// Return trade state `Pubkey` address and bump seed.
pub fn find_public_bid_trade_state_address(
    wallet: &Pubkey,
    auction_house: &Pubkey,
    treasury_mint: &Pubkey,
    token_mint: &Pubkey,
    price: u64,
    token_size: u64,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            PREFIX.as_bytes(),
            wallet.as_ref(),
            auction_house.as_ref(),
            treasury_mint.as_ref(),
            token_mint.as_ref(),
            &price.to_le_bytes(),
            &token_size.to_le_bytes(),
        ],
        &id(),
    )
}

/// Return bid receipt `Pubkey` address and bump seed.
pub fn find_bid_receipt_address(trade_state: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[BID_RECEIPT_PREFIX.as_bytes(), trade_state.as_ref()],
        &id(),
    )
}

/// Return liting receipt `Pubkey` address and bump seed.
pub fn find_listing_receipt_address(trade_state: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[LISTING_RECEIPT_PREFIX.as_bytes(), trade_state.as_ref()],
        &id(),
    )
}

/// Return purchase receipt `Pubkey` address and bump seed.
pub fn find_purchase_receipt_address(
    seller_trade_state: &Pubkey,
    buyer_trade_state: &Pubkey,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            PURCHASE_RECEIPT_PREFIX.as_bytes(),
            seller_trade_state.as_ref(),
            buyer_trade_state.as_ref(),
        ],
        &id(),
    )
}
