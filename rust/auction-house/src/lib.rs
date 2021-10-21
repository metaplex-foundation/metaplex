pub mod utils;

use {
    crate::utils::*,
    anchor_lang::{
        prelude::*,
        solana_program::{
            program::{invoke, invoke_signed},
            program_pack::Pack,
            system_instruction, system_program,
        },
        AnchorDeserialize, AnchorSerialize,
    },
    anchor_spl::token::{Mint, TokenAccount},
    spl_token::instruction::{approve, initialize_account2},
};

anchor_lang::declare_id!("noneAnrLdpjq1Ssp1z8xxDsB8dxe7u4HL5Nxi2K5WXZ");

const PREFIX: &str = "auction_house";
const FEE_PAYER: &str = "fee_payer";
const TREASURY: &str = "treasury";
#[program]
pub mod auction_house {
    use super::*;

    pub fn cancel<'info>(
        ctx: Context<'_, '_, '_, 'info, Cancel<'info>>,
        _buyer_price: u64,
        _token_size: u64,
    ) -> ProgramResult {
        let wallet = &ctx.accounts.wallet;
        let token_account = &ctx.accounts.token_account;
        let token_mint = &ctx.accounts.token_mint;
        let authority = &ctx.accounts.authority;
        let auction_house = &ctx.accounts.auction_house;
        let auction_house_fee_account = &ctx.accounts.auction_house_fee_account;
        let trade_state = &ctx.accounts.trade_state;
        let system_program = &ctx.accounts.system_program;

        assert_keys_equal(token_mint.key(), token_account.mint)?;

        let seeds = [
            PREFIX.as_bytes(),
            auction_house.creator.as_ref(),
            auction_house.treasury_mint.as_ref(),
            &[auction_house.bump],
        ];

        let (fee_payer, fee_payer_seeds) = get_fee_payer(
            authority,
            auction_house,
            wallet.to_account_info(),
            auction_house_fee_account.to_account_info(),
            &seeds,
        )?;

        invoke_signed(
            &system_instruction::transfer(
                &trade_state.key(),
                fee_payer.key,
                trade_state.lamports(),
            ),
            &[
                trade_state.to_account_info(),
                fee_payer.clone(),
                system_program.to_account_info(),
            ],
            &[fee_payer_seeds],
        )?;

        Ok(())
    }
    pub fn execute_sale<'info>(
        ctx: Context<'_, '_, '_, 'info, ExecuteSale<'info>>,
        escrow_payment_bump: u8,
        buyer_price: u64,
        token_size: u64,
    ) -> ProgramResult {
        let buyer = &ctx.accounts.buyer;
        let seller = &ctx.accounts.seller;
        let token_account = &ctx.accounts.token_account;
        let token_mint = &ctx.accounts.token_mint;
        let metadata = &ctx.accounts.metadata;
        let treasury_mint = &ctx.accounts.treasury_mint;
        let seller_payment_receipt_account = &ctx.accounts.seller_payment_receipt_account;
        let buyer_receipt_token_account = &ctx.accounts.buyer_receipt_token_account;
        let escrow_payment_account = &ctx.accounts.escrow_payment_account;
        let authority = &ctx.accounts.authority;
        let auction_house = &ctx.accounts.auction_house;
        let auction_house_fee_account = &ctx.accounts.auction_house_fee_account;
        let auction_house_treasury = &ctx.accounts.auction_house_treasury;
        let buyer_trade_state = &ctx.accounts.buyer_trade_state;
        let seller_trade_state = &ctx.accounts.seller_trade_state;
        let token_program = &ctx.accounts.token_program;
        let system_program = &ctx.accounts.system_program;
        let ata_program = &ctx.accounts.ata_program;
        let program = &ctx.accounts.program;
        let rent = &ctx.accounts.rent;

        let is_native = treasury_mint.key() == spl_token::native_mint::id();

        if buyer_price == 0 && !authority.to_account_info().is_signer {
            return Err(ErrorCode::CannotMatchFreeSalesWithoutAuctionHouseSignoff.into());
        }

        assert_keys_equal(program.key(), *ctx.program_id)?;
        assert_keys_equal(token_mint.key(), token_account.mint)?;

        if buyer_trade_state.data_is_empty() || seller_trade_state.data_is_empty() {
            return Err(ErrorCode::BothPartiesNeedToAgreeToSale.into());
        }

        let seeds = [
            PREFIX.as_bytes(),
            auction_house.creator.as_ref(),
            auction_house.treasury_mint.as_ref(),
            &[auction_house.bump],
        ];

        let wallet_to_use = if buyer.is_signer { buyer } else { seller };

        let (fee_payer, fee_payer_seeds) = get_fee_payer(
            authority,
            auction_house,
            wallet_to_use.to_account_info(),
            auction_house_fee_account.to_account_info(),
            &seeds,
        )?;

        assert_is_ata(
            &token_account.to_account_info(),
            &seller.key(),
            &token_account.mint,
        )?;

        assert_metadata_valid(metadata, token_account)?;

        let auction_house_key = auction_house.key();
        let wallet_key = buyer.key();
        let escrow_signer_seeds = [
            PREFIX.as_bytes(),
            auction_house_key.as_ref(),
            wallet_key.as_ref(),
            &[escrow_payment_bump],
        ];

        let buyer_leftover_after_royalties = pay_creator_fees(
            &mut ctx.remaining_accounts.iter(),
            &metadata.to_account_info(),
            &escrow_payment_account.to_account_info(),
            &fee_payer.to_account_info(),
            treasury_mint,
            &ata_program.to_account_info(),
            &token_program.to_account_info(),
            &system_program.to_account_info(),
            &rent.to_account_info(),
            &escrow_signer_seeds,
            &fee_payer_seeds,
            buyer_price,
            is_native,
        )?;

        let auction_house_fee_paid = pay_auction_house_fees(
            &auction_house,
            &auction_house_treasury.to_account_info(),
            &escrow_payment_account.to_account_info(),
            &token_program.to_account_info(),
            &system_program.to_account_info(),
            &escrow_signer_seeds,
            buyer_price,
            is_native,
        )?;

        let buyer_leftover_after_royalties_and_house_fee = buyer_leftover_after_royalties
            .checked_sub(auction_house_fee_paid)
            .ok_or(ErrorCode::NumericalOverflow)?;

        if !is_native {
            if seller_payment_receipt_account.data_is_empty() {
                make_ata(
                    seller_payment_receipt_account.to_account_info(),
                    seller.to_account_info(),
                    treasury_mint.to_account_info(),
                    fee_payer.to_account_info(),
                    ata_program.to_account_info(),
                    token_program.to_account_info(),
                    system_program.to_account_info(),
                    rent.to_account_info(),
                    &fee_payer_seeds,
                )?;
            }

            let seller_rec_acct = assert_is_ata(
                &seller_payment_receipt_account.to_account_info(),
                &seller.key(),
                &treasury_mint.key(),
            )?;

            // make sure you cant get rugged
            if seller_rec_acct.delegate.is_some() {
                return Err(ErrorCode::SellerATACannotHaveDelegate.into());
            }

            invoke_signed(
                &spl_token::instruction::transfer(
                    token_program.key,
                    &escrow_payment_account.key(),
                    &seller_payment_receipt_account.key(),
                    &escrow_payment_account.key(),
                    &[],
                    buyer_leftover_after_royalties_and_house_fee,
                )?,
                &[
                    escrow_payment_account.to_account_info(),
                    seller_payment_receipt_account.to_account_info(),
                    token_program.to_account_info(),
                ],
                &[&escrow_signer_seeds],
            )?;
        } else {
            assert_keys_equal(seller_payment_receipt_account.key(), seller.key())?;
            invoke_signed(
                &system_instruction::transfer(
                    &escrow_payment_account.key,
                    seller_payment_receipt_account.key,
                    buyer_leftover_after_royalties_and_house_fee,
                ),
                &[
                    escrow_payment_account.to_account_info(),
                    seller_payment_receipt_account.to_account_info(),
                    system_program.to_account_info(),
                ],
                &[&escrow_signer_seeds],
            )?;
        }

        if buyer_receipt_token_account.data_is_empty() {
            make_ata(
                buyer_receipt_token_account.to_account_info(),
                buyer.to_account_info(),
                token_mint.to_account_info(),
                fee_payer.to_account_info(),
                ata_program.to_account_info(),
                token_program.to_account_info(),
                system_program.to_account_info(),
                rent.to_account_info(),
                &fee_payer_seeds,
            )?;
        }

        let buyer_rec_acct = assert_is_ata(
            &buyer_receipt_token_account.to_account_info(),
            &buyer.key(),
            &token_mint.key(),
        )?;

        // make sure you cant get rugged
        if buyer_rec_acct.delegate.is_some() {
            return Err(ErrorCode::BuyerATACannotHaveDelegate.into());
        }

        invoke_signed(
            &spl_token::instruction::transfer(
                token_program.key,
                &token_account.key(),
                &buyer_receipt_token_account.key(),
                &escrow_payment_account.key(),
                &[],
                token_size,
            )?,
            &[
                token_account.to_account_info(),
                buyer_receipt_token_account.to_account_info(),
                token_program.to_account_info(),
            ],
            &[&escrow_signer_seeds],
        )?;

        // Now kill the offer accounts
        invoke_signed(
            &system_instruction::transfer(
                &seller_trade_state.key,
                fee_payer.key,
                seller_trade_state.lamports(),
            ),
            &[
                seller_trade_state.to_account_info(),
                fee_payer.clone(),
                system_program.to_account_info(),
            ],
            &[],
        )?;

        invoke_signed(
            &system_instruction::transfer(
                &buyer_trade_state.key,
                fee_payer.key,
                buyer_trade_state.lamports(),
            ),
            &[
                buyer_trade_state.to_account_info(),
                fee_payer.clone(),
                system_program.to_account_info(),
            ],
            &[],
        )?;
        Ok(())
    }

    pub fn sell<'info>(
        ctx: Context<'_, '_, '_, 'info, Sell<'info>>,
        trade_state_bump: u8,
        _buyer_price: u64,
        token_size: u64,
    ) -> ProgramResult {
        let wallet = &ctx.accounts.wallet;
        let token_account = &ctx.accounts.token_account;
        let metadata = &ctx.accounts.metadata;
        let authority = &ctx.accounts.authority;
        let seller_trade_state = &ctx.accounts.seller_trade_state;
        let free_seller_trade_state = &ctx.accounts.free_seller_trade_state;
        let auction_house = &ctx.accounts.auction_house;
        let auction_house_fee_account = &ctx.accounts.auction_house_fee_account;
        let token_program = &ctx.accounts.token_program;
        let system_program = &ctx.accounts.system_program;
        let program = &ctx.accounts.program;
        let rent = &ctx.accounts.rent;

        if !wallet.to_account_info().is_signer {
            if free_seller_trade_state.data_is_empty() {
                return Err(ErrorCode::SaleRequiresSigner.into());
            } else if !free_seller_trade_state.data_is_empty()
                && !authority.to_account_info().is_signer
            {
                return Err(ErrorCode::SaleRequiresSigner.into());
            }
        }

        assert_keys_equal(program.key(), *ctx.program_id)?;

        let seeds = [
            PREFIX.as_bytes(),
            auction_house.creator.as_ref(),
            auction_house.treasury_mint.as_ref(),
            &[auction_house.bump],
        ];

        let (fee_payer, fee_seeds) = get_fee_payer(
            authority,
            auction_house,
            wallet.to_account_info(),
            auction_house_fee_account.to_account_info(),
            &seeds,
        )?;

        assert_is_ata(
            &token_account.to_account_info(),
            &wallet.key(),
            &token_account.mint,
        )?;

        assert_metadata_valid(metadata, token_account)?;

        if token_size > token_account.amount {
            return Err(ErrorCode::InvalidTokenAmount.into());
        }

        invoke_signed(
            &approve(
                &token_program.key(),
                &token_account.key(),
                &ctx.program_id,
                &wallet.key(),
                &[],
                token_size,
            )
            .unwrap(),
            &[
                token_program.to_account_info(),
                token_account.to_account_info(),
                program.to_account_info(),
                rent.to_account_info(),
            ],
            &[],
        )?;

        let ts_info = seller_trade_state.to_account_info();
        if ts_info.data_is_empty() {
            create_or_allocate_account_raw(
                *ctx.program_id,
                &ts_info,
                &rent.to_account_info(),
                &system_program,
                &fee_payer,
                TRADE_STATE_SIZE,
                fee_seeds,
            )?;
        }

        let data = &mut ts_info.data.borrow_mut();
        data[0] = trade_state_bump;

        Ok(())
    }

    pub fn buy<'info>(
        ctx: Context<'_, '_, '_, 'info, Buy<'info>>,
        trade_state_bump: u8,
        escrow_payment_bump: u8,
        buyer_price: u64,
        _token_size: u64,
    ) -> ProgramResult {
        let wallet = &ctx.accounts.wallet;
        let payment_account = &ctx.accounts.payment_account;
        let transfer_authority = &ctx.accounts.transfer_authority;
        let treasury_mint = &ctx.accounts.treasury_mint;
        let metadata = &ctx.accounts.metadata;
        let token_account = &ctx.accounts.token_account;
        let escrow_payment_account = &ctx.accounts.escrow_payment_account;
        let authority = &ctx.accounts.authority;
        let auction_house = &ctx.accounts.auction_house;
        let auction_house_fee_account = &ctx.accounts.auction_house_fee_account;
        let buyer_trade_state = &mut ctx.accounts.buyer_trade_state;
        let token_program = &ctx.accounts.token_program;
        let system_program = &ctx.accounts.system_program;
        let rent = &ctx.accounts.rent;

        let seeds = [
            PREFIX.as_bytes(),
            auction_house.creator.as_ref(),
            auction_house.treasury_mint.as_ref(),
            &[auction_house.bump],
        ];

        let (fee_payer, fee_seeds) = get_fee_payer(
            authority,
            auction_house,
            wallet.to_account_info(),
            auction_house_fee_account.to_account_info(),
            &seeds,
        )?;

        let is_native = treasury_mint.key() == spl_token::native_mint::id();

        let auction_house_key = auction_house.key();
        let wallet_key = wallet.key();
        let escrow_signer_seeds = [
            PREFIX.as_bytes(),
            auction_house_key.as_ref(),
            wallet_key.as_ref(),
            &[escrow_payment_bump],
        ];

        if !is_native && escrow_payment_account.data_is_empty() {
            create_or_allocate_account_raw(
                *ctx.program_id,
                &escrow_payment_account.to_account_info(),
                &rent.to_account_info(),
                &system_program,
                &fee_payer,
                spl_token::state::Account::LEN,
                fee_seeds,
            )?;

            invoke_signed(
                &initialize_account2(
                    &token_program.key,
                    &escrow_payment_account.key(),
                    &treasury_mint.key(),
                    &escrow_payment_account.key(),
                )
                .unwrap(),
                &[
                    token_program.to_account_info(),
                    treasury_mint.to_account_info(),
                    escrow_payment_account.to_account_info(),
                    rent.to_account_info(),
                ],
                &[&escrow_signer_seeds],
            )?;
        } else if is_native && escrow_payment_account.owner != ctx.program_id {
            invoke_signed(
                &system_instruction::assign(&escrow_payment_account.key(), &ctx.program_id),
                &[
                    system_program.to_account_info(),
                    escrow_payment_account.to_account_info(),
                ],
                &[&escrow_signer_seeds],
            )?;
        }

        if is_native {
            assert_keys_equal(wallet.key(), payment_account.key())?;

            if escrow_payment_account.lamports() < buyer_price {
                let diff = buyer_price
                    .checked_sub(escrow_payment_account.lamports())
                    .ok_or(ErrorCode::NumericalOverflow)?;
                invoke(
                    &system_instruction::transfer(
                        &payment_account.key(),
                        &escrow_payment_account.key(),
                        diff,
                    ),
                    &[
                        payment_account.to_account_info(),
                        escrow_payment_account.to_account_info(),
                        system_program.to_account_info(),
                    ],
                )?;
            }
        } else {
            let escrow_payment_loaded = assert_is_ata(
                &payment_account.to_account_info(),
                &wallet.key(),
                &treasury_mint.key(),
            )?;

            if escrow_payment_loaded.amount < buyer_price {
                let diff = buyer_price
                    .checked_sub(escrow_payment_loaded.amount)
                    .ok_or(ErrorCode::NumericalOverflow)?;
                invoke(
                    &spl_token::instruction::transfer(
                        &token_program.key(),
                        &payment_account.key(),
                        &escrow_payment_account.key(),
                        &transfer_authority.key(),
                        &[],
                        diff,
                    )?,
                    &[
                        transfer_authority.to_account_info(),
                        payment_account.to_account_info(),
                        escrow_payment_account.to_account_info(),
                        token_program.to_account_info(),
                    ],
                )?;
            }
        }

        assert_metadata_valid(metadata, token_account)?;

        let ts_info = buyer_trade_state.to_account_info();
        if ts_info.data_is_empty() {
            create_or_allocate_account_raw(
                *ctx.program_id,
                &ts_info,
                &rent.to_account_info(),
                &system_program,
                &fee_payer,
                TRADE_STATE_SIZE,
                fee_seeds,
            )?;
        }
        let data = &mut ts_info.data.borrow_mut();
        data[0] = trade_state_bump;

        Ok(())
    }
}
#[derive(Accounts)]
pub struct AcceptOffer<'info> {
    maker_wallet: UncheckedAccount<'info>,
    taker_wallet: UncheckedAccount<'info>,
    maker_src_account: UncheckedAccount<'info>,
    maker_dst_account: UncheckedAccount<'info>,
    taker_src_account: UncheckedAccount<'info>,
    taker_dst_account: UncheckedAccount<'info>,
    maker_src_mint: Account<'info, Mint>,
    taker_src_mint: Account<'info, Mint>,
    transfer_authority: UncheckedAccount<'info>,
    #[account(address = spl_token::id())]
    token_program: UncheckedAccount<'info>,
    #[account(address = system_program::ID)]
    system_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(trade_state_bump: u8, free_trade_state_bump: u8, buyer_price: u64, token_size: u64)]
pub struct Sell<'info> {
    wallet: UncheckedAccount<'info>,
    token_account: Account<'info, TokenAccount>,
    metadata: UncheckedAccount<'info>,
    authority: UncheckedAccount<'info>,
    #[account(seeds=[PREFIX.as_bytes(), auction_house.creator.as_ref(), auction_house.treasury_mint.as_ref()], bump=auction_house.bump, has_one=authority)]
    auction_house: Account<'info, AuctionHouse>,
    #[account(mut, seeds=[PREFIX.as_bytes(), auction_house.key().as_ref(), FEE_PAYER.as_bytes()], bump=auction_house.fee_payer_bump)]
    auction_house_fee_account: UncheckedAccount<'info>,
    #[account(mut, seeds=[PREFIX.as_bytes(), wallet.key().as_ref(), auction_house.key().as_ref(), token_account.key().as_ref(), auction_house.treasury_mint.as_ref(), token_account.mint.as_ref(), &buyer_price.to_le_bytes(), &token_size.to_le_bytes()], bump=trade_state_bump)]
    seller_trade_state: UncheckedAccount<'info>,
    #[account(mut, seeds=[PREFIX.as_bytes(), wallet.key().as_ref(), auction_house.key().as_ref(), token_account.key().as_ref(), auction_house.treasury_mint.as_ref(), token_account.mint.as_ref(), &0u64.to_le_bytes(), &token_size.to_le_bytes()], bump=free_trade_state_bump)]
    free_seller_trade_state: UncheckedAccount<'info>,
    #[account(address = spl_token::id())]
    token_program: UncheckedAccount<'info>,
    #[account(address = system_program::ID)]
    system_program: UncheckedAccount<'info>,
    program: UncheckedAccount<'info>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(trade_state_bump: u8, escrow_payment_bump: u8, buyer_price: u64, token_size: u64)]
pub struct Buy<'info> {
    wallet: Signer<'info>,
    payment_account: UncheckedAccount<'info>,
    transfer_authority: Signer<'info>,
    treasury_mint: Account<'info, Mint>,
    token_account: Account<'info, TokenAccount>,
    metadata: UncheckedAccount<'info>,
    #[account(mut, seeds=[PREFIX.as_bytes(), auction_house.key().as_ref(), wallet.key().as_ref()], bump=escrow_payment_bump)]
    escrow_payment_account: UncheckedAccount<'info>,
    authority: UncheckedAccount<'info>,
    #[account(seeds=[PREFIX.as_bytes(), auction_house.creator.as_ref(), auction_house.treasury_mint.as_ref()], bump=auction_house.bump, has_one=authority, has_one=treasury_mint)]
    auction_house: Account<'info, AuctionHouse>,
    #[account(mut, seeds=[PREFIX.as_bytes(), auction_house.key().as_ref(), FEE_PAYER.as_bytes()], bump=auction_house.fee_payer_bump)]
    auction_house_fee_account: UncheckedAccount<'info>,
    #[account(mut, seeds=[PREFIX.as_bytes(), wallet.key().as_ref(), auction_house.key().as_ref(), token_account.key().as_ref(), treasury_mint.key().as_ref(), token_account.mint.as_ref(), &buyer_price.to_le_bytes(), &token_size.to_le_bytes()], bump=trade_state_bump)]
    buyer_trade_state: UncheckedAccount<'info>,
    #[account(address = spl_token::id())]
    token_program: UncheckedAccount<'info>,
    #[account(address = system_program::ID)]
    system_program: UncheckedAccount<'info>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(escrow_payment_bump: u8, buyer_price: u64, token_size: u64)]
pub struct ExecuteSale<'info> {
    buyer: UncheckedAccount<'info>,
    seller: UncheckedAccount<'info>,
    token_account: Account<'info, TokenAccount>,
    token_mint: Account<'info, Mint>,
    metadata: UncheckedAccount<'info>,
    treasury_mint: Account<'info, Mint>,
    #[account(mut, seeds=[PREFIX.as_bytes(), auction_house.key().as_ref(), buyer.key().as_ref()], bump=escrow_payment_bump)]
    escrow_payment_account: UncheckedAccount<'info>,
    seller_payment_receipt_account: UncheckedAccount<'info>,
    buyer_receipt_token_account: UncheckedAccount<'info>,
    authority: UncheckedAccount<'info>,
    #[account(seeds=[PREFIX.as_bytes(), auction_house.creator.as_ref(), auction_house.treasury_mint.as_ref()], bump=auction_house.bump, has_one=authority, has_one=treasury_mint)]
    auction_house: Account<'info, AuctionHouse>,
    #[account(mut, seeds=[PREFIX.as_bytes(), auction_house.key().as_ref(), FEE_PAYER.as_bytes()], bump=auction_house.fee_payer_bump)]
    auction_house_fee_account: UncheckedAccount<'info>,
    #[account(mut, seeds=[PREFIX.as_bytes(), auction_house.key().as_ref(), TREASURY.as_bytes()], bump=auction_house.treasury_bump)]
    auction_house_treasury: UncheckedAccount<'info>,
    #[account(mut, seeds=[PREFIX.as_bytes(), buyer.key().as_ref(), auction_house.key().as_ref(), token_account.key().as_ref(), auction_house.treasury_mint.as_ref(), token_mint.key().as_ref(), &buyer_price.to_le_bytes(), &token_size.to_le_bytes()], bump=buyer_trade_state.to_account_info().data.borrow()[0])]
    buyer_trade_state: UncheckedAccount<'info>,
    #[account(mut, seeds=[PREFIX.as_bytes(), seller.key().as_ref(), auction_house.key().as_ref(), token_account.key().as_ref(), auction_house.treasury_mint.as_ref(), token_mint.key().as_ref(), &buyer_price.to_le_bytes(), &token_size.to_le_bytes()], bump=seller_trade_state.to_account_info().data.borrow()[0])]
    seller_trade_state: UncheckedAccount<'info>,
    #[account(address = spl_token::id())]
    token_program: UncheckedAccount<'info>,
    #[account(address = system_program::ID)]
    system_program: UncheckedAccount<'info>,
    #[account(address = spl_associated_token_account::id())]
    ata_program: UncheckedAccount<'info>,
    program: UncheckedAccount<'info>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(buyer_price: u64, token_size: u64)]
pub struct Cancel<'info> {
    wallet: UncheckedAccount<'info>,
    token_account: Account<'info, TokenAccount>,
    token_mint: Account<'info, Mint>,
    authority: UncheckedAccount<'info>,
    #[account(seeds=[PREFIX.as_bytes(), auction_house.creator.as_ref(), auction_house.treasury_mint.as_ref()], bump=auction_house.bump, has_one=authority)]
    auction_house: Account<'info, AuctionHouse>,
    #[account(mut, seeds=[PREFIX.as_bytes(), auction_house.key().as_ref(), FEE_PAYER.as_bytes()], bump=auction_house.fee_payer_bump)]
    auction_house_fee_account: UncheckedAccount<'info>,
    #[account(mut, seeds=[PREFIX.as_bytes(), auction_house.key().as_ref(), token_account.key().as_ref(), auction_house.treasury_mint.as_ref(), token_mint.key().as_ref(), &buyer_price.to_le_bytes(), &token_size.to_le_bytes()], bump=trade_state.to_account_info().data.borrow()[1])]
    trade_state: UncheckedAccount<'info>,
    #[account(address = system_program::ID)]
    system_program: UncheckedAccount<'info>,
}

pub const AUCTION_HOUSE_SIZE: usize = 8 + //key
32 + //fee payer
32 + //treasury
32 + //treasury mint
32 + //authority
32 + // creator
8 + // bump
8 + // treasury_bump
8 + // fee_payer_bump
2 + // seller fee basis points
1 + // requires sign off
200; //padding

#[account]
pub struct AuctionHouse {
    pub fee_payer: Pubkey,
    pub treasury: Pubkey,
    pub treasury_mint: Pubkey,
    pub authority: Pubkey,
    pub creator: Pubkey,
    pub bump: u8,
    pub treasury_bump: u8,
    pub fee_payer_bump: u8,
    pub seller_fee_basis_points: u16,
    pub requires_sign_off: bool,
    pub can_change_sale_price: bool,
}

pub const TRADE_STATE_SIZE: usize = 1;

#[error]
pub enum ErrorCode {
    #[msg("PublicKeyMismatch")]
    PublicKeyMismatch,
    #[msg("InvalidMintAuthority")]
    InvalidMintAuthority,
    #[msg("UninitializedAccount")]
    UninitializedAccount,
    #[msg("IncorrectOwner")]
    IncorrectOwner,
    #[msg("PublicKeysShouldBeUnique")]
    PublicKeysShouldBeUnique,
    #[msg("StatementFalse")]
    StatementFalse,
    #[msg("NotRentExempt")]
    NotRentExempt,
    #[msg("NumericalOverflow")]
    NumericalOverflow,
    #[msg("Expected a sol account but got an spl token account instead")]
    ExpectedSolAccount,
    #[msg("Cannot exchange sol for sol")]
    CannotExchangeSOLForSol,
    #[msg("If paying with sol, sol wallet must be signer")]
    SOLWalletMustSign,
    #[msg("Cannot take this action without auction house signing too")]
    CannotTakeThisActionWithoutAuctionHouseSignOff,
    #[msg("No payer present on this txn")]
    NoPayerPresent,
    #[msg("Derived key invalid")]
    DerivedKeyInvalid,
    #[msg("Metadata doesn't exist")]
    MetadataDoesntExist,
    #[msg("Invalid token amount")]
    InvalidTokenAmount,
    #[msg("Both parties need to agree to this sale")]
    BothPartiesNeedToAgreeToSale,
    #[msg("Cannot match free sales unless the auction house signs off")]
    CannotMatchFreeSalesWithoutAuctionHouseSignoff,
    #[msg("This sale requires a signer")]
    SaleRequiresSigner,
    #[msg("Old seller not initialized")]
    OldSellerNotInitialized,
    #[msg("Seller ata cannot have a delegate set")]
    SellerATACannotHaveDelegate,
    #[msg("Buyer ata cannot have a delegate set")]
    BuyerATACannotHaveDelegate,
}
