//! # Metaplex Program Library: Auction House
//! AuctionHouse is a protocol for marketplaces to implement a decentralized sales contract. It is simple, fast and very cheap. AuctionHouse is a Solana program available on Mainnet Beta and Devnet. Anyone can create an AuctionHouse and accept any SPL token they wish.
//!
//! Full docs can be found [here](https://docs.metaplex.com/auction-house/definition).
pub mod bid;
pub mod constants;
pub mod pda;
pub mod receipt;
pub mod utils;
use crate::{bid::*, constants::*, receipt::*, utils::*};
use anchor_lang::{
    prelude::*,
    solana_program::{
        program::{invoke, invoke_signed},
        system_instruction,
    },
    AnchorDeserialize, AnchorSerialize,
};
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};
use solana_program::program_memory::sol_memset;
use spl_token::instruction::{approve, revoke};
anchor_lang::declare_id!("hausS13jsjafwWwGqZTUQRmWyvyxn9EQpqMwV1PBBmk");

#[program]
pub mod auction_house {
    use super::*;

    /// Withdraw `amount` from the Auction House Fee Account to a provided destination account.
    pub fn withdraw_from_fee<'info>(
        ctx: Context<'_, '_, '_, 'info, WithdrawFromFee<'info>>,
        amount: u64,
    ) -> Result<()> {
        let auction_house_fee_account = &ctx.accounts.auction_house_fee_account;
        let fee_withdrawal_destination = &ctx.accounts.fee_withdrawal_destination;
        let auction_house = &ctx.accounts.auction_house;
        let system_program = &ctx.accounts.system_program;

        let auction_house_key = auction_house.key();
        let seeds = [
            PREFIX.as_bytes(),
            auction_house_key.as_ref(),
            FEE_PAYER.as_bytes(),
            &[auction_house.fee_payer_bump],
        ];

        invoke_signed(
            &system_instruction::transfer(
                &auction_house_fee_account.key(),
                &fee_withdrawal_destination.key(),
                amount,
            ),
            &[
                auction_house_fee_account.to_account_info(),
                fee_withdrawal_destination.to_account_info(),
                system_program.to_account_info(),
            ],
            &[&seeds],
        )?;

        Ok(())
    }

    /// Withdraw `amount` from the Auction House Treasury Account to a provided destination account.
    pub fn withdraw_from_treasury<'info>(
        ctx: Context<'_, '_, '_, 'info, WithdrawFromTreasury<'info>>,
        amount: u64,
    ) -> Result<()> {
        let treasury_mint = &ctx.accounts.treasury_mint;
        let treasury_withdrawal_destination = &ctx.accounts.treasury_withdrawal_destination;
        let auction_house_treasury = &ctx.accounts.auction_house_treasury;
        let auction_house = &ctx.accounts.auction_house;
        let token_program = &ctx.accounts.token_program;
        let system_program = &ctx.accounts.system_program;

        let is_native = treasury_mint.key() == spl_token::native_mint::id();
        let auction_house_seeds = [
            PREFIX.as_bytes(),
            auction_house.creator.as_ref(),
            auction_house.treasury_mint.as_ref(),
            &[auction_house.bump],
        ];

        let ah_key = auction_house.key();
        let auction_house_treasury_seeds = [
            PREFIX.as_bytes(),
            ah_key.as_ref(),
            TREASURY.as_bytes(),
            &[auction_house.treasury_bump],
        ];
        if !is_native {
            invoke_signed(
                &spl_token::instruction::transfer(
                    token_program.key,
                    &auction_house_treasury.key(),
                    &treasury_withdrawal_destination.key(),
                    &auction_house.key(),
                    &[],
                    amount,
                )?,
                &[
                    auction_house_treasury.to_account_info(),
                    treasury_withdrawal_destination.to_account_info(),
                    token_program.to_account_info(),
                    auction_house.to_account_info(),
                ],
                &[&auction_house_seeds],
            )?;
        } else {
            invoke_signed(
                &system_instruction::transfer(
                    &auction_house_treasury.key(),
                    &treasury_withdrawal_destination.key(),
                    amount,
                ),
                &[
                    auction_house_treasury.to_account_info(),
                    treasury_withdrawal_destination.to_account_info(),
                    system_program.to_account_info(),
                ],
                &[&auction_house_treasury_seeds],
            )?;
        }

        Ok(())
    }

    /// Update Auction House values such as seller fee basis points, update authority, treasury account, etc.
    pub fn update_auction_house<'info>(
        ctx: Context<'_, '_, '_, 'info, UpdateAuctionHouse<'info>>,
        seller_fee_basis_points: Option<u16>,
        requires_sign_off: Option<bool>,
        can_change_sale_price: Option<bool>,
    ) -> Result<()> {
        let treasury_mint = &ctx.accounts.treasury_mint;
        let payer = &ctx.accounts.payer;
        let new_authority = &ctx.accounts.new_authority;
        let auction_house = &mut ctx.accounts.auction_house;
        let fee_withdrawal_destination = &ctx.accounts.fee_withdrawal_destination;
        let treasury_withdrawal_destination_owner =
            &ctx.accounts.treasury_withdrawal_destination_owner;
        let treasury_withdrawal_destination = &ctx.accounts.treasury_withdrawal_destination;
        let token_program = &ctx.accounts.token_program;
        let system_program = &ctx.accounts.system_program;
        let ata_program = &ctx.accounts.ata_program;
        let rent = &ctx.accounts.rent;
        let is_native = treasury_mint.key() == spl_token::native_mint::id();

        if let Some(sfbp) = seller_fee_basis_points {
            if sfbp > 10000 {
                return Err(ErrorCode::InvalidBasisPoints.into());
            }

            auction_house.seller_fee_basis_points = sfbp;
        }

        if let Some(rqf) = requires_sign_off {
            auction_house.requires_sign_off = rqf;
        }
        if let Some(chsp) = can_change_sale_price {
            auction_house.can_change_sale_price = chsp;
        }

        auction_house.authority = new_authority.key();
        auction_house.treasury_withdrawal_destination = treasury_withdrawal_destination.key();
        auction_house.fee_withdrawal_destination = fee_withdrawal_destination.key();

        if !is_native {
            if treasury_withdrawal_destination.data_is_empty() {
                make_ata(
                    treasury_withdrawal_destination.to_account_info(),
                    treasury_withdrawal_destination_owner.to_account_info(),
                    treasury_mint.to_account_info(),
                    payer.to_account_info(),
                    ata_program.to_account_info(),
                    token_program.to_account_info(),
                    system_program.to_account_info(),
                    rent.to_account_info(),
                    &[],
                )?;
            }

            assert_is_ata(
                &treasury_withdrawal_destination.to_account_info(),
                &treasury_withdrawal_destination_owner.key(),
                &treasury_mint.key(),
            )?;
        } else {
            assert_keys_equal(
                treasury_withdrawal_destination.key(),
                treasury_withdrawal_destination_owner.key(),
            )?;
        }

        Ok(())
    }

    /// Create a new Auction House instance.
    pub fn create_auction_house<'info>(
        ctx: Context<'_, '_, '_, 'info, CreateAuctionHouse<'info>>,
        _bump: u8,
        fee_payer_bump: u8,
        treasury_bump: u8,
        seller_fee_basis_points: u16,
        requires_sign_off: bool,
        can_change_sale_price: bool,
    ) -> Result<()> {
        let treasury_mint = &ctx.accounts.treasury_mint;
        let payer = &ctx.accounts.payer;
        let authority = &ctx.accounts.authority;
        let auction_house = &mut ctx.accounts.auction_house;
        let auction_house_fee_account = &ctx.accounts.auction_house_fee_account;
        let auction_house_treasury = &ctx.accounts.auction_house_treasury;
        let fee_withdrawal_destination = &ctx.accounts.fee_withdrawal_destination;
        let treasury_withdrawal_destination_owner =
            &ctx.accounts.treasury_withdrawal_destination_owner;
        let treasury_withdrawal_destination = &ctx.accounts.treasury_withdrawal_destination;
        let token_program = &ctx.accounts.token_program;
        let system_program = &ctx.accounts.system_program;
        let ata_program = &ctx.accounts.ata_program;
        let rent = &ctx.accounts.rent;

        auction_house.bump = *ctx.bumps.get("auction_house").unwrap();
        auction_house.fee_payer_bump = fee_payer_bump;
        auction_house.treasury_bump = treasury_bump;
        if seller_fee_basis_points > 10000 {
            return Err(ErrorCode::InvalidBasisPoints.into());
        }
        auction_house.seller_fee_basis_points = seller_fee_basis_points;
        auction_house.requires_sign_off = requires_sign_off;
        auction_house.can_change_sale_price = can_change_sale_price;
        auction_house.creator = authority.key();
        auction_house.authority = authority.key();
        auction_house.treasury_mint = treasury_mint.key();
        auction_house.auction_house_fee_account = auction_house_fee_account.key();
        auction_house.auction_house_treasury = auction_house_treasury.key();
        auction_house.treasury_withdrawal_destination = treasury_withdrawal_destination.key();
        auction_house.fee_withdrawal_destination = fee_withdrawal_destination.key();

        let is_native = treasury_mint.key() == spl_token::native_mint::id();

        let ah_key = auction_house.key();

        let auction_house_treasury_seeds = [
            PREFIX.as_bytes(),
            ah_key.as_ref(),
            TREASURY.as_bytes(),
            &[treasury_bump],
        ];

        create_program_token_account_if_not_present(
            auction_house_treasury,
            system_program,
            &payer,
            token_program,
            treasury_mint,
            &auction_house.to_account_info(),
            rent,
            &auction_house_treasury_seeds,
            &[],
            is_native,
        )?;

        if !is_native {
            if treasury_withdrawal_destination.data_is_empty() {
                make_ata(
                    treasury_withdrawal_destination.to_account_info(),
                    treasury_withdrawal_destination_owner.to_account_info(),
                    treasury_mint.to_account_info(),
                    payer.to_account_info(),
                    ata_program.to_account_info(),
                    token_program.to_account_info(),
                    system_program.to_account_info(),
                    rent.to_account_info(),
                    &[],
                )?;
            }

            assert_is_ata(
                &treasury_withdrawal_destination.to_account_info(),
                &treasury_withdrawal_destination_owner.key(),
                &treasury_mint.key(),
            )?;
        } else {
            assert_keys_equal(
                treasury_withdrawal_destination.key(),
                treasury_withdrawal_destination_owner.key(),
            )?;
        }

        Ok(())
    }

    /// Withdraw `amount` from the escrow payment account for your specific wallet.
    pub fn withdraw<'info>(
        ctx: Context<'_, '_, '_, 'info, Withdraw<'info>>,
        escrow_payment_bump: u8,
        amount: u64,
    ) -> Result<()> {
        let wallet = &ctx.accounts.wallet;
        let receipt_account = &ctx.accounts.receipt_account;
        let escrow_payment_account = &ctx.accounts.escrow_payment_account;
        let authority = &ctx.accounts.authority;
        let auction_house = &ctx.accounts.auction_house;
        let auction_house_fee_account = &ctx.accounts.auction_house_fee_account;
        let treasury_mint = &ctx.accounts.treasury_mint;
        let system_program = &ctx.accounts.system_program;
        let token_program = &ctx.accounts.token_program;
        let ata_program = &ctx.accounts.ata_program;
        let rent = &ctx.accounts.rent;

        let auction_house_key = auction_house.key();
        let seeds = [
            PREFIX.as_bytes(),
            auction_house_key.as_ref(),
            FEE_PAYER.as_bytes(),
            &[auction_house.fee_payer_bump],
        ];

        let ah_seeds = [
            PREFIX.as_bytes(),
            auction_house.creator.as_ref(),
            auction_house.treasury_mint.as_ref(),
            &[auction_house.bump],
        ];

        let auction_house_key = auction_house.key();
        let wallet_key = wallet.key();

        if !wallet.to_account_info().is_signer && !authority.to_account_info().is_signer {
            return Err(ErrorCode::NoValidSignerPresent.into());
        }

        let escrow_signer_seeds = [
            PREFIX.as_bytes(),
            auction_house_key.as_ref(),
            wallet_key.as_ref(),
            &[escrow_payment_bump],
        ];

        let (fee_payer, fee_seeds) = get_fee_payer(
            authority,
            auction_house,
            wallet.to_account_info(),
            auction_house_fee_account.to_account_info(),
            &seeds,
        )?;

        let is_native = treasury_mint.key() == spl_token::native_mint::id();

        if !is_native {
            if receipt_account.data_is_empty() {
                make_ata(
                    receipt_account.to_account_info(),
                    wallet.to_account_info(),
                    treasury_mint.to_account_info(),
                    fee_payer.to_account_info(),
                    ata_program.to_account_info(),
                    token_program.to_account_info(),
                    system_program.to_account_info(),
                    rent.to_account_info(),
                    &fee_seeds,
                )?;
            }

            let rec_acct = assert_is_ata(
                &receipt_account.to_account_info(),
                &wallet.key(),
                &treasury_mint.key(),
            )?;

            // make sure you cant get rugged
            if rec_acct.delegate.is_some() {
                return Err(ErrorCode::BuyerATACannotHaveDelegate.into());
            }

            assert_is_ata(receipt_account, &wallet.key(), &treasury_mint.key())?;
            invoke_signed(
                &spl_token::instruction::transfer(
                    token_program.key,
                    &escrow_payment_account.key(),
                    &receipt_account.key(),
                    &auction_house.key(),
                    &[],
                    amount,
                )?,
                &[
                    escrow_payment_account.to_account_info(),
                    receipt_account.to_account_info(),
                    token_program.to_account_info(),
                    auction_house.to_account_info(),
                ],
                &[&ah_seeds],
            )?;
        } else {
            assert_keys_equal(receipt_account.key(), wallet.key())?;
            let checked_amount =
                rent_checked_sub(escrow_payment_account.to_account_info(), amount)?;
            invoke_signed(
                &system_instruction::transfer(
                    &escrow_payment_account.key(),
                    &receipt_account.key(),
                    checked_amount,
                ),
                &[
                    escrow_payment_account.to_account_info(),
                    receipt_account.to_account_info(),
                    system_program.to_account_info(),
                ],
                &[&escrow_signer_seeds],
            )?;
        }

        Ok(())
    }

    /// Deposit `amount` into the escrow payment account for your specific wallet.
    pub fn deposit<'info>(
        ctx: Context<'_, '_, '_, 'info, Deposit<'info>>,
        escrow_payment_bump: u8,
        amount: u64,
    ) -> Result<()> {
        let wallet = &ctx.accounts.wallet;
        let payment_account = &ctx.accounts.payment_account;
        let transfer_authority = &ctx.accounts.transfer_authority;
        let escrow_payment_account = &ctx.accounts.escrow_payment_account;
        let authority = &ctx.accounts.authority;
        let auction_house = &ctx.accounts.auction_house;
        let auction_house_fee_account = &ctx.accounts.auction_house_fee_account;
        let treasury_mint = &ctx.accounts.treasury_mint;
        let system_program = &ctx.accounts.system_program;
        let token_program = &ctx.accounts.token_program;
        let rent = &ctx.accounts.rent;

        let auction_house_key = auction_house.key();
        let seeds = [
            PREFIX.as_bytes(),
            auction_house_key.as_ref(),
            FEE_PAYER.as_bytes(),
            &[auction_house.fee_payer_bump],
        ];
        let wallet_key = wallet.key();

        let escrow_signer_seeds = [
            PREFIX.as_bytes(),
            auction_house_key.as_ref(),
            wallet_key.as_ref(),
            &[escrow_payment_bump],
        ];

        let (fee_payer, fee_seeds) = get_fee_payer(
            authority,
            auction_house,
            wallet.to_account_info(),
            auction_house_fee_account.to_account_info(),
            &seeds,
        )?;

        let is_native = treasury_mint.key() == spl_token::native_mint::id();

        create_program_token_account_if_not_present(
            escrow_payment_account,
            system_program,
            &fee_payer,
            token_program,
            treasury_mint,
            &auction_house.to_account_info(),
            rent,
            &escrow_signer_seeds,
            fee_seeds,
            is_native,
        )?;

        if !is_native {
            assert_is_ata(payment_account, &wallet.key(), &treasury_mint.key())?;
            invoke(
                &spl_token::instruction::transfer(
                    token_program.key,
                    &payment_account.key(),
                    &escrow_payment_account.key(),
                    &transfer_authority.key(),
                    &[],
                    amount,
                )?,
                &[
                    escrow_payment_account.to_account_info(),
                    payment_account.to_account_info(),
                    token_program.to_account_info(),
                    transfer_authority.to_account_info(),
                ],
            )?;
        } else {
            assert_keys_equal(payment_account.key(), wallet.key())?;
            // Reach rental exemption and then
            let checked_amount = rent_checked_add(escrow_payment_account.to_account_info(), 0)?
                .checked_add(amount)
                .ok_or(ErrorCode::NumericalOverflow)?;
            invoke(
                &system_instruction::transfer(
                    &payment_account.key(),
                    &escrow_payment_account.key(),
                    checked_amount,
                ),
                &[
                    escrow_payment_account.to_account_info(),
                    payment_account.to_account_info(),
                    system_program.to_account_info(),
                ],
            )?;
        }

        Ok(())
    }

    /// Cancel a bid or ask by revoking the token delegate, transferring all lamports from the trade state account to the fee payer, and setting the trade state account data to zero so it can be garbage collected.
    pub fn cancel<'info>(
        ctx: Context<'_, '_, '_, 'info, Cancel<'info>>,
        buyer_price: u64,
        token_size: u64,
    ) -> Result<()> {
        let wallet = &ctx.accounts.wallet;
        let token_account = &ctx.accounts.token_account;
        let token_mint = &ctx.accounts.token_mint;
        let authority = &ctx.accounts.authority;
        let auction_house = &ctx.accounts.auction_house;
        let auction_house_fee_account = &ctx.accounts.auction_house_fee_account;
        let trade_state = &ctx.accounts.trade_state;
        let token_program = &ctx.accounts.token_program;
        let ts_bump = trade_state.try_borrow_data()?[0];
        assert_valid_trade_state(
            &wallet.key(),
            auction_house,
            buyer_price,
            token_size,
            &trade_state.to_account_info(),
            &token_account.mint.key(),
            &token_account.key(),
            ts_bump,
        )?;
        assert_keys_equal(token_mint.key(), token_account.mint)?;
        if !wallet.to_account_info().is_signer && !authority.to_account_info().is_signer {
            return Err(ErrorCode::NoValidSignerPresent.into());
        }

        let auction_house_key = auction_house.key();
        let seeds = [
            PREFIX.as_bytes(),
            auction_house_key.as_ref(),
            FEE_PAYER.as_bytes(),
            &[auction_house.fee_payer_bump],
        ];

        let (fee_payer, _) = get_fee_payer(
            authority,
            auction_house,
            wallet.to_account_info(),
            auction_house_fee_account.to_account_info(),
            &seeds,
        )?;

        if token_account.owner == wallet.key() && wallet.is_signer {
            invoke(
                &revoke(
                    &token_program.key(),
                    &token_account.key(),
                    &wallet.key(),
                    &[],
                )
                .unwrap(),
                &[
                    token_program.to_account_info(),
                    token_account.to_account_info(),
                    wallet.to_account_info(),
                ],
            )?;
        }

        let curr_lamp = trade_state.lamports();
        **trade_state.lamports.borrow_mut() = 0;

        **fee_payer.lamports.borrow_mut() = fee_payer
            .lamports()
            .checked_add(curr_lamp)
            .ok_or(ErrorCode::NumericalOverflow)?;
        sol_memset(*trade_state.try_borrow_mut_data()?, 0, TRADE_STATE_SIZE);
        Ok(())
    }

    /// Execute sale between provided buyer and seller trade state accounts transferring funds to seller wallet and token to buyer wallet.
    #[inline(never)]
    pub fn execute_sale<'info>(
        ctx: Context<'_, '_, '_, 'info, ExecuteSale<'info>>,
        escrow_payment_bump: u8,
        _free_trade_state_bump: u8,
        program_as_signer_bump: u8,
        buyer_price: u64,
        token_size: u64,
    ) -> Result<()> {
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
        let free_trade_state = &ctx.accounts.free_trade_state;
        let token_program = &ctx.accounts.token_program;
        let system_program = &ctx.accounts.system_program;
        let ata_program = &ctx.accounts.ata_program;
        let program_as_signer = &ctx.accounts.program_as_signer;
        let rent = &ctx.accounts.rent;

        let metadata_clone = metadata.to_account_info();
        let escrow_clone = escrow_payment_account.to_account_info();
        let auction_house_clone = auction_house.to_account_info();
        let ata_clone = ata_program.to_account_info();
        let token_clone = token_program.to_account_info();
        let sys_clone = system_program.to_account_info();
        let rent_clone = rent.to_account_info();
        let treasury_clone = auction_house_treasury.to_account_info();
        let authority_clone = authority.to_account_info();
        let buyer_receipt_clone = buyer_receipt_token_account.to_account_info();
        let token_account_clone = token_account.to_account_info();

        let is_native = treasury_mint.key() == spl_token::native_mint::id();

        if buyer_price == 0 && !authority_clone.is_signer && !seller.is_signer {
            return Err(ErrorCode::CannotMatchFreeSalesWithoutAuctionHouseOrSellerSignoff.into());
        }

        let token_account_mint = get_mint_from_token_account(&token_account_clone)?;

        assert_keys_equal(token_mint.key(), token_account_mint)?;
        let delegate = get_delegate_from_token_account(&token_account_clone)?;
        if let Some(d) = delegate {
            assert_keys_equal(program_as_signer.key(), d)?;
        } else {
            msg!("No delegate detected on token account.");
            return Err(ErrorCode::BothPartiesNeedToAgreeToSale.into());
        }
        let buyer_ts_data = &mut buyer_trade_state.try_borrow_mut_data()?;
        let seller_ts_data = &mut seller_trade_state.try_borrow_mut_data()?;
        let ts_bump = buyer_ts_data[0];
        assert_valid_trade_state(
            &buyer.key(),
            auction_house,
            buyer_price,
            token_size,
            buyer_trade_state,
            &token_mint.key(),
            &token_account.key(),
            ts_bump,
        )?;
        if ts_bump == 0 || buyer_ts_data.len() == 0 || seller_ts_data.len() == 0 {
            return Err(ErrorCode::BothPartiesNeedToAgreeToSale.into());
        }

        let auction_house_key = auction_house.key();
        let seeds = [
            PREFIX.as_bytes(),
            auction_house_key.as_ref(),
            FEE_PAYER.as_bytes(),
            &[auction_house.fee_payer_bump],
        ];

        let wallet_to_use = if buyer.is_signer { buyer } else { seller };

        let (fee_payer, fee_payer_seeds) = get_fee_payer(
            authority,
            auction_house,
            wallet_to_use.to_account_info(),
            auction_house_fee_account.to_account_info(),
            &seeds,
        )?;
        let fee_payer_clone = fee_payer.to_account_info();

        assert_is_ata(
            &token_account.to_account_info(),
            &seller.key(),
            &token_account_mint,
        )?;
        assert_derivation(
            &mpl_token_metadata::id(),
            &metadata.to_account_info(),
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                token_account_mint.as_ref(),
            ],
        )?;

        if metadata.data_is_empty() {
            return Err(ErrorCode::MetadataDoesntExist.into());
        }

        let auction_house_key = auction_house.key();
        let wallet_key = buyer.key();
        let escrow_signer_seeds = [
            PREFIX.as_bytes(),
            auction_house_key.as_ref(),
            wallet_key.as_ref(),
            &[escrow_payment_bump],
        ];

        let ah_seeds = [
            PREFIX.as_bytes(),
            auction_house.creator.as_ref(),
            auction_house.treasury_mint.as_ref(),
            &[auction_house.bump],
        ];

        // with the native account, the escrow is its own owner,
        // whereas with token, it is the auction house that is owner.
        let signer_seeds_for_royalties = if is_native {
            escrow_signer_seeds
        } else {
            ah_seeds
        };

        let buyer_leftover_after_royalties = pay_creator_fees(
            &mut ctx.remaining_accounts.iter(),
            &metadata_clone,
            &escrow_clone,
            &auction_house_clone,
            &fee_payer_clone,
            &treasury_mint.to_account_info(),
            &ata_clone,
            &token_clone,
            &sys_clone,
            &rent_clone,
            &signer_seeds_for_royalties,
            &fee_payer_seeds,
            buyer_price,
            is_native,
        )?;

        let auction_house_fee_paid = pay_auction_house_fees(
            &auction_house,
            &treasury_clone,
            &escrow_clone,
            &token_clone,
            &sys_clone,
            &signer_seeds_for_royalties,
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
                    &auction_house.key(),
                    &[],
                    buyer_leftover_after_royalties_and_house_fee,
                )?,
                &[
                    escrow_payment_account.to_account_info(),
                    seller_payment_receipt_account.to_account_info(),
                    token_program.to_account_info(),
                    auction_house.to_account_info(),
                ],
                &[&ah_seeds],
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

        let buyer_rec_acct = assert_is_ata(&buyer_receipt_clone, &buyer.key(), &token_mint.key())?;

        // make sure you cant get rugged
        if buyer_rec_acct.delegate.is_some() {
            return Err(ErrorCode::BuyerATACannotHaveDelegate.into());
        }

        let program_as_signer_seeds = [
            PREFIX.as_bytes(),
            SIGNER.as_bytes(),
            &[program_as_signer_bump],
        ];

        invoke_signed(
            &spl_token::instruction::transfer(
                token_program.key,
                &token_account.key(),
                &buyer_receipt_token_account.key(),
                &program_as_signer.key(),
                &[],
                token_size,
            )?,
            &[
                token_account.to_account_info(),
                buyer_receipt_clone,
                program_as_signer.to_account_info(),
                token_clone,
            ],
            &[&program_as_signer_seeds],
        )?;

        let curr_seller_lamp = seller_trade_state.lamports();
        **seller_trade_state.lamports.borrow_mut() = 0;
        sol_memset(&mut *seller_ts_data, 0, TRADE_STATE_SIZE);

        **fee_payer.lamports.borrow_mut() = fee_payer
            .lamports()
            .checked_add(curr_seller_lamp)
            .ok_or(ErrorCode::NumericalOverflow)?;

        let curr_buyer_lamp = buyer_trade_state.lamports();
        **buyer_trade_state.lamports.borrow_mut() = 0;
        sol_memset(&mut *buyer_ts_data, 0, TRADE_STATE_SIZE);
        **fee_payer.lamports.borrow_mut() = fee_payer
            .lamports()
            .checked_add(curr_buyer_lamp)
            .ok_or(ErrorCode::NumericalOverflow)?;

        if free_trade_state.lamports() > 0 {
            let curr_buyer_lamp = free_trade_state.lamports();
            **free_trade_state.lamports.borrow_mut() = 0;

            **fee_payer.lamports.borrow_mut() = fee_payer
                .lamports()
                .checked_add(curr_buyer_lamp)
                .ok_or(ErrorCode::NumericalOverflow)?;
            sol_memset(
                *free_trade_state.try_borrow_mut_data()?,
                0,
                TRADE_STATE_SIZE,
            );
        }
        Ok(())
    }

    /// Create a sell bid by creating a `seller_trade_state` account and approving the program as the token delegate.
    pub fn sell<'info>(
        ctx: Context<'_, '_, '_, 'info, Sell<'info>>,
        trade_state_bump: u8,
        _free_trade_state_bump: u8,
        _program_as_signer_bump: u8,
        buyer_price: u64,
        token_size: u64,
    ) -> Result<()> {
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
        let program_as_signer = &ctx.accounts.program_as_signer;
        let rent = &ctx.accounts.rent;

        // Wallet has to be a signer but there are different kinds of errors when it's not.
        if !wallet.to_account_info().is_signer {
            if buyer_price == 0 {
                return Err(ErrorCode::SaleRequiresSigner.into());
            } else {
                if free_seller_trade_state.data_is_empty() {
                    return Err(ErrorCode::SaleRequiresSigner.into());
                } else if !free_seller_trade_state.data_is_empty()
                    && (!authority.to_account_info().is_signer
                        || !auction_house.can_change_sale_price)
                {
                    return Err(ErrorCode::SaleRequiresSigner.into());
                }
            }
        }

        let auction_house_key = auction_house.key();

        let seeds = [
            PREFIX.as_bytes(),
            auction_house_key.as_ref(),
            FEE_PAYER.as_bytes(),
            &[auction_house.fee_payer_bump],
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

        if wallet.is_signer {
            invoke(
                &approve(
                    &token_program.key(),
                    &token_account.key(),
                    &program_as_signer.key(),
                    &wallet.key(),
                    &[],
                    token_size,
                )
                .unwrap(),
                &[
                    token_program.to_account_info(),
                    token_account.to_account_info(),
                    program_as_signer.to_account_info(),
                    wallet.to_account_info(),
                ],
            )?;
        }

        let ts_info = seller_trade_state.to_account_info();
        if ts_info.data_is_empty() {
            let token_account_key = token_account.key();
            let wallet_key = wallet.key();
            let ts_seeds = [
                PREFIX.as_bytes(),
                wallet_key.as_ref(),
                auction_house_key.as_ref(),
                token_account_key.as_ref(),
                auction_house.treasury_mint.as_ref(),
                token_account.mint.as_ref(),
                &buyer_price.to_le_bytes(),
                &token_size.to_le_bytes(),
                &[trade_state_bump],
            ];
            create_or_allocate_account_raw(
                *ctx.program_id,
                &ts_info,
                &rent.to_account_info(),
                &system_program,
                &fee_payer,
                TRADE_STATE_SIZE,
                fee_seeds,
                &ts_seeds,
            )?;
        }

        let data = &mut ts_info.data.borrow_mut();
        data[0] = trade_state_bump;

        Ok(())
    }

    /// Create a private buy bid by creating a `buyer_trade_state` account and an `escrow_payment` account and funding the escrow with the necessary SOL or SPL token amount.
    pub fn buy<'info>(
        ctx: Context<'_, '_, '_, 'info, Buy<'info>>,
        trade_state_bump: u8,
        escrow_payment_bump: u8,
        buyer_price: u64,
        token_size: u64,
    ) -> Result<()> {
        private_bid(
            ctx,
            trade_state_bump,
            escrow_payment_bump,
            buyer_price,
            token_size,
        )
    }

    /// Create a public buy bid by creating a `public_buyer_trade_state` account and an `escrow_payment` account and funding the escrow with the necessary SOL or SPL token amount.
    pub fn public_buy<'info>(
        ctx: Context<'_, '_, '_, 'info, PublicBuy<'info>>,
        trade_state_bump: u8,
        escrow_payment_bump: u8,
        buyer_price: u64,
        token_size: u64,
    ) -> Result<()> {
        public_bid(
            ctx,
            trade_state_bump,
            escrow_payment_bump,
            buyer_price,
            token_size,
        )
    }

    /// Close the escrow account of the user.
    pub fn close_escrow_account<'info>(
        ctx: Context<'_, '_, '_, 'info, CloseEscrowAccount<'info>>,
        escrow_payment_bump: u8,
    ) -> Result<()> {
        let auction_house_key = ctx.accounts.auction_house.key();
        let wallet_key = ctx.accounts.wallet.key();

        let escrow_signer_seeds = [
            PREFIX.as_bytes(),
            auction_house_key.as_ref(),
            wallet_key.as_ref(),
            &[escrow_payment_bump],
        ];

        invoke_signed(
            &system_instruction::transfer(
                &ctx.accounts.escrow_payment_account.key(),
                &ctx.accounts.wallet.key(),
                ctx.accounts.escrow_payment_account.lamports(),
            ),
            &[
                ctx.accounts.escrow_payment_account.to_account_info(),
                ctx.accounts.wallet.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[&escrow_signer_seeds],
        )?;
        Ok(())
    }

    /// Create a listing receipt by creating a `listing_receipt` account.
    pub fn print_listing_receipt<'info>(
        ctx: Context<'_, '_, '_, 'info, PrintListingReceipt<'info>>,
        receipt_bump: u8,
    ) -> Result<()> {
        receipt::print_listing_receipt(ctx, receipt_bump)
    }

    /// Cancel an active listing receipt by setting the `canceled_at` field to the current time.
    pub fn cancel_listing_receipt<'info>(
        ctx: Context<'_, '_, '_, 'info, CancelListingReceipt<'info>>,
    ) -> Result<()> {
        receipt::cancel_listing_receipt(ctx)
    }

    /// Create a bid receipt by creating a `bid_receipt` account.
    pub fn print_bid_receipt<'info>(
        ctx: Context<'_, '_, '_, 'info, PrintBidReceipt<'info>>,
        receipt_bump: u8,
    ) -> Result<()> {
        receipt::print_bid_receipt(ctx, receipt_bump)
    }

    /// Cancel an active bid receipt by setting the `canceled_at` field to the current time.
    pub fn cancel_bid_receipt<'info>(
        ctx: Context<'_, '_, '_, 'info, CancelBidReceipt<'info>>,
    ) -> Result<()> {
        receipt::cancel_bid_receipt(ctx)
    }

    /// Create a purchase receipt by creating a `purchase_receipt` account.
    pub fn print_purchase_receipt<'info>(
        ctx: Context<'_, '_, '_, 'info, PrintPurchaseReceipt<'info>>,
        purchase_receipt_bump: u8,
    ) -> Result<()> {
        receipt::print_purchase_receipt(ctx, purchase_receipt_bump)
    }
}

/// Accounts for the [`sell` handler](auction_house/fn.sell.html).
#[derive(Accounts)]
#[instruction(trade_state_bump: u8, free_trade_state_bump: u8, program_as_signer_bump: u8, buyer_price: u64, token_size: u64)]
pub struct Sell<'info> {
    /// User wallet account.
    /// CHECK: Verified through CPI
    pub wallet: UncheckedAccount<'info>,
    #[account(mut)]
    /// SPL token account containing token for sale.
    pub token_account: Account<'info, TokenAccount>,
    /// Metaplex metadata account decorating SPL mint account.
    /// CHECK: Verified through CPI
    pub metadata: UncheckedAccount<'info>,
    /// Auction House authority account.
    /// CHECK: Verified through CPI
    pub authority: UncheckedAccount<'info>,
    /// Auction House instance PDA account.
    #[account(seeds=[PREFIX.as_bytes(), auction_house.creator.as_ref(), auction_house.treasury_mint.as_ref()], bump=auction_house.bump, has_one=authority, has_one=auction_house_fee_account)]
    pub auction_house: Account<'info, AuctionHouse>,
    /// Auction House instance fee account.
    /// CHECK: Not dangerous. Account seeds checked in constraint.
    #[account(mut, seeds=[PREFIX.as_bytes(), auction_house.key().as_ref(), FEE_PAYER.as_bytes()], bump=auction_house.fee_payer_bump)]
    pub auction_house_fee_account: UncheckedAccount<'info>,
    /// Seller trade state PDA account encoding the sell order.
    /// CHECK: Not dangerous. Account seeds checked in constraint.
    #[account(mut, seeds=[PREFIX.as_bytes(), wallet.key().as_ref(), auction_house.key().as_ref(), token_account.key().as_ref(), auction_house.treasury_mint.as_ref(), token_account.mint.as_ref(), &buyer_price.to_le_bytes(), &token_size.to_le_bytes()], bump=trade_state_bump)]
    pub seller_trade_state: UncheckedAccount<'info>,
    /// Free seller trade state PDA account encoding a free sell order.
    /// CHECK: Not dangerous. Account seeds checked in constraint.
    #[account(mut, seeds=[PREFIX.as_bytes(), wallet.key().as_ref(), auction_house.key().as_ref(), token_account.key().as_ref(), auction_house.treasury_mint.as_ref(), token_account.mint.as_ref(), &0u64.to_le_bytes(), &token_size.to_le_bytes()], bump=free_trade_state_bump)]
    pub free_seller_trade_state: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    /// CHECK: Not dangerous. Account seeds checked in constraint.
    #[account(seeds=[PREFIX.as_bytes(), SIGNER.as_bytes()], bump=program_as_signer_bump)]
    pub program_as_signer: UncheckedAccount<'info>,
    pub rent: Sysvar<'info, Rent>,
}

/// Accounts for the [`execute_sale` handler](auction_house/fn.execute_sale.html).
#[derive(Accounts)]
#[instruction(escrow_payment_bump: u8, free_trade_state_bump: u8, program_as_signer_bump: u8, buyer_price: u64, token_size: u64)]
pub struct ExecuteSale<'info> {
    /// Buyer user wallet account.
    /// CHECK: Verified through CPI
    #[account(mut)]
    pub buyer: UncheckedAccount<'info>,
    /// Seller user wallet account.
    /// CHECK: Verified through CPI
    #[account(mut)]
    pub seller: UncheckedAccount<'info>,
    // cannot mark these as real Accounts or else we blow stack size limit
    /// Token account where the SPL token is stored.
    /// CHECK: Verified through CPI
    #[account(mut)]
    pub token_account: UncheckedAccount<'info>,
    /// Token mint account for the SPL token.
    /// CHECK: Verified through CPI
    pub token_mint: UncheckedAccount<'info>,
    /// Metaplex metadata account decorating SPL mint account.
    /// CHECK: Verified through CPI
    pub metadata: UncheckedAccount<'info>,
    /// Auction House treasury mint account.
    pub treasury_mint: Box<Account<'info, Mint>>,
    /// Buyer escrow payment account.
    /// CHECK: Not dangerous. Account seeds checked in constraint.
    #[account(mut, seeds=[PREFIX.as_bytes(), auction_house.key().as_ref(), buyer.key().as_ref()], bump=escrow_payment_bump)]
    pub escrow_payment_account: UncheckedAccount<'info>,
    /// Seller SOL or SPL account to receive payment at.
    /// CHECK: Verified through CPI
    #[account(mut)]
    pub seller_payment_receipt_account: UncheckedAccount<'info>,
    /// Buyer SPL token account to receive purchased item at.
    /// CHECK: Verified through CPI
    #[account(mut)]
    pub buyer_receipt_token_account: UncheckedAccount<'info>,
    /// Auction House instance authority.
    /// CHECK: Verified through CPI
    pub authority: UncheckedAccount<'info>,
    /// Auction House instance PDA account.
    #[account(seeds=[PREFIX.as_bytes(), auction_house.creator.as_ref(), auction_house.treasury_mint.as_ref()], bump=auction_house.bump, has_one=authority, has_one=treasury_mint, has_one=auction_house_treasury, has_one=auction_house_fee_account)]
    pub auction_house: Box<Account<'info, AuctionHouse>>,
    /// Auction House instance fee account.
    /// CHECK: Not dangerous. Account seeds checked in constraint.
    #[account(mut, seeds=[PREFIX.as_bytes(), auction_house.key().as_ref(), FEE_PAYER.as_bytes()], bump=auction_house.fee_payer_bump)]
    pub auction_house_fee_account: UncheckedAccount<'info>,
    /// Auction House instance treasury account.
    /// CHECK: Not dangerous. Account seeds checked in constraint.
    #[account(mut, seeds=[PREFIX.as_bytes(), auction_house.key().as_ref(), TREASURY.as_bytes()], bump=auction_house.treasury_bump)]
    pub auction_house_treasury: UncheckedAccount<'info>,
    /// Buyer trade state PDA account encoding the buy order.
    /// CHECK: Verified through CPI
    #[account(mut)]
    pub buyer_trade_state: UncheckedAccount<'info>,
    /// Seller trade state PDA account encoding the sell order.
    /// CHECK: Not dangerous. Account seeds checked in constraint.
    #[account(mut, seeds=[PREFIX.as_bytes(), seller.key().as_ref(), auction_house.key().as_ref(), token_account.key().as_ref(), auction_house.treasury_mint.as_ref(), token_mint.key().as_ref(), &buyer_price.to_le_bytes(), &token_size.to_le_bytes()], bump=seller_trade_state.to_account_info().data.borrow()[0])]
    pub seller_trade_state: UncheckedAccount<'info>,
    /// Free seller trade state PDA account encoding a free sell order.
    /// CHECK: Not dangerous. Account seeds checked in constraint.
    #[account(mut, seeds=[PREFIX.as_bytes(), seller.key().as_ref(), auction_house.key().as_ref(), token_account.key().as_ref(), auction_house.treasury_mint.as_ref(), token_mint.key().as_ref(), &0u64.to_le_bytes(), &token_size.to_le_bytes()], bump=free_trade_state_bump)]
    pub free_trade_state: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub ata_program: Program<'info, AssociatedToken>,
    /// CHECK: Not dangerous. Account seeds checked in constraint.
    #[account(seeds=[PREFIX.as_bytes(), SIGNER.as_bytes()], bump=program_as_signer_bump)]
    pub program_as_signer: UncheckedAccount<'info>,
    pub rent: Sysvar<'info, Rent>,
}

/// Accounts for the [`deposit` handler](auction_house/fn.deposit.html).
#[derive(Accounts)]
#[instruction(escrow_payment_bump: u8)]
pub struct Deposit<'info> {
    /// User wallet account.
    pub wallet: Signer<'info>,
    /// User SOL or SPL account to transfer funds from.
    /// CHECK: Verified through CPI
    #[account(mut)]
    pub payment_account: UncheckedAccount<'info>,
    /// SPL token account transfer authority.
    /// CHECK: Verified through CPI
    pub transfer_authority: UncheckedAccount<'info>,
    /// Buyer escrow payment account PDA.
    /// CHECK: Not dangerous. Account seeds checked in constraint.
    #[account(mut, seeds=[PREFIX.as_bytes(), auction_house.key().as_ref(), wallet.key().as_ref()], bump=escrow_payment_bump)]
    pub escrow_payment_account: UncheckedAccount<'info>,
    /// Auction House instance treasury mint account.
    pub treasury_mint: Account<'info, Mint>,
    /// Auction House instance authority account.
    /// CHECK: Verified through CPI
    pub authority: UncheckedAccount<'info>,
    /// Auction House instance PDA account.
    #[account(seeds=[PREFIX.as_bytes(), auction_house.creator.as_ref(), auction_house.treasury_mint.as_ref()], bump=auction_house.bump, has_one=authority, has_one=treasury_mint, has_one=auction_house_fee_account)]
    pub auction_house: Account<'info, AuctionHouse>,
    /// Auction House instance fee account.
    /// CHECK: Not dangerous. Account seeds checked in constraint.
    #[account(mut, seeds=[PREFIX.as_bytes(), auction_house.key().as_ref(), FEE_PAYER.as_bytes()], bump=auction_house.fee_payer_bump)]
    pub auction_house_fee_account: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

/// Accounts for the [`withdraw` handler](auction_house/fn.withdraw.html).
#[derive(Accounts)]
#[instruction(escrow_payment_bump: u8)]
pub struct Withdraw<'info> {
    /// User wallet account.
    /// CHECK: Verified through CPI
    pub wallet: UncheckedAccount<'info>,
    /// SPL token account or native SOL account to transfer funds to. If the account is a native SOL account, this is the same as the wallet address.
    /// CHECK: Verified through CPI
    #[account(mut)]
    pub receipt_account: UncheckedAccount<'info>,
    /// Buyer escrow payment account PDA.
    /// CHECK: Not dangerous. Account seeds checked in constraint.
    #[account(mut, seeds=[PREFIX.as_bytes(), auction_house.key().as_ref(), wallet.key().as_ref()], bump=escrow_payment_bump)]
    pub escrow_payment_account: UncheckedAccount<'info>,
    /// Auction House instance treasury mint account.
    pub treasury_mint: Account<'info, Mint>,
    /// Auction House instance authority account.
    /// CHECK: Verified through CPI
    pub authority: UncheckedAccount<'info>,
    /// Auction House instance PDA account.
    #[account(seeds=[PREFIX.as_bytes(), auction_house.creator.as_ref(), auction_house.treasury_mint.as_ref()], bump=auction_house.bump, has_one=authority, has_one=treasury_mint, has_one=auction_house_fee_account)]
    pub auction_house: Account<'info, AuctionHouse>,
    /// Auction House instance fee account.
    /// CHECK: Not dangerous. Account seeds checked in constraint.
    #[account(mut, seeds=[PREFIX.as_bytes(), auction_house.key().as_ref(), FEE_PAYER.as_bytes()], bump=auction_house.fee_payer_bump)]
    pub auction_house_fee_account: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub ata_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

/// Accounts for the [`cancel` handler](auction_house/fn.cancel.html).
#[derive(Accounts)]
#[instruction(buyer_price: u64, token_size: u64)]
pub struct Cancel<'info> {
    /// User wallet account.
    /// CHECK: Verified through CPI
    #[account(mut)]
    pub wallet: UncheckedAccount<'info>,
    /// SPL token account containing the token of the sale to be canceled.
    #[account(mut)]
    pub token_account: Account<'info, TokenAccount>,
    /// Token mint account of SPL token.
    pub token_mint: Account<'info, Mint>,
    /// Auction House instance authority account.
    /// CHECK: Verified through CPI
    pub authority: UncheckedAccount<'info>,
    /// Auction House instance PDA account.
    #[account(seeds=[PREFIX.as_bytes(), auction_house.creator.as_ref(), auction_house.treasury_mint.as_ref()], bump=auction_house.bump, has_one=authority, has_one=auction_house_fee_account)]
    pub auction_house: Account<'info, AuctionHouse>,
    /// Auction House instance fee account.
    /// CHECK: Not dangerous. Account seeds checked in constraint.
    #[account(mut, seeds=[PREFIX.as_bytes(), auction_house.key().as_ref(), FEE_PAYER.as_bytes()], bump=auction_house.fee_payer_bump)]
    pub auction_house_fee_account: UncheckedAccount<'info>,
    /// Trade state PDA account representing the bid or ask to be canceled.
    /// CHECK: Verified through CPI
    #[account(mut)]
    pub trade_state: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

/// Accounts for the [`create_auction_house` handler](auction_house/fn.create_auction_house.html).
#[derive(Accounts)]
#[instruction(_bump: u8, fee_payer_bump: u8, treasury_bump: u8)]
pub struct CreateAuctionHouse<'info> {
    /// Treasury mint account, either native SOL mint or a SPL token mint.
    pub treasury_mint: Account<'info, Mint>,
    /// Key paying SOL fees for setting up the Auction House.
    #[account(mut)]
    pub payer: Signer<'info>,
    // Authority key for the Auction House.
    /// CHECK: Verified through CPI
    pub authority: UncheckedAccount<'info>,
    /// Account that pays for fees if the marketplace executes sales.
    /// CHECK: Verified through CPI
    #[account(mut)]
    pub fee_withdrawal_destination: UncheckedAccount<'info>,
    /// SOL or SPL token account to receive Auction House fees. If treasury mint is native this will be the same as the `treasury_withdrawl_destination_owner`.
    /// CHECK: Verified through CPI
    #[account(mut)]
    pub treasury_withdrawal_destination: UncheckedAccount<'info>,
    /// Owner of the `treasury_withdrawal_destination` account or the same address if the `treasury_mint` is native.
    /// CHECK: Verified through CPI
    pub treasury_withdrawal_destination_owner: UncheckedAccount<'info>,
    /// Auction House instance PDA account.
    #[account(init, seeds=[PREFIX.as_bytes(), authority.key().as_ref(), treasury_mint.key().as_ref()], bump, space=AUCTION_HOUSE_SIZE, payer=payer)]
    pub auction_house: Account<'info, AuctionHouse>,
    /// Auction House instance fee account.
    /// CHECK: Not dangerous. Account seeds checked in constraint.
    #[account(mut, seeds=[PREFIX.as_bytes(), auction_house.key().as_ref(), FEE_PAYER.as_bytes()], bump=fee_payer_bump)]
    pub auction_house_fee_account: UncheckedAccount<'info>,
    /// Auction House instance treasury PDA account.
    /// CHECK: Not dangerous. Account seeds checked in constraint.
    #[account(mut, seeds=[PREFIX.as_bytes(), auction_house.key().as_ref(), TREASURY.as_bytes()], bump=treasury_bump)]
    pub auction_house_treasury: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub ata_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

/// Accounts for the [`update_auction_house` handler](auction_house/fn.update_auction_house.html).
#[derive(Accounts)]
pub struct UpdateAuctionHouse<'info> {
    /// Treasury mint account, either native SOL mint or a SPL token mint.
    pub treasury_mint: Account<'info, Mint>,
    /// Key paying SOL fees for setting up the Auction House.
    pub payer: Signer<'info>,
    /// Authority key for the Auction House.
    pub authority: Signer<'info>,
    /// New authority key for the Auction House.
    /// CHECK: Verified through CPI
    pub new_authority: UncheckedAccount<'info>,
    /// Account that pays for fees if the marketplace executes sales.
    /// CHECK: Verified through CPI
    #[account(mut)]
    pub fee_withdrawal_destination: UncheckedAccount<'info>,
    /// SOL or SPL token account to receive Auction House fees. If treasury mint is native this will be the same as the `treasury_withdrawl_destination_owner`.
    /// CHECK: Verified through CPI
    #[account(mut)]
    pub treasury_withdrawal_destination: UncheckedAccount<'info>,
    /// Owner of the `treasury_withdrawal_destination` account or the same address if the `treasury_mint` is native.
    /// CHECK: Verified through CPI
    pub treasury_withdrawal_destination_owner: UncheckedAccount<'info>,
    /// Auction House instance PDA account.
    #[account(mut, seeds=[PREFIX.as_bytes(), auction_house.creator.as_ref(), treasury_mint.key().as_ref()], bump=auction_house.bump, has_one=authority, has_one=treasury_mint)]
    pub auction_house: Account<'info, AuctionHouse>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub ata_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

/// Accounts for the [`withdraw_from_treasury` handler](auction_house/fn.withdraw_from_treasury.html).
#[derive(Accounts)]
pub struct WithdrawFromTreasury<'info> {
    /// Treasury mint account, either native SOL mint or a SPL token mint.
    pub treasury_mint: Account<'info, Mint>,
    /// Authority key for the Auction House.
    pub authority: Signer<'info>,
    /// SOL or SPL token account to receive Auction House fees. If treasury mint is native this will be the same as the `treasury_withdrawl_destination_owner`.
    /// CHECK: Verified through CPI
    #[account(mut)]
    pub treasury_withdrawal_destination: UncheckedAccount<'info>,
    /// Auction House treasury PDA account.
    /// CHECK: Not dangerous. Account seeds checked in constraint.
    #[account(mut, seeds=[PREFIX.as_bytes(), auction_house.key().as_ref(), TREASURY.as_bytes()], bump=auction_house.treasury_bump)]
    pub auction_house_treasury: UncheckedAccount<'info>,
    /// Auction House instance PDA account.
    #[account(mut, seeds=[PREFIX.as_bytes(), auction_house.creator.as_ref(), treasury_mint.key().as_ref()], bump=auction_house.bump, has_one=authority, has_one=treasury_mint, has_one=treasury_withdrawal_destination, has_one=auction_house_treasury)]
    pub auction_house: Account<'info, AuctionHouse>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

/// Accounts for the [`withdraw_from_fee` handler](auction_house/fn.withdraw_from_fee.html).
#[derive(Accounts)]
pub struct WithdrawFromFee<'info> {
    /// Authority key for the Auction House.
    pub authority: Signer<'info>,
    /// Account that pays for fees if the marketplace executes sales.
    /// CHECK: Verified through CPI
    #[account(mut)]
    pub fee_withdrawal_destination: UncheckedAccount<'info>,
    /// Auction House instance fee account.
    /// CHECK: Not dangerous. Account seeds checked in constraint.
    #[account(mut, seeds=[PREFIX.as_bytes(), auction_house.key().as_ref(), FEE_PAYER.as_bytes()], bump=auction_house.fee_payer_bump)]
    pub auction_house_fee_account: UncheckedAccount<'info>,
    /// Auction House instance PDA account.
    #[account(mut, seeds=[PREFIX.as_bytes(), auction_house.creator.as_ref(), auction_house.treasury_mint.key().as_ref()], bump=auction_house.bump, has_one=authority, has_one=fee_withdrawal_destination, has_one=auction_house_fee_account)]
    pub auction_house: Account<'info, AuctionHouse>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(escrow_payment_bump: u8)]
pub struct CloseEscrowAccount<'info> {
    /// User wallet account.
    pub wallet: Signer<'info>,
    /// CHECK: Account seeds checked in constraint.
    /// Buyer escrow payment account PDA.
    #[account(mut, seeds=[PREFIX.as_bytes(), auction_house.key().as_ref(), wallet.key().as_ref()], bump=escrow_payment_bump)]
    pub escrow_payment_account: UncheckedAccount<'info>,
    /// Auction House instance PDA account.
    #[account(seeds=[PREFIX.as_bytes(), auction_house.creator.as_ref(), auction_house.treasury_mint.as_ref()], bump=auction_house.bump)]
    pub auction_house: Account<'info, AuctionHouse>,
    pub system_program: Program<'info, System>,
}

pub const AUCTION_HOUSE_SIZE: usize = 8 + // key
32 + //fee payer
32 + //treasury
32 + //treasury_withdrawal_destination
32 + //fee withdrawal destination
32 + //treasury mint
32 + //authority
32 + // creator
1 + // bump
1 + // treasury_bump
1 + // fee_payer_bump
2 + // seller fee basis points
1 + // requires sign off
1 + // can change sale price
220; //padding

#[account]
pub struct AuctionHouse {
    pub auction_house_fee_account: Pubkey,
    pub auction_house_treasury: Pubkey,
    pub treasury_withdrawal_destination: Pubkey,
    pub fee_withdrawal_destination: Pubkey,
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

#[error_code]
pub enum ErrorCode {
    #[msg("PublicKeyMismatch")] // 0
    PublicKeyMismatch,
    #[msg("InvalidMintAuthority")] // 1
    InvalidMintAuthority,
    #[msg("UninitializedAccount")] // 2
    UninitializedAccount,
    #[msg("IncorrectOwner")] // 3
    IncorrectOwner,
    #[msg("PublicKeysShouldBeUnique")] // 4
    PublicKeysShouldBeUnique,
    #[msg("StatementFalse")] // 5
    StatementFalse,
    #[msg("NotRentExempt")] // 6
    NotRentExempt,
    #[msg("NumericalOverflow")] // 7
    NumericalOverflow,
    #[msg("Expected a sol account but got an spl token account instead")] // 8
    ExpectedSolAccount,
    #[msg("Cannot exchange sol for sol")] // 9
    CannotExchangeSOLForSol,
    #[msg("If paying with sol, sol wallet must be signer")] // 10
    SOLWalletMustSign,
    #[msg("Cannot take this action without auction house signing too")] // 11
    CannotTakeThisActionWithoutAuctionHouseSignOff,
    #[msg("No payer present on this txn")] // 12
    NoPayerPresent,
    #[msg("Derived key invalid")] // 13
    DerivedKeyInvalid,
    #[msg("Metadata doesn't exist")] // 14
    MetadataDoesntExist,
    #[msg("Invalid token amount")] // 15
    InvalidTokenAmount,
    #[msg("Both parties need to agree to this sale")] // 16
    BothPartiesNeedToAgreeToSale,
    #[msg("Cannot match free sales unless the auction house or seller signs off")] // 17
    CannotMatchFreeSalesWithoutAuctionHouseOrSellerSignoff,
    #[msg("This sale requires a signer")] // 18
    SaleRequiresSigner,
    #[msg("Old seller not initialized")] // 19
    OldSellerNotInitialized,
    #[msg("Seller ata cannot have a delegate set")] // 20
    SellerATACannotHaveDelegate,
    #[msg("Buyer ata cannot have a delegate set")] // 21
    BuyerATACannotHaveDelegate,
    #[msg("No valid signer present")] // 22
    NoValidSignerPresent,
    #[msg("BP must be less than or equal to 10000")] // 23
    InvalidBasisPoints,
    #[msg("The trade state account does not exist")] // 24
    TradeStateDoesntExist,
    #[msg("The trade state is not empty")] // 25
    TradeStateIsNotEmpty,
    #[msg("The receipt is empty")] // 26
    ReceiptIsEmpty,
    #[msg("The instruction does not match")] // 27
    InstructionMismatch,
    #[msg("The instruction would drain the escrow below rent exemption threshold")] // 28
    EscrowUnderRentExemption,
}
