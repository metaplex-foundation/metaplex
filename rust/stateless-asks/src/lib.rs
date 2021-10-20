pub mod validation_utils;

use {
    crate::validation_utils::*,
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
    spl_token::instruction::initialize_account2,
};

anchor_lang::declare_id!("noneAnrLdpjq1Ssp1z8xxDsB8dxe7u4HL5Nxi2K5WXZ");

const PREFIX: &str = "stateless_asks";
const FEE_PAYER: &str = "fee_payer";
const TREASURY: &str = "treasury";
const ESCROW: &str = "escrow";
#[program]
pub mod stateless_asks {
    use super::*;

    pub fn buy<'info>(
        ctx: Context<'_, '_, '_, 'info, Buy<'info>>,
        authority_pda_bump: u8,
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
        let authority_pda = &mut ctx.accounts.authority_pda;
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

        assert_derivation(
            &metaplex_token_metadata::id(),
            &metadata.to_account_info(),
            &[
                metaplex_token_metadata::state::PREFIX.as_bytes(),
                metaplex_token_metadata::id().as_ref(),
                token_account.mint.as_ref(),
            ],
        )?;

        if metadata.data_is_empty() {
            return Err(ErrorCode::MetadataDoesntExist.into());
        }

        authority_pda.bump = authority_pda_bump;
        Ok(())
    }
    pub fn accept_offer<'info>(
        ctx: Context<'_, '_, '_, 'info, AcceptOffer<'info>>,
        has_metadata: bool,
        maker_size: u64,
        taker_size: u64,
        bump_seed: u8,
    ) -> ProgramResult {
        let maker_wallet = &ctx.accounts.maker_wallet;
        let taker_wallet = &ctx.accounts.taker_wallet;
        let maker_src_account = &ctx.accounts.maker_src_account;
        let maker_dst_account = &ctx.accounts.maker_dst_account;
        let taker_src_account = &ctx.accounts.taker_src_account;
        let taker_dst_account = &ctx.accounts.taker_dst_account;
        let maker_src_mint = &ctx.accounts.maker_src_mint;
        let taker_src_mint = &ctx.accounts.taker_src_mint;
        let transfer_authority = &ctx.accounts.transfer_authority;
        let token_program_info = &ctx.accounts.token_program;
        let system_program_info = &ctx.accounts.system_program;
        let remaining_account_incr = &mut ctx.remaining_accounts.iter();
        let is_taker_native = taker_src_mint.key() == spl_token::native_mint::id();
        let is_maker_native = maker_src_mint.key() == spl_token::native_mint::id();
        if is_taker_native && is_maker_native {
            return Err(ErrorCode::CannotExchangeSOLForSol.into());
        }

        let maker_mint_key = maker_src_mint.key();
        let taker_mint_key = taker_src_mint.key();

        let seeds = &[
            b"stateless_offer",
            maker_wallet.key.as_ref(),
            &maker_mint_key.as_ref(),
            &taker_mint_key.as_ref(),
            &maker_size.to_le_bytes(),
            &taker_size.to_le_bytes(),
            &[bump_seed],
        ];
        let (maker_pay_size, taker_pay_size) = if has_metadata {
            let metadata_info = next_account_info(remaining_account_incr)?;
            let (maker_metadata_key, _) = Pubkey::find_program_address(
                &[
                    b"metadata",
                    metaplex_token_metadata::id().as_ref(),
                    maker_src_mint.key().as_ref(),
                ],
                &metaplex_token_metadata::id(),
            );
            let (taker_metadata_key, _) = Pubkey::find_program_address(
                &[
                    b"metadata",
                    metaplex_token_metadata::id().as_ref(),
                    taker_src_mint.key().as_ref(),
                ],
                &metaplex_token_metadata::id(),
            );
            if *metadata_info.key == maker_metadata_key {
                msg!("Taker pays for fees");
                let taker_remaining_size = pay_creator_fees(
                    remaining_account_incr,
                    metadata_info,
                    taker_src_account,
                    taker_wallet,
                    token_program_info,
                    system_program_info,
                    taker_src_mint,
                    taker_size,
                    is_taker_native,
                    &[],
                )?;
                (maker_size, taker_remaining_size)
            } else if *metadata_info.key == taker_metadata_key {
                msg!("Maker pays for fees");
                let maker_remaining_size = pay_creator_fees(
                    remaining_account_incr,
                    metadata_info,
                    maker_src_account,
                    transfer_authority, // Delegate signs for transfer
                    token_program_info,
                    system_program_info,
                    maker_src_mint,
                    maker_size,
                    is_maker_native,
                    seeds,
                )?;
                (maker_remaining_size, taker_size)
            } else {
                msg!("Neither maker nor taker metadata keys match");
                return Err(ProgramError::InvalidAccountData);
            }
        } else {
            (maker_size, taker_size)
        };

        let authority_key = Pubkey::create_program_address(seeds, ctx.program_id)?;
        assert_keys_equal(authority_key, *transfer_authority.key)?;

        // Both of these transfers will fail if the `transfer_authority` is the delegate of these ATA's
        // One consideration is that the taker can get tricked in the case that the maker size is greater than
        // the token amount in the maker's ATA, but these stateless offers should just be invalidated in
        // the client.

        assert_valid_delegation(
            maker_src_account,
            taker_dst_account,
            maker_wallet,
            taker_wallet,
            transfer_authority,
            maker_src_mint,
            maker_pay_size,
        )?;

        assert_valid_delegation(
            taker_src_account,
            maker_dst_account,
            taker_wallet,
            maker_wallet,
            transfer_authority,
            taker_src_mint,
            taker_pay_size,
        )?;

        invoke_signed(
            &spl_token::instruction::transfer(
                token_program_info.key,
                &maker_src_account.key(),
                taker_dst_account.key,
                transfer_authority.key,
                &[],
                maker_pay_size,
            )?,
            &[
                maker_src_account.to_account_info(),
                taker_dst_account.to_account_info(),
                transfer_authority.to_account_info(),
                token_program_info.to_account_info(),
            ],
            &[seeds],
        )?;
        msg!("done tx from maker to taker {}", maker_pay_size);
        if taker_src_mint.key() == spl_token::native_mint::id() {
            assert_keys_equal(system_program::id(), *system_program_info.key)?;
            invoke(
                &system_instruction::transfer(
                    &taker_src_account.key(),
                    maker_dst_account.key,
                    taker_pay_size,
                ),
                &[
                    taker_src_account.to_account_info(),
                    maker_dst_account.to_account_info(),
                    system_program_info.to_account_info(),
                ],
            )?;
        } else {
            assert_is_ata(maker_dst_account, maker_wallet.key, &taker_src_mint.key())?;
            assert_is_ata(taker_src_account, taker_wallet.key, &taker_src_mint.key())?;
            invoke(
                &spl_token::instruction::transfer(
                    token_program_info.key,
                    &taker_src_account.key(),
                    maker_dst_account.key,
                    taker_wallet.key,
                    &[],
                    taker_pay_size,
                )?,
                &[
                    taker_src_account.to_account_info(),
                    maker_dst_account.to_account_info(),
                    taker_wallet.to_account_info(),
                    token_program_info.to_account_info(),
                ],
            )?;
        }
        msg!("done tx from taker to maker {}", taker_pay_size);
        msg!("done!");
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
pub struct Sell<'info> {
    wallet: Signer<'info>,
    token_account: UncheckedAccount<'info>,
    metadata: UncheckedAccount<'info>,
    authority: UncheckedAccount<'info>,
    #[account(seeds=[PREFIX.as_bytes(), auction_house.creator.as_ref(), auction_house.treasury_mint.as_ref()], bump=auction_house.bump, has_one=authority)]
    auction_house: Account<'info, AuctionHouse>,
    #[account(mut, seeds=[PREFIX.as_bytes(), auction_house.key().as_ref(), FEE_PAYER.as_bytes()], bump=auction_house.fee_payer_bump)]
    auction_house_fee_account: UncheckedAccount<'info>,
    #[account(address = spl_token::id())]
    token_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(authority_pda_bump: u8, escrow_payment_bump: u8, buyer_price: u64, token_size: u64)]
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
    #[account(init, seeds=[PREFIX.as_bytes(), auction_house.key().as_ref(), token_account.key().as_ref(), treasury_mint.key().as_ref(), token_account.mint.as_ref(), &buyer_price.to_le_bytes(), &token_size.to_le_bytes()], bump=authority_pda_bump, payer=auction_house_fee_account, space=AUTHORITY_SIZE, owner=escrow_payment_account.key())]
    authority_pda: Account<'info, AuthorityPDA>,
    #[account(address = spl_token::id())]
    token_program: UncheckedAccount<'info>,
    #[account(address = system_program::ID)]
    system_program: UncheckedAccount<'info>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(authority_pda_bump: u8, escrow_payment_bump: u8, buyer_price: u64, token_size: u64)]
pub struct Match<'info> {
    buyer: UncheckedAccount<'info>,
    seller: UncheckedAccount<'info>,
    token_account: Account<'info, TokenAccount>,
    token_mint: Account<'info, Mint>,
    treasury_mint: Account<'info, Mint>,
    #[account(mut, seeds=[PREFIX.as_bytes(), auction_house.key().as_ref(), buyer.key().as_ref()], bump=escrow_payment_bump)]
    escrow_payment_account: UncheckedAccount<'info>,
    authority: UncheckedAccount<'info>,
    #[account(seeds=[PREFIX.as_bytes(), auction_house.creator.as_ref(), auction_house.treasury_mint.as_ref()], bump=auction_house.bump, has_one=authority, has_one=treasury_mint)]
    auction_house: Account<'info, AuctionHouse>,
    #[account(mut, seeds=[PREFIX.as_bytes(), auction_house.key().as_ref(), FEE_PAYER.as_bytes()], bump=auction_house.fee_payer_bump)]
    auction_house_fee_account: UncheckedAccount<'info>,
    #[account(mut, seeds=[PREFIX.as_bytes(), auction_house.key().as_ref(), TREASURY.as_bytes()], bump=auction_house.treasury_bump)]
    auction_house_treasury: UncheckedAccount<'info>,
    #[account(mut, seeds=[PREFIX.as_bytes(), auction_house.key().as_ref(), token_account.key().as_ref(), auction_house.treasury_mint.as_ref(), token_mint.key().as_ref(), &buyer_price.to_le_bytes(), &token_size.to_le_bytes()], bump=authority_pda_bump)]
    authority_pda: Account<'info, AuthorityPDA>,
    #[account(address = spl_token::id())]
    token_program: UncheckedAccount<'info>,
    #[account(address = system_program::ID)]
    system_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(escrow_payment_bump: u8, buyer_price: u64, token_size: u64)]
pub struct Cancel<'info> {
    wallet: UncheckedAccount<'info>,
    token_account: Account<'info, TokenAccount>,
    token_mint: Account<'info, Mint>,
    authority: UncheckedAccount<'info>,
    #[account(seeds=[PREFIX.as_bytes(), auction_house.creator.as_ref(), auction_house.treasury_mint.as_ref()], bump=auction_house.bump, has_one=authority)]
    auction_house: Account<'info, AuctionHouse>,
    #[account(mut, seeds=[PREFIX.as_bytes(), auction_house.key().as_ref(), wallet.key().as_ref()], bump=escrow_payment_bump)]
    escrow_payment_account: UncheckedAccount<'info>,
    #[account(mut, seeds=[PREFIX.as_bytes(), auction_house.key().as_ref(), FEE_PAYER.as_bytes()], bump=auction_house.fee_payer_bump)]
    auction_house_fee_account: UncheckedAccount<'info>,
    #[account(mut, seeds=[PREFIX.as_bytes(), auction_house.key().as_ref(), token_account.key().as_ref(), auction_house.treasury_mint.as_ref(), token_mint.key().as_ref(), &buyer_price.to_le_bytes(), &token_size.to_le_bytes()], bump=authority_pda.bump)]
    authority_pda: Account<'info, AuthorityPDA>,
    #[account(address = spl_token::id())]
    token_program: UncheckedAccount<'info>,
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
}

pub const AUTHORITY_SIZE: usize = 1;
#[account]
pub struct AuthorityPDA {
    pub bump: u8,
}

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
}
