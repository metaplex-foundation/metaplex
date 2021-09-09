pub mod utils;

use {
    crate::utils::{
        assert_data_valid, assert_derivation, assert_initialized, assert_owned_by,
        assert_valid_amount, create_or_allocate_account_raw, spl_token_transfer,
        TokenTransferParams,
    },
    anchor_lang::{
        prelude::*,
        solana_program::{program_pack::Pack, system_program},
        AnchorDeserialize, AnchorSerialize,
    },
    anchor_spl::token::{self, Mint, TokenAccount},
    spl_token::{instruction::initialize_account2, state::Account},
    std::str::FromStr,
};

pub const PREFIX: &str = "fair_launch";
pub const TREASURY: &str = "treasury";
pub const MINT: &str = "mint";
pub const LOTTERY: &str = "lottery";
pub const ASSOCIATED_TOKEN_PROGRAM_ID: &str = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
pub const MAX_GRANULARITY: u64 = 100;

#[program]
pub mod fair_launch {

    use anchor_lang::solana_program::{
        program::{invoke, invoke_signed},
        system_instruction,
    };

    use super::*;
    pub fn initialize_fair_launch<'info>(
        ctx: Context<'_, '_, '_, 'info, InitializeFairLaunch<'info>>,
        bump: u8,
        treasury_bump: u8,
        token_mint_bump: u8,
        data: FairLaunchData,
    ) -> ProgramResult {
        let fair_launch = &mut ctx.accounts.fair_launch;

        assert_data_valid(&data)?;
        fair_launch.data = data;
        fair_launch.authority = *ctx.accounts.authority.key;
        fair_launch.bump = bump;
        fair_launch.treasury_bump = treasury_bump;
        fair_launch.token_mint_bump = token_mint_bump;

        fair_launch.token_mint = ctx.accounts.token_mint.key();
        assert_owned_by(&ctx.accounts.token_mint.to_account_info(), &spl_token::id())?; //paranoia

        let token_mint_key = ctx.accounts.token_mint.key();
        let treasury_seeds = &[
            PREFIX.as_bytes(),
            token_mint_key.as_ref(),
            TREASURY.as_bytes(),
        ];
        let treasury_info = &ctx.accounts.treasury;
        fair_launch.treasury = *treasury_info.key;
        assert_derivation(ctx.program_id, treasury_info, treasury_seeds)?;

        if ctx.remaining_accounts.len() > 0 {
            let treasury_mint_info = &ctx.remaining_accounts[0];
            let _treasury_mint: spl_token::state::Mint = assert_initialized(&treasury_mint_info)?;

            assert_owned_by(&treasury_mint_info, &spl_token::id())?;

            fair_launch.treasury_mint = Some(*treasury_mint_info.key);

            // make the treasury token account

            let signer_seeds = &[
                PREFIX.as_bytes(),
                token_mint_key.as_ref(),
                TREASURY.as_bytes(),
                &[fair_launch.treasury_bump],
            ];

            create_or_allocate_account_raw(
                *ctx.accounts.token_program.key,
                treasury_info,
                &ctx.accounts.rent.to_account_info(),
                &ctx.accounts.system_program,
                &ctx.accounts.payer,
                Account::LEN,
                signer_seeds,
            )?;

            invoke_signed(
                &initialize_account2(
                    &ctx.accounts.token_program.key,
                    treasury_info.key,
                    treasury_mint_info.key,
                    &fair_launch.key(),
                )
                .unwrap(),
                &[
                    ctx.accounts.token_program.clone(),
                    treasury_info.clone(),
                    fair_launch.to_account_info().clone(),
                    treasury_mint_info.clone(),
                ],
                &[signer_seeds],
            )?;
        } else {
            // Nothing to do but check that it does not already exist, we can begin transferring sol to it.
            if !treasury_info.data_is_empty()
                || treasury_info.lamports() > 0
                || treasury_info.owner != ctx.program_id
            {
                return Err(ErrorCode::TreasuryAlreadyExists.into());
            }
        }

        // now we do the counts.
        let mut counts_at_each_tick: Vec<u64> = vec![];
        let mut start = fair_launch.data.price_range_start;
        while start <= fair_launch.data.price_range_end {
            counts_at_each_tick.push(0);
            start = start
                .checked_add(fair_launch.data.tick_size)
                .ok_or(ErrorCode::NumericalOverflowError)?;
        }

        fair_launch.counts_at_each_tick = counts_at_each_tick;

        Ok(())
    }

    pub fn update_fair_launch(
        ctx: Context<UpdateFairLaunch>,
        data: FairLaunchData,
    ) -> ProgramResult {
        let fair_launch = &mut ctx.accounts.fair_launch;

        assert_data_valid(&data)?;
        fair_launch.data = data;

        Ok(())
    }

    pub fn start_phase_three(
        ctx: Context<StartPhaseThree>,
        phase_three_start: i64,
        phase_three_end: i64,
    ) -> ProgramResult {
        let fair_launch = &mut ctx.accounts.fair_launch;
        let fair_launch_lottery_bitmap = &ctx.accounts.fair_launch_lottery_bitmap;

        if fair_launch_lottery_bitmap.bitmap_ones != fair_launch.number_tickets_sold_in_phase_1 {
            return Err(ErrorCode::LotteryBitmapOnesMustEqualNumberOfTicketsSold.into());
        }

        if phase_three_start < fair_launch.data.phase_two_end {
            return Err(ErrorCode::TimestampsDontLineUp.into());
        }

        if phase_three_end <= phase_three_start {
            return Err(ErrorCode::TimestampsDontLineUp.into());
        }

        fair_launch.data.phase_three_start = Some(phase_three_start);
        fair_launch.data.phase_three_end = Some(phase_three_end);

        Ok(())
    }

    pub fn update_fair_launch_lottery_bitmap(
        ctx: Context<UpdateFairLaunchLotteryBitmap>,
        index: u32,
        bytes: Vec<u8>,
    ) -> ProgramResult {
        let fair_launch = &mut ctx.accounts.fair_launch;

        if fair_launch.data.phase_three_start.is_some() {
            return Err(ErrorCode::CannotUpdateFairLaunchLotteryOncePhaseThreeLocked.into());
        }

        if fair_launch.number_tickets_un_seqed > 0 {
            return Err(ErrorCode::CannotSetFairLaunchLotteryUntilAllTicketsAreSequenced.into());
        }

        let fair_launch_lottery_bitmap = &mut ctx.accounts.fair_launch_lottery_bitmap;

        let fair_launch_lottery_bitmap_info = fair_launch_lottery_bitmap.to_account_info();
        let mut lottery_data = fair_launch_lottery_bitmap_info.data.borrow_mut();
        let mut number_of_ones_changed: i64 = 0;
        let mut curr_pos = FAIR_LAUNCH_LOTTERY_SIZE + (index as usize);
        for byte in bytes {
            let curr_byte = lottery_data[curr_pos];
            msg!("Curr byte is {}", curr_byte);
            for bit_position in 0..7 {
                msg!("Looking for position {}", bit_position);
                let mask = u8::pow(2, bit_position as u32);
                let curr_byte_masked = curr_byte | mask;
                let byte_masked = byte | mask;
                msg!(
                    "Mask is {} and this led to curr byte masked {} and new byte masked {}",
                    mask,
                    curr_byte_masked,
                    byte_masked
                );
                if curr_byte_masked > byte_masked {
                    msg!("Subtracting 1");
                    number_of_ones_changed -= 1; // we went from a 1 to a 0
                } else if curr_byte_masked < byte_masked {
                    msg!("Adding 1");
                    number_of_ones_changed += 1 // We went from a 0 to 1
                } else {
                    msg!("No change here"); // 1 and 1 or 0 and 0
                }
            }
            lottery_data[curr_pos] = byte;
            curr_pos += 1;
        }

        let new_number_of_ones: u64;
        // if less than zero, do a checked sub and convert negative to positive,
        // otherwise, just do normal conversion and addition.
        // Dont convert bitmap_ones to i64 because in conversion you lose bit of information to sign...
        // better to be verbose and stick to u64...what if its very large number?
        if number_of_ones_changed < 0 {
            new_number_of_ones = fair_launch_lottery_bitmap
                .bitmap_ones
                .checked_sub((-number_of_ones_changed) as u64)
                .ok_or(ErrorCode::NumericalOverflowError)?;
        } else {
            new_number_of_ones = fair_launch_lottery_bitmap
                .bitmap_ones
                .checked_add(number_of_ones_changed as u64)
                .ok_or(ErrorCode::NumericalOverflowError)?;
        }

        lottery_data[FAIR_LAUNCH_LOTTERY_SIZE - 4..FAIR_LAUNCH_LOTTERY_SIZE]
            .copy_from_slice(&new_number_of_ones.to_le_bytes());

        Ok(())
    }

    pub fn create_fair_launch_lottery_bitmap(
        ctx: Context<CreateFairLaunchLotteryBitmap>,
        bump: u8,
    ) -> ProgramResult {
        let fair_launch = &mut ctx.accounts.fair_launch;
        let clock = &mut ctx.accounts.clock;

        if clock.unix_timestamp < fair_launch.data.phase_two_end {
            return Err(ErrorCode::CannotCreateFairLaunchLotteryBitmapBeforePhaseTwoEnd.into());
        }

        let fair_launch_lottery_bitmap = &mut ctx.accounts.fair_launch_lottery_bitmap;
        fair_launch_lottery_bitmap.fair_launch = ctx.accounts.fair_launch.key();
        fair_launch_lottery_bitmap.bump = bump;

        Ok(())
    }

    pub fn purchase_ticket<'info>(
        ctx: Context<'_, '_, '_, 'info, PurchaseTicket<'info>>,
        bump: u8,
        amount: u64,
    ) -> ProgramResult {
        let fair_launch = &mut ctx.accounts.fair_launch;
        let fair_launch_ticket = &mut ctx.accounts.fair_launch_ticket;
        let buyer = &ctx.accounts.buyer;
        let clock = &ctx.accounts.clock;

        if clock.unix_timestamp < fair_launch.data.phase_one_start
            || clock.unix_timestamp > fair_launch.data.phase_one_end
        {
            return Err(ErrorCode::CannotBuyTicketsOutsidePhaseOne.into());
        }

        assert_valid_amount(&fair_launch.data, amount)?;

        fair_launch_ticket.fair_launch = fair_launch.key();
        fair_launch_ticket.buyer = *buyer.key;
        fair_launch_ticket.amount = amount;
        fair_launch_ticket.state = FairLaunchTicketState::NoSequenceStruct; // Be verbose even though it's 0
        fair_launch_ticket.bump = bump;
        fair_launch_ticket.seq = fair_launch.number_tickets_sold_in_phase_1;

        fair_launch.number_tickets_sold_in_phase_1 = fair_launch
            .number_tickets_sold_in_phase_1
            .checked_add(1)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        fair_launch.number_tickets_un_seqed = fair_launch.number_tickets_un_seqed.checked_add(1).ok_or(ErrorCode::NumericalOverflowError)?;

        if let Some(treasury_mint) = fair_launch.treasury_mint {
            let treasury_mint_info = &ctx.remaining_accounts[0];
            let _treasury_mint: spl_token::state::Mint = assert_initialized(&treasury_mint_info)?;

            let buyer_token_account_info = &ctx.remaining_accounts[1];
            let buyer_token_account: Account = assert_initialized(&buyer_token_account_info)?;

            let transfer_authority_info = &ctx.remaining_accounts[2];

            let token_program = &ctx.remaining_accounts[3];

            if token_program.key != &spl_token::id() {
                return Err(ErrorCode::InvalidTokenProgram.into());
            }

            if *treasury_mint_info.key != treasury_mint {
                return Err(ErrorCode::TreasuryMintMismatch.into());
            }

            assert_owned_by(treasury_mint_info, &token_program.key)?;
            assert_owned_by(buyer_token_account_info, &token_program.key)?;

            // assert is an ATA
            assert_derivation(
                &Pubkey::from_str(ASSOCIATED_TOKEN_PROGRAM_ID).unwrap(),
                buyer_token_account_info,
                &[
                    buyer.key.as_ref(),
                    token_program.key.as_ref(),
                    &treasury_mint_info.key.as_ref(),
                ],
            )?;

            if buyer_token_account.amount < amount {
                return Err(ErrorCode::NotEnoughTokens.into());
            }

            spl_token_transfer(TokenTransferParams {
                source: buyer_token_account_info.clone(),
                destination: ctx.accounts.treasury.clone(),
                authority: transfer_authority_info.clone(),
                authority_signer_seeds: &[],
                token_program: token_program.clone(),
                amount: amount,
            })?;
        } else {
            if buyer.lamports() < amount {
                return Err(ErrorCode::NotEnoughSOL.into());
            }

            invoke(
                &system_instruction::transfer(buyer.key, ctx.accounts.treasury.key, amount),
                &[
                    buyer.clone(),
                    ctx.accounts.treasury.clone(),
                    ctx.accounts.system_program.clone(),
                ],
            )?;
        }

        Ok(())
    }

    pub fn create_ticket_seq<'info>(
        ctx: Context<CreateTicketSeq<'info>>,
        bump: u8,
    ) -> ProgramResult {
        let fair_launch = &mut ctx.accounts.fair_launch;

        let fair_launch_ticket = &mut ctx.accounts.fair_launch_ticket;
        let fair_launch_ticket_seq_lookup = &mut ctx.accounts.fair_launch_ticket_seq_lookup;
        
        if fair_launch_ticket.state.clone() as u8 != FairLaunchTicketState::NoSequenceStruct as u8 {
            // Due to anchor this should never happen but if it does, i want to be sure.
            return Err(ErrorCode::SeqAlreadyExists.into())
        }
        // Literally duplicative but I am paranoid of Anchor not doing this right.
        assert_derivation(
            ctx.program_id,
            &fair_launch_ticket_seq_lookup.to_account_info(),
            &[
                PREFIX.as_bytes(),
                fair_launch.token_mint.as_ref(),
                &fair_launch_ticket.seq.to_le_bytes(),
            ],
        )?;
        fair_launch_ticket_seq_lookup.bump = bump;
        fair_launch_ticket_seq_lookup.fair_launch_ticket = fair_launch_ticket.key();

        fair_launch_ticket.state = FairLaunchTicketState::Unpunched;
        fair_launch.number_tickets_un_seqed = fair_launch.number_tickets_un_seqed.checked_sub(1).ok_or(ErrorCode::NumericalOverflowError)?;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(bump: u8, treasury_bump: u8, token_mint_bump: u8, data: FairLaunchData)]
pub struct InitializeFairLaunch<'info> {
    #[account(init, seeds=[PREFIX.as_bytes(), token_mint.key.as_ref()], payer=payer, bump=bump, space=FAIR_LAUNCH_SPACE_VEC_START+8*(((data.price_range_end - data.price_range_start).checked_div(data.tick_size).ok_or(ErrorCode::NumericalOverflowError)? + 1)) as usize)]
    fair_launch: ProgramAccount<'info, FairLaunch>,
    #[account(init, seeds=[PREFIX.as_bytes(), authority.key.as_ref(), MINT.as_bytes(), data.uuid.as_bytes()], mint::authority=fair_launch, mint::decimals=0, payer=payer, bump=token_mint_bump)]
    token_mint: CpiAccount<'info, Mint>,
    treasury: AccountInfo<'info>,
    #[account(constraint= authority.data_is_empty() && authority.lamports() > 0)]
    authority: AccountInfo<'info>,
    #[account(mut, signer)]
    payer: AccountInfo<'info>,
    #[account(address = spl_token::id())]
    token_program: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    system_program: AccountInfo<'info>,
    rent: Sysvar<'info, Rent>,
    // Remaining accounts in this order if using spl tokens for payment:
    // [optional] treasury mint
}

/// Can only update fair launch before phase 1 start.
#[derive(Accounts)]
pub struct UpdateFairLaunch<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref()], bump=fair_launch.bump, has_one=authority)]
    fair_launch: ProgramAccount<'info, FairLaunch>,
    #[account(signer)]
    authority: AccountInfo<'info>,
}

/// Limited Update that only sets phase 3 dates once bitmap is in place and fully setup.
#[derive(Accounts)]
pub struct StartPhaseThree<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref()], bump=fair_launch.bump, has_one=authority)]
    fair_launch: ProgramAccount<'info, FairLaunch>,
    #[account(seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref(), LOTTERY.as_bytes()], constraint=fair_launch_lottery_bitmap.to_account_info().data_len() > 0, bump=fair_launch_lottery_bitmap.bump, has_one=fair_launch)]
    fair_launch_lottery_bitmap: ProgramAccount<'info, FairLaunchLotteryBitmap>,
    #[account(signer)]
    authority: AccountInfo<'info>,
}

/// Can only create the fair launch lottery bitmap after phase 1 has ended.
#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct CreateFairLaunchLotteryBitmap<'info> {
    #[account(seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref()], bump=fair_launch.bump, has_one=authority)]
    fair_launch: ProgramAccount<'info, FairLaunch>,
    #[account(init, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref(), LOTTERY.as_bytes()],  payer=payer, bump=bump, space= FAIR_LAUNCH_LOTTERY_SIZE + (fair_launch.number_tickets_sold_in_phase_1.checked_div(8).ok_or(ErrorCode::NumericalOverflowError)? as usize) + 1)]
    fair_launch_lottery_bitmap: ProgramAccount<'info, FairLaunchLotteryBitmap>,
    #[account(signer)]
    authority: AccountInfo<'info>,
    #[account(mut, signer)]
    payer: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    system_program: AccountInfo<'info>,
    rent: Sysvar<'info, Rent>,
    clock: Sysvar<'info, Clock>,
}

/// Can only set the fair launch lottery bitmap after phase 2 has ended.
#[derive(Accounts)]
pub struct UpdateFairLaunchLotteryBitmap<'info> {
    #[account(seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref()], bump=fair_launch.bump, has_one=authority)]
    fair_launch: ProgramAccount<'info, FairLaunch>,
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref(), LOTTERY.as_bytes()], bump=fair_launch_lottery_bitmap.bump)]
    fair_launch_lottery_bitmap: ProgramAccount<'info, FairLaunchLotteryBitmap>,
    #[account(signer)]
    authority: AccountInfo<'info>,
}

/// Can only purchase a ticket in phase 1.
#[derive(Accounts)]
#[instruction(bump: u8, amount: u64)]
pub struct PurchaseTicket<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref()], bump=fair_launch.bump, has_one=treasury)]
    fair_launch: ProgramAccount<'info, FairLaunch>,
    #[account(mut)]
    treasury: AccountInfo<'info>,
    #[account(init, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref(), buyer.key.as_ref()],  payer=payer, bump=bump, space=FAIR_LAUNCH_TICKET_SIZE)]
    fair_launch_ticket: ProgramAccount<'info, FairLaunchTicket>,
    #[account(mut, signer, constraint= (treasury.owner == &spl_token::id() && buyer.owner == &spl_token::id()) || (treasury.owner != &spl_token::id() && buyer.data_is_empty() && buyer.lamports() > 0) )]
    buyer: AccountInfo<'info>,
    #[account(mut, signer)]
    payer: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    system_program: AccountInfo<'info>,
    rent: Sysvar<'info, Rent>,
    clock: Sysvar<'info, Clock>,
    // Remaining accounts in this order if using spl tokens for payment:
    // [Writable/optional] treasury mint
    // [Writable/optional] buyer token account (must be ata)
    // [optional] transfer authority to transfer amount from buyer token account
    // [optional] token program
}

// permissionless, anybody can make this if for some reason the UI messes up.
#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct CreateTicketSeq<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref()], bump=fair_launch.bump)]
    fair_launch: ProgramAccount<'info, FairLaunch>,
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref(), fair_launch_ticket.buyer.as_ref()], bump=fair_launch_ticket.bump, has_one=fair_launch)]
    fair_launch_ticket: ProgramAccount<'info, FairLaunchTicket>,
    #[account(init, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref(), &fair_launch_ticket.seq.to_le_bytes()],  payer=payer, bump=bump, space=FAIR_LAUNCH_TICKET_SEQ_SIZE)]
    fair_launch_ticket_seq_lookup: ProgramAccount<'info, FairLaunchTicketSeqLookup>,
    #[account(mut, signer)]
    payer: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    system_program: AccountInfo<'info>,
    rent: Sysvar<'info, Rent>,
}

/// IN phase 1, you can adjust up or down in any way
/// In phase 2, you can adjust up or down in any way
/// In phase 3, if you are above the decided_median, you can only adjust down to decided median. If below, you can only
/// adjust down, never up.
#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct AdjustTicket<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref(), buyer.key.as_ref()],  bump=fair_launch_ticket.bump,has_one=buyer, has_one=fair_launch)]
    fair_launch_ticket: ProgramAccount<'info, FairLaunchTicket>,
    #[account(seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref()], bump=fair_launch.bump)]
    fair_launch: ProgramAccount<'info, FairLaunch>,
    #[account(mut)]
    treasury: AccountInfo<'info>,
    #[account(mut, signer)]
    buyer: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct PunchTicket<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref(), buyer.key.as_ref()], bump=fair_launch_ticket.bump, has_one=buyer, has_one=fair_launch)]
    fair_launch_ticket: ProgramAccount<'info, FairLaunchTicket>,
    #[account(seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref()], bump=fair_launch.bump, has_one=token_mint)]
    fair_launch: ProgramAccount<'info, FairLaunch>,
    #[account(mut, signer)]
    buyer: AccountInfo<'info>,
    #[account(mut, constraint=&buyer_token_account.mint == token_mint.key && buyer_token_account.to_account_info().owner == &spl_token::id())]
    buyer_token_account: CpiAccount<'info, TokenAccount>,
    #[account(seeds=[PREFIX.as_bytes(), fair_launch.authority.as_ref(), MINT.as_bytes(), fair_launch.data.uuid.as_bytes()], bump=fair_launch.token_mint_bump)]
    token_mint: AccountInfo<'info>,
    #[account(address = spl_token::id())]
    token_program: AccountInfo<'info>,
}

pub const FAIR_LAUNCH_LOTTERY_SIZE: usize = 8 + // discriminator
32 + // fair launch
1 + // bump
8; // size of bitmask ones

pub const FAIR_LAUNCH_SPACE_VEC_START: usize = 8 + // discriminator
32 + // token_mint
32 + // treasury
32 + // authority
1 + // bump
1 + // treasury_bump
1 + // token_mint_bump
4 + 6 + // uuid 
8 + //range start
8 + // range end
8 + // phase one start
8 + // phase one end
8 + // phase two end
9 + // phase three start
9 + // phase three end
8 + // tick size
8 + // number of tokens
8 + // number of tickets unseq'ed
8 + // number of tickets sold in phase 1
8 + // number of tickets remaining at the end in phase 2
8 + // number of tickets punched in phase 3
8 + // current median,
4; // u32 representing number of amounts in vec so far

pub const FAIR_LAUNCH_TICKET_SIZE: usize = 8 + // discriminator
32 + // fair launch reverse lookup
32 + // buyer
8 + // amount paid in so far
1 + // state
1 + // bump
8; // seq

pub const FAIR_LAUNCH_TICKET_SEQ_SIZE: usize = 8 + //discriminator
32 + // fair launch ticket reverse lookup
8 + //seq
1; // bump

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct FairLaunchData {
    pub uuid: String,
    pub price_range_start: u64,
    pub price_range_end: u64,
    pub phase_one_start: i64,
    pub phase_one_end: i64,
    pub phase_two_end: i64,
    pub phase_three_start: Option<i64>,
    pub phase_three_end: Option<i64>,
    pub tick_size: u64,
    pub number_of_tokens: u64,
}

#[account]
pub struct FairLaunch {
    pub token_mint: Pubkey,
    pub treasury: Pubkey,
    pub treasury_mint: Option<Pubkey>,
    pub authority: Pubkey,
    pub bump: u8,
    pub treasury_bump: u8,
    pub token_mint_bump: u8,
    pub data: FairLaunchData,
    pub number_tickets_un_seqed: u64,
    pub number_tickets_sold_in_phase_1: u64,
    pub number_tickets_remaining_in_phase_2: u64,
    pub number_tickets_punched_in_phase_3: u64,
    pub current_median: u64,
    pub counts_at_each_tick: Vec<u64>,
}

#[account]
pub struct FairLaunchLotteryBitmap {
    pub fair_launch: Pubkey,
    pub bump: u8,
    /// This must be exactly the number of winners and is incremented precisely in each strip addition
    pub bitmap_ones: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum FairLaunchTicketState {
    NoSequenceStruct,
    Unpunched,
    Punched,
    Withdrawn,
}

#[account]
pub struct FairLaunchTicket {
    pub fair_launch: Pubkey,
    pub buyer: Pubkey,
    pub amount: u64,
    pub state: FairLaunchTicketState,
    pub bump: u8,
    pub seq: u64,
}

#[account]
pub struct FairLaunchTicketSeqLookup {
    pub fair_launch_ticket: Pubkey,
    pub seq: u64,
    pub bump: u8,
}

#[error]
pub enum ErrorCode {
    #[msg("Account does not have correct owner!")]
    IncorrectOwner,
    #[msg("Account is not initialized!")]
    Uninitialized,
    #[msg("Mint Mismatch!")]
    MintMismatch,
    #[msg("Token transfer failed")]
    TokenTransferFailed,
    #[msg("Numerical overflow error")]
    NumericalOverflowError,
    #[msg("Timestamps of phases should line up")]
    TimestampsDontLineUp,
    #[msg("Cant set phase 3 dates yet")]
    CantSetPhaseThreeDatesYet,
    #[msg("Uuid must be exactly of 6 length")]
    UuidMustBeExactly6Length,
    #[msg("Tick size too small")]
    TickSizeTooSmall,
    #[msg("Cannot give zero tokens")]
    CannotGiveZeroTokens,
    #[msg("Invalid price ranges")]
    InvalidPriceRanges,
    #[msg("With this tick size and price range, you will have too many ticks(>" + MAX_GRANULARITY + ") - choose less granularity")]
    TooMuchGranularityInRange,
    #[msg("Cannot use a tick size with a price range that results in a remainder when doing (end-start)/ticksize")]
    CannotUseTickSizeThatGivesRemainder,
    #[msg("Derived key invalid")]
    DerivedKeyInvalid,
    #[msg("Treasury Already Exists")]
    TreasuryAlreadyExists,
    #[msg("The number of ones in the lottery must equal the number of tickets sold in phase 1")]
    LotteryBitmapOnesMustEqualNumberOfTicketsSold,
    #[msg("Amount must be between price ranges and at a tick mark")]
    InvalidPurchaseAmount,
    #[msg("Treasury mint does not match")]
    TreasuryMintMismatch,
    #[msg("Not enough tokens to pay for this minting")]
    NotEnoughTokens,
    #[msg("Not enough SOL to pay for this minting")]
    NotEnoughSOL,
    #[msg("Sent up invalid token program")]
    InvalidTokenProgram,
    #[msg("Cannot buy tickets outside phase one")]
    CannotBuyTicketsOutsidePhaseOne,
    #[msg("Cannot create the bitmap before phase two end")]
    CannotCreateFairLaunchLotteryBitmapBeforePhaseTwoEnd,
    #[msg("Cannot update fair launch lottery once phase three locked")]
    CannotUpdateFairLaunchLotteryOncePhaseThreeLocked,
    #[msg("Seq already exists")]
    SeqAlreadyExists,
    #[msg("Cannot set lottery until all tickets have sequence lookups using permissionless crank endpoint. Use CLI to make.")]
    CannotSetFairLaunchLotteryUntilAllTicketsAreSequenced
}
