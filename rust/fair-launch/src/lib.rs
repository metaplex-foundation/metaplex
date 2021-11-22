pub mod utils;

use {
    crate::utils::{
        adjust_counts, assert_data_valid, assert_derivation, assert_initialized, assert_owned_by,
        assert_valid_amount, calculate_refund_amount, calculate_withdraw_amount,
        create_or_allocate_account_raw, get_mask_and_index_for_seq, spl_token_burn,
        spl_token_mint_to, spl_token_transfer, TokenBurnParams, TokenTransferParams,
    },
    anchor_lang::{
        prelude::*,
        solana_program::{
            program::{invoke, invoke_signed},
            program_option::COption,
            program_pack::Pack,
            system_instruction, system_program,
        },
        AnchorDeserialize, AnchorSerialize,
    },
    anchor_spl::token::{Mint, TokenAccount},
    metaplex_token_metadata::instruction::{
        create_master_edition, create_metadata_accounts,
        mint_new_edition_from_master_edition_via_token, update_metadata_accounts,
    },
    spl_token::{
        instruction::{initialize_account2, mint_to},
        state::Account,
    },
};

pub const PREFIX: &str = "fair_launch";
pub const TREASURY: &str = "treasury";
pub const MINT: &str = "mint";
pub const LOTTERY: &str = "lottery";
pub const PARTICIPATION: &str = "participation";
pub const ACCOUNT: &str = "account";
pub const MAX_GRANULARITY: u64 = 100;
anchor_lang::declare_id!("faircnAB9k59Y4TXmLabBULeuTLgV7TkGMGNkjnA15j");

#[program]
pub mod fair_launch {
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

        let signer_seeds = &[
            PREFIX.as_bytes(),
            token_mint_key.as_ref(),
            TREASURY.as_bytes(),
            &[fair_launch.treasury_bump],
        ];

        if ctx.remaining_accounts.len() > 0 {
            let treasury_mint_info = &ctx.remaining_accounts[0];
            let _treasury_mint: spl_token::state::Mint = assert_initialized(&treasury_mint_info)?;

            assert_owned_by(&treasury_mint_info, &spl_token::id())?;

            fair_launch.treasury_mint = Some(*treasury_mint_info.key);

            if treasury_info.data_len() > 0 {
                return Err(ErrorCode::TreasuryAlreadyExists.into());
            }

            // make the treasury token account

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
                    fair_launch.to_account_info(),
                    treasury_mint_info.clone(),
                    ctx.accounts.rent.to_account_info(),
                ],
                &[signer_seeds],
            )?;
        } else {
            // Nothing to do but check that it does not already exist, we can begin transferring sol to it.
            if !treasury_info.data_is_empty()
                || treasury_info.lamports() > 0
                || treasury_info.owner != ctx.accounts.system_program.key
            {
                return Err(ErrorCode::TreasuryAlreadyExists.into());
            }

            invoke_signed(
                &system_instruction::assign(treasury_info.key, &ctx.program_id),
                &[ctx.accounts.system_program.clone(), treasury_info.clone()],
                &[signer_seeds],
            )?;
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
        let clock = &mut ctx.accounts.clock;

        if clock.unix_timestamp > fair_launch.data.phase_one_start {
            return Err(ErrorCode::CannotUpdateFairLaunchDataOnceInProgress.into());
        }

        assert_data_valid(&data)?;
        fair_launch.data = data;

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

    pub fn start_phase_three(ctx: Context<StartPhaseThree>) -> ProgramResult {
        let fair_launch = &mut ctx.accounts.fair_launch;
        let fair_launch_lottery_bitmap = &ctx.accounts.fair_launch_lottery_bitmap;
        let token_mint = &ctx.accounts.token_mint;

        if fair_launch_lottery_bitmap.bitmap_ones
            != std::cmp::min(
                fair_launch
                    .data
                    .number_of_tokens
                    .checked_sub(token_mint.supply)
                    .ok_or(ErrorCode::NumericalOverflowError)?,
                fair_launch.current_eligible_holders,
            )
        {
            return Err(ErrorCode::LotteryBitmapOnesMustEqualNumberOfTicketsSold.into());
        }

        fair_launch.phase_three_started = true;

        Ok(())
    }

    pub fn update_fair_launch_lottery_bitmap(
        ctx: Context<UpdateFairLaunchLotteryBitmap>,
        index: u32,
        bytes: Vec<u8>,
    ) -> ProgramResult {
        let fair_launch = &mut ctx.accounts.fair_launch;

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
            //msg!("Curr byte is {}, new byte is {}", curr_byte, byte);
            for bit_position in 0..8 {
                //msg!("Looking for position {}", bit_position);
                let mask = u8::pow(2, bit_position as u32);
                let curr_byte_masked = curr_byte & mask;
                let byte_masked = byte & mask;
                /*msg!(
                    "Mask is {} and this led to curr byte masked {} and new byte masked {}",
                    mask,
                    curr_byte_masked,
                    byte_masked
                );*/
                if curr_byte_masked > byte_masked {
                    //msg!("Subtracting 1");
                    number_of_ones_changed -= 1; // we went from a 1 to a 0
                } else if curr_byte_masked < byte_masked {
                    //msg!("Adding 1");
                    number_of_ones_changed += 1 // We went from a 0 to 1
                } else {
                    //msg!("No change here"); // 1 and 1 or 0 and 0
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
        //msg!("new number of ones is {}", new_number_of_ones);
        fair_launch_lottery_bitmap.bitmap_ones = new_number_of_ones;

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

        assert_valid_amount(&fair_launch, amount)?;

        fair_launch_ticket.fair_launch = fair_launch.key();
        fair_launch_ticket.buyer = *buyer.key;
        fair_launch_ticket.amount = amount;
        fair_launch_ticket.state = FairLaunchTicketState::NoSequenceStruct; // Be verbose even though it's 0
        fair_launch_ticket.bump = bump;
        fair_launch_ticket.seq = fair_launch.number_tickets_sold;

        fair_launch.number_tickets_sold = fair_launch
            .number_tickets_sold
            .checked_add(1)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        fair_launch.number_tickets_un_seqed = fair_launch
            .number_tickets_un_seqed
            .checked_add(1)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        adjust_counts(fair_launch, amount, None)?;

        let charged_amount = amount
            .checked_add(fair_launch.data.fee)
            .ok_or(ErrorCode::NumericalOverflowError)?;

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

            if buyer_token_account.mint != *treasury_mint_info.key {
                return Err(ErrorCode::TreasuryMintMismatch.into());
            }

            if let COption::Some(val) = buyer_token_account.delegate {
                if val != *transfer_authority_info.key {
                    return Err(ErrorCode::AccountShouldHaveNoDelegates.into());
                }
            }

            if buyer_token_account.owner != *buyer.key {
                return Err(ErrorCode::AccountOwnerShouldBeBuyer.into());
            }

            assert_owned_by(treasury_mint_info, &token_program.key)?;
            assert_owned_by(buyer_token_account_info, &token_program.key)?;

            // assert is an ATA
            assert_derivation(
                &spl_associated_token_account::id(),
                buyer_token_account_info,
                &[
                    buyer.key.as_ref(),
                    token_program.key.as_ref(),
                    &treasury_mint_info.key.as_ref(),
                ],
            )?;

            if buyer_token_account.amount < charged_amount {
                return Err(ErrorCode::NotEnoughTokens.into());
            }
            msg!("b4 {}", buyer_token_account_info.key);
            spl_token_transfer(TokenTransferParams {
                source: buyer_token_account_info.clone(),
                destination: ctx.accounts.treasury.clone(),
                authority: transfer_authority_info.clone(),
                authority_signer_seeds: &[],
                token_program: token_program.clone(),
                amount: charged_amount,
            })?;
            msg!("aft");
        } else {
            if buyer.lamports() < charged_amount {
                return Err(ErrorCode::NotEnoughSOL.into());
            }

            invoke(
                &system_instruction::transfer(buyer.key, ctx.accounts.treasury.key, charged_amount),
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
            return Err(ErrorCode::SeqAlreadyExists.into());
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
        fair_launch_ticket_seq_lookup.buyer = fair_launch_ticket.buyer;
        fair_launch_ticket_seq_lookup.seq = fair_launch_ticket.seq;

        fair_launch_ticket.state = FairLaunchTicketState::Unpunched;
        fair_launch.number_tickets_un_seqed = fair_launch
            .number_tickets_un_seqed
            .checked_sub(1)
            .ok_or(ErrorCode::NumericalOverflowError)?;
        Ok(())
    }

    pub fn adjust_ticket<'info>(
        ctx: Context<'_, '_, '_, 'info, AdjustTicket<'info>>,
        amount: u64,
    ) -> ProgramResult {
        let fair_launch = &mut ctx.accounts.fair_launch;
        let fair_launch_ticket = &mut ctx.accounts.fair_launch_ticket;
        let fair_launch_lottery_bitmap_info = &ctx.accounts.fair_launch_lottery_bitmap;
        let buyer = &ctx.remaining_accounts[0];
        let clock = &mut ctx.accounts.clock;

        assert_derivation(
            ctx.program_id,
            &fair_launch_lottery_bitmap_info,
            &[
                PREFIX.as_bytes(),
                fair_launch.token_mint.as_ref(),
                LOTTERY.as_bytes(),
            ],
        )?;

        assert_derivation(
            ctx.program_id,
            &fair_launch_ticket.to_account_info(),
            &[
                PREFIX.as_bytes(),
                fair_launch.token_mint.as_ref(),
                buyer.key.as_ref(),
            ],
        )?;

        if fair_launch_ticket.fair_launch != fair_launch.key() {
            return Err(ErrorCode::FairLaunchMismatch.into());
        }

        if fair_launch_ticket.state.clone() as u8 != FairLaunchTicketState::Unpunched as u8 {
            return Err(ErrorCode::InvalidFairLaunchTicketState.into());
        }

        if fair_launch.phase_three_started {
            if fair_launch_ticket.amount < fair_launch.current_median && amount != 0 {
                return Err(ErrorCode::CanOnlySubmitZeroDuringPhaseThree.into());
            } else if fair_launch_ticket.amount >= fair_launch.current_median {
                let (mask, index) = get_mask_and_index_for_seq(fair_launch_ticket.seq)?;

                let is_winner = fair_launch_lottery_bitmap_info.data.borrow()
                    [FAIR_LAUNCH_LOTTERY_SIZE + index]
                    & mask;

                if is_winner > 0 {
                    if amount != fair_launch.current_median {
                        return Err(ErrorCode::CanOnlySubmitDifferenceDuringPhaseThree.into());
                    }
                } else if amount != 0 {
                    return Err(ErrorCode::DidNotWinLotteryCanOnlyWithdraw.into());
                }
            }
        } else if !buyer.is_signer {
            return Err(ErrorCode::DuringPhaseTwoAndOneBuyerMustBeSigner.into());
        } else if clock.unix_timestamp > fair_launch.data.phase_two_end {
            return Err(ErrorCode::PhaseTwoEnded.into());
        }

        if amount != 0 {
            assert_valid_amount(&fair_launch, amount)?;
        } else {
            // going from not zero to zero
            fair_launch.number_tickets_dropped = fair_launch
                .number_tickets_dropped
                .checked_add(1)
                .ok_or(ErrorCode::NumericalOverflowError)?;
            fair_launch_ticket.state = FairLaunchTicketState::Withdrawn
        }

        if clock.unix_timestamp <= fair_launch.data.phase_one_end {
            // freeze counts after phase one ends...
            adjust_counts(fair_launch, amount, Some(fair_launch_ticket.amount))?;
        } else {
            if amount >= fair_launch.current_median
                && fair_launch_ticket.amount < fair_launch.current_median
            {
                fair_launch.current_eligible_holders = fair_launch
                    .current_eligible_holders
                    .checked_add(1)
                    .ok_or(ErrorCode::NumericalOverflowError)?;
            } else if amount < fair_launch.current_median
                && fair_launch_ticket.amount >= fair_launch.current_median
            {
                fair_launch.current_eligible_holders = fair_launch
                    .current_eligible_holders
                    .checked_sub(1)
                    .ok_or(ErrorCode::NumericalOverflowError)?;
            }
        }

        if let Some(treasury_mint) = fair_launch.treasury_mint {
            let treasury_mint_info = &ctx.remaining_accounts[1];
            let _treasury_mint: spl_token::state::Mint = assert_initialized(&treasury_mint_info)?;

            let buyer_token_account_info = &ctx.remaining_accounts[2];
            let buyer_token_account: Account = assert_initialized(&buyer_token_account_info)?;

            let transfer_authority_info = &ctx.remaining_accounts[3];

            let token_program = &ctx.remaining_accounts[4];

            if token_program.key != &spl_token::id() {
                return Err(ErrorCode::InvalidTokenProgram.into());
            }

            if *treasury_mint_info.key != treasury_mint {
                return Err(ErrorCode::TreasuryMintMismatch.into());
            }

            if buyer_token_account.mint != *treasury_mint_info.key {
                return Err(ErrorCode::TreasuryMintMismatch.into());
            }

            assert_owned_by(treasury_mint_info, &token_program.key)?;
            assert_owned_by(buyer_token_account_info, &token_program.key)?;

            // assert is an ATA
            assert_derivation(
                &spl_associated_token_account::id(),
                buyer_token_account_info,
                &[
                    buyer.key.as_ref(),
                    token_program.key.as_ref(),
                    &treasury_mint_info.key.as_ref(),
                ],
            )?;

            if let COption::Some(val) = buyer_token_account.delegate {
                if val != *transfer_authority_info.key {
                    return Err(ErrorCode::AccountShouldHaveNoDelegates.into());
                }
            }

            if buyer_token_account.owner != *buyer.key {
                return Err(ErrorCode::AccountOwnerShouldBeBuyer.into());
            }

            let signer_seeds = [
                PREFIX.as_bytes(),
                fair_launch.token_mint.as_ref(),
                &[fair_launch.bump],
            ];

            if amount > fair_launch_ticket.amount {
                let difference = amount
                    .checked_sub(fair_launch_ticket.amount)
                    .ok_or(ErrorCode::NumericalOverflowError)?;

                if buyer_token_account.amount < difference {
                    return Err(ErrorCode::NotEnoughTokens.into());
                }

                spl_token_transfer(TokenTransferParams {
                    source: buyer_token_account_info.clone(),
                    destination: ctx.accounts.treasury.clone(),
                    authority: transfer_authority_info.clone(),
                    authority_signer_seeds: &[],
                    token_program: token_program.clone(),
                    amount: difference,
                })?;
            } else if amount < fair_launch_ticket.amount {
                let difference = fair_launch_ticket
                    .amount
                    .checked_sub(amount)
                    .ok_or(ErrorCode::NumericalOverflowError)?;

                spl_token_transfer(TokenTransferParams {
                    source: ctx.accounts.treasury.clone(),
                    destination: buyer_token_account_info.clone(),
                    authority: fair_launch.to_account_info(),
                    authority_signer_seeds: &signer_seeds,
                    token_program: token_program.clone(),
                    amount: difference,
                })?;
            }
        } else {
            if amount > fair_launch_ticket.amount {
                let difference = amount
                    .checked_sub(fair_launch_ticket.amount)
                    .ok_or(ErrorCode::NumericalOverflowError)?;

                if buyer.lamports() < difference {
                    return Err(ErrorCode::NotEnoughSOL.into());
                }

                invoke(
                    &system_instruction::transfer(buyer.key, ctx.accounts.treasury.key, difference),
                    &[
                        buyer.clone(),
                        ctx.accounts.treasury.clone(),
                        ctx.accounts.system_program.clone(),
                    ],
                )?;
            } else if amount < fair_launch_ticket.amount {
                let difference = fair_launch_ticket
                    .amount
                    .checked_sub(amount)
                    .ok_or(ErrorCode::NumericalOverflowError)?;

                let treasury_signer_seeds = [
                    PREFIX.as_bytes(),
                    fair_launch.token_mint.as_ref(),
                    TREASURY.as_bytes(),
                    &[fair_launch.treasury_bump],
                ];

                invoke_signed(
                    &system_instruction::transfer(ctx.accounts.treasury.key, buyer.key, difference),
                    &[
                        buyer.clone(),
                        ctx.accounts.treasury.clone(),
                        ctx.accounts.system_program.clone(),
                    ],
                    &[&treasury_signer_seeds],
                )?;
            }
        }

        fair_launch_ticket.amount = amount;
        Ok(())
    }

    pub fn punch_ticket<'info>(
        ctx: Context<'_, '_, '_, 'info, PunchTicket<'info>>,
    ) -> ProgramResult {
        let fair_launch = &mut ctx.accounts.fair_launch;
        let fair_launch_ticket = &mut ctx.accounts.fair_launch_ticket;
        let fair_launch_lottery_bitmap = &ctx.accounts.fair_launch_lottery_bitmap;
        let buyer_token_account_info = &ctx.accounts.buyer_token_account;
        let token_program = &ctx.accounts.token_program;
        let token_mint = &ctx.accounts.token_mint;

        if fair_launch_ticket.state.clone() as u8 != FairLaunchTicketState::Unpunched as u8 {
            return Err(ErrorCode::InvalidFairLaunchTicketState.into());
        }

        if !fair_launch.phase_three_started {
            return Err(ErrorCode::CannotPunchTicketUntilPhaseThree.into());
        }

        if fair_launch_ticket.amount != fair_launch.current_median {
            return Err(ErrorCode::CannotPunchTicketUntilEqualized.into());
        }

        let (mask, index) = get_mask_and_index_for_seq(fair_launch_ticket.seq)?;

        let is_winner = fair_launch_lottery_bitmap.to_account_info().data.borrow()
            [FAIR_LAUNCH_LOTTERY_SIZE + index]
            & mask;

        if is_winner == 0 {
            return Err(ErrorCode::DidNotWinLotteryCanOnlyWithdraw.into());
        }

        if fair_launch_ticket.amount < fair_launch.current_median {
            return Err(ErrorCode::CannotPunchTicketWhenHavingPaidLessThanMedian.into());
        }

        // assert is an ATA owned by the buyer on the fair launch ticket, has no delegates, is a token account,
        // etc Since this is a permissionless endpoint (for cranks)
        assert_derivation(
            &spl_associated_token_account::id(),
            buyer_token_account_info,
            &[
                fair_launch_ticket.buyer.as_ref(),
                token_program.key.as_ref(),
                &token_mint.key.as_ref(),
            ],
        )?;

        let buyer_token: Account = assert_initialized(buyer_token_account_info)?;

        assert_owned_by(buyer_token_account_info, token_program.key)?;

        if buyer_token.delegate.is_some() {
            return Err(ErrorCode::AccountShouldHaveNoDelegates.into());
        }

        if buyer_token.owner != fair_launch_ticket.buyer {
            return Err(ErrorCode::AccountOwnerShouldBeBuyer.into());
        }

        fair_launch.number_tickets_punched = fair_launch
            .number_tickets_punched
            .checked_add(1)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        fair_launch_ticket.state = FairLaunchTicketState::Punched;

        let signer_seeds = [
            PREFIX.as_bytes(),
            fair_launch.token_mint.as_ref(),
            &[fair_launch.bump],
        ];

        spl_token_mint_to(
            token_mint.clone(),
            buyer_token_account_info.clone(),
            1,
            fair_launch.to_account_info(),
            &signer_seeds,
            token_program.clone(),
        )?;

        Ok(())
    }

    pub fn withdraw_funds<'info>(
        ctx: Context<'_, '_, '_, 'info, WithdrawFunds<'info>>,
    ) -> ProgramResult {
        let fair_launch = &mut ctx.accounts.fair_launch;
        let treasury = &mut ctx.accounts.treasury;
        let authority = &mut ctx.accounts.authority;
        let token_mint = &ctx.accounts.token_mint;

        if fair_launch.number_tickets_sold
            > fair_launch.number_tickets_dropped + fair_launch.number_tickets_punched
        {
            return Err(ErrorCode::CannotCashOutUntilAllRefundsAndPunchesHaveBeenProcessed.into());
        }

        if !fair_launch.phase_three_started {
            return Err(ErrorCode::CannotCashOutUntilPhaseThree.into());
        }

        let mint: spl_token::state::Mint = assert_initialized(token_mint)?;
        let tokens = mint.supply;

        let signer_seeds = [
            PREFIX.as_bytes(),
            &token_mint.key.as_ref(),
            &[fair_launch.bump],
        ];

        if let Some(treasury_mint) = fair_launch.treasury_mint {
            let treasury_mint_info = &ctx.remaining_accounts[0];
            let _treasury_mint: spl_token::state::Mint = assert_initialized(&treasury_mint_info)?;

            let authority_token_account_info = &ctx.remaining_accounts[1];
            let authority_token_account: Account =
                assert_initialized(&authority_token_account_info)?;
            let treasury_account: Account = assert_initialized(treasury)?;

            let token_program = &ctx.remaining_accounts[2];

            if token_program.key != &spl_token::id() {
                return Err(ErrorCode::InvalidTokenProgram.into());
            }

            if *treasury_mint_info.key != treasury_mint {
                return Err(ErrorCode::TreasuryMintMismatch.into());
            }

            assert_owned_by(treasury_mint_info, &token_program.key)?;
            assert_owned_by(authority_token_account_info, &token_program.key)?;
            assert_owned_by(treasury, &token_program.key)?;

            if authority_token_account.mint != *treasury_mint_info.key {
                return Err(ErrorCode::TreasuryMintMismatch.into());
            }

            // assert is an ATA
            assert_derivation(
                &spl_associated_token_account::id(),
                authority_token_account_info,
                &[
                    authority.key.as_ref(),
                    token_program.key.as_ref(),
                    &treasury_mint_info.key.as_ref(),
                ],
            )?;

            if authority_token_account.delegate.is_some() {
                return Err(ErrorCode::AccountShouldHaveNoDelegates.into());
            }

            if authority_token_account.owner != fair_launch.authority {
                return Err(ErrorCode::AccountOwnerShouldBeAuthority.into());
            }

            if fair_launch.treasury_snapshot.is_none() {
                fair_launch.treasury_snapshot = Some(treasury_account.amount)
            }

            let amount = calculate_withdraw_amount(
                &fair_launch.data,
                tokens,
                fair_launch.treasury_snapshot.unwrap(),
                treasury_account.amount,
            )?;

            spl_token_transfer(TokenTransferParams {
                source: treasury.to_account_info(),
                destination: authority_token_account_info.clone(),
                authority: fair_launch.to_account_info(),
                authority_signer_seeds: &signer_seeds,
                token_program: token_program.clone(),
                amount,
            })?;
        } else {
            if fair_launch.treasury_snapshot.is_none() {
                fair_launch.treasury_snapshot = Some(treasury.lamports())
            }

            let amount = calculate_withdraw_amount(
                &fair_launch.data,
                tokens,
                fair_launch.treasury_snapshot.unwrap(),
                treasury.lamports(),
            )?;

            let treasury_signer_seeds = [
                PREFIX.as_bytes(),
                fair_launch.token_mint.as_ref(),
                TREASURY.as_bytes(),
                &[fair_launch.treasury_bump],
            ];

            invoke_signed(
                &system_instruction::transfer(treasury.key, authority.key, amount),
                &[
                    treasury.to_account_info(),
                    authority.clone(),
                    ctx.accounts.system_program.clone(),
                ],
                &[&treasury_signer_seeds],
            )?;
        }

        Ok(())
    }

    pub fn receive_refund<'info>(
        ctx: Context<'_, '_, '_, 'info, ReceiveRefund<'info>>,
    ) -> ProgramResult {
        let fair_launch = &mut ctx.accounts.fair_launch;
        let treasury = &mut ctx.accounts.treasury;
        let buyer = &mut ctx.accounts.buyer;
        let token_mint = &ctx.accounts.token_mint;
        let token_program = &ctx.accounts.token_program;
        let clock = &ctx.accounts.clock;
        let buyer_token_account = &mut ctx.accounts.buyer_token_account;
        let transfer_authority = &mut ctx.accounts.transfer_authority;

        let signer_seeds = [
            PREFIX.as_bytes(),
            &token_mint.key.as_ref(),
            &[fair_launch.bump],
        ];

        if fair_launch.number_tickets_sold
            > fair_launch.number_tickets_dropped + fair_launch.number_tickets_punched
        {
            return Err(ErrorCode::CannotRefundUntilAllTicketsHaveBeenPunchedOrDropped.into());
        }

        if !fair_launch.phase_three_started {
            return Err(ErrorCode::CannotRefundUntilPhaseThree.into());
        }

        fair_launch.number_tokens_burned_for_refunds = fair_launch
            .number_tokens_burned_for_refunds
            .checked_add(1)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        spl_token_burn(TokenBurnParams {
            mint: token_mint.clone(),
            source: buyer_token_account.clone(),
            amount: 1,
            authority: transfer_authority.clone(),
            authority_signer_seeds: None,
            token_program: token_program.clone(),
        })?;

        if let Some(treasury_mint) = fair_launch.treasury_mint {
            let treasury_mint_info = &ctx.remaining_accounts[0];
            let _treasury_mint: spl_token::state::Mint = assert_initialized(&treasury_mint_info)?;

            let buyer_payment_account_info = &ctx.remaining_accounts[1];
            let buyer_payment_account: Account = assert_initialized(&buyer_payment_account_info)?;
            let treasury_account: Account = assert_initialized(treasury)?;

            if *treasury_mint_info.key != treasury_mint {
                return Err(ErrorCode::TreasuryMintMismatch.into());
            }

            assert_owned_by(treasury_mint_info, &token_program.key)?;
            assert_owned_by(buyer_payment_account_info, &token_program.key)?;
            assert_owned_by(treasury, &token_program.key)?;

            if buyer_payment_account.mint != *treasury_mint_info.key {
                return Err(ErrorCode::TreasuryMintMismatch.into());
            }

            // assert is an ATA
            assert_derivation(
                &spl_associated_token_account::id(),
                buyer_payment_account_info,
                &[
                    buyer.key.as_ref(),
                    token_program.key.as_ref(),
                    &treasury_mint_info.key.as_ref(),
                ],
            )?;

            if buyer_payment_account.delegate.is_some() {
                return Err(ErrorCode::AccountShouldHaveNoDelegates.into());
            }

            if buyer_payment_account.owner != *buyer.key {
                return Err(ErrorCode::AccountOwnerShouldBeBuyer.into());
            }

            if fair_launch.treasury_snapshot.is_none() {
                fair_launch.treasury_snapshot = Some(treasury_account.amount)
            }

            let amount = calculate_refund_amount(fair_launch, clock.unix_timestamp)?;

            spl_token_transfer(TokenTransferParams {
                source: treasury.to_account_info(),
                destination: buyer_payment_account_info.clone(),
                authority: fair_launch.to_account_info(),
                authority_signer_seeds: &signer_seeds,
                token_program: token_program.clone(),
                amount,
            })?;
        } else {
            if fair_launch.treasury_snapshot.is_none() {
                fair_launch.treasury_snapshot = Some(treasury.lamports())
            }

            let amount = calculate_refund_amount(fair_launch, clock.unix_timestamp)?;

            let signer_seeds = &[
                PREFIX.as_bytes(),
                fair_launch.token_mint.as_ref(),
                TREASURY.as_bytes(),
                &[fair_launch.treasury_bump],
            ];

            invoke_signed(
                &system_instruction::transfer(treasury.key, buyer.key, amount),
                &[
                    treasury.to_account_info(),
                    buyer.clone(),
                    ctx.accounts.system_program.clone(),
                ],
                &[signer_seeds],
            )?;
        }

        Ok(())
    }

    pub fn restart_phase_two<'info>(
        ctx: Context<'_, '_, '_, 'info, RestartPhaseTwo<'info>>,
    ) -> ProgramResult {
        let fair_launch = &mut ctx.accounts.fair_launch;
        let clock = &mut ctx.accounts.clock;

        if fair_launch.phase_three_started {
            return Err(ErrorCode::PhaseThreeAlreadyStarted.into());
        }

        if clock.unix_timestamp < fair_launch.data.phase_two_end {
            return Err(ErrorCode::PhaseTwoHasntEndedYet.into());
        }

        if clock.unix_timestamp
            < fair_launch
                .data
                .phase_two_end
                .checked_add(fair_launch.data.lottery_duration)
                .ok_or(ErrorCode::NumericalOverflowError)?
        {
            return Err(ErrorCode::LotteryDurationHasntEndedYet.into());
        }

        fair_launch.data.phase_two_end = clock.unix_timestamp + fair_launch.data.lottery_duration;

        Ok(())
    }

    pub fn set_token_metadata<'info>(
        ctx: Context<'_, '_, '_, 'info, SetTokenMetadata<'info>>,
        data: TokenMetadata,
    ) -> ProgramResult {
        let fair_launch = &ctx.accounts.fair_launch;
        let token_mint = fair_launch.token_mint;

        let authority_seeds = [PREFIX.as_bytes(), token_mint.as_ref(), &[fair_launch.bump]];

        let mut creators: Vec<metaplex_token_metadata::state::Creator> =
            vec![metaplex_token_metadata::state::Creator {
                address: fair_launch.key(),
                verified: true,
                share: 0,
            }];

        if let Some(cre) = &data.creators {
            for c in cre {
                creators.push(metaplex_token_metadata::state::Creator {
                    address: c.address,
                    verified: c.verified,
                    share: c.share,
                });
            }
        }

        let update_infos = vec![
            ctx.accounts.token_metadata_program.clone(),
            ctx.accounts.token_program.clone(),
            ctx.accounts.metadata.clone(),
            fair_launch.to_account_info().clone(),
        ];

        if ctx.accounts.metadata.data_is_empty() {
            msg!("Creating metadata");
            let metadata_infos = vec![
                ctx.accounts.metadata.clone(),
                ctx.accounts.token_mint.clone(),
                ctx.accounts.payer.clone(),
                ctx.accounts.token_metadata_program.clone(),
                ctx.accounts.token_program.clone(),
                ctx.accounts.system_program.clone(),
                ctx.accounts.rent.to_account_info().clone(),
                fair_launch.to_account_info().clone(),
            ];

            invoke_signed(
                &create_metadata_accounts(
                    *ctx.accounts.token_metadata_program.key,
                    *ctx.accounts.metadata.key,
                    *ctx.accounts.token_mint.key,
                    fair_launch.key(),
                    *ctx.accounts.payer.key,
                    ctx.accounts.fair_launch.key(),
                    data.name,
                    data.symbol.clone(),
                    data.uri,
                    Some(creators),
                    data.seller_fee_basis_points,
                    false,
                    data.is_mutable,
                ),
                metadata_infos.as_slice(),
                &[&authority_seeds],
            )?;
            invoke_signed(
                &update_metadata_accounts(
                    *ctx.accounts.token_metadata_program.key,
                    *ctx.accounts.metadata.key,
                    fair_launch.key(),
                    None,
                    None,
                    Some(true),
                ),
                update_infos.as_slice(),
                &[&authority_seeds],
            )?;
        } else {
            msg!("Updating metadata");
            invoke_signed(
                &update_metadata_accounts(
                    *ctx.accounts.token_metadata_program.key,
                    *ctx.accounts.metadata.key,
                    fair_launch.key(),
                    None,
                    Some(metaplex_token_metadata::state::Data {
                        name: data.name,
                        symbol: data.symbol,
                        uri: data.uri,
                        creators: Some(creators),
                        seller_fee_basis_points: data.seller_fee_basis_points,
                    }),
                    None,
                ),
                update_infos.as_slice(),
                &[&authority_seeds],
            )?;
        }

        Ok(())
    }

    pub fn set_participation_nft<'info>(
        ctx: Context<'_, '_, '_, 'info, SetParticipationNFT<'info>>,
        participation_mint_bump: u8,
        participation_token_bump: u8,
        participation_modulo: u8,
        data: TokenMetadata,
    ) -> ProgramResult {
        let fair_launch = &mut ctx.accounts.fair_launch;
        let participation_mint = &ctx.accounts.participation_mint;
        let participation_token_info = &ctx.accounts.participation_token_account;
        let participation_mint_info = participation_mint.to_account_info();

        let token_program = &ctx.accounts.token_program;

        if token_program.key != &spl_token::id() {
            return Err(ErrorCode::InvalidTokenProgram.into());
        }

        fair_launch.participation_mint_bump = participation_mint_bump;
        fair_launch.participation_token_bump = participation_token_bump;
        fair_launch.participation_mint = Some(participation_mint.key());
        fair_launch.participation_modulo = participation_modulo;

        if participation_modulo == 0 {
            return Err(ErrorCode::InvalidParticipationModulo.into());
        }

        // make the token account

        let authority_seeds = [
            PREFIX.as_bytes(),
            fair_launch.token_mint.as_ref(),
            &[fair_launch.bump],
        ];

        let mut creators: Vec<metaplex_token_metadata::state::Creator> =
            vec![metaplex_token_metadata::state::Creator {
                address: fair_launch.key(),
                verified: true,
                share: 0,
            }];

        if let Some(cre) = &data.creators {
            for c in cre {
                creators.push(metaplex_token_metadata::state::Creator {
                    address: c.address,
                    verified: c.verified,
                    share: c.share,
                });
            }
        }
        assert_owned_by(&participation_mint_info, &spl_token::id())?;

        assert_derivation(
            &ctx.program_id,
            participation_token_info,
            &[
                PREFIX.as_bytes(),
                fair_launch.authority.as_ref(),
                MINT.as_bytes(),
                fair_launch.data.uuid.as_bytes(),
                PARTICIPATION.as_bytes(),
                ACCOUNT.as_bytes(),
            ],
        )?;

        let signer_seeds = &[
            PREFIX.as_bytes(),
            fair_launch.authority.as_ref(),
            MINT.as_bytes(),
            fair_launch.data.uuid.as_bytes(),
            PARTICIPATION.as_bytes(),
            ACCOUNT.as_bytes(),
            &[participation_token_bump],
        ];

        if participation_token_info.data_len() > 0 {
            return Err(ErrorCode::ParticipationTokenAccountAlreadyExists.into());
        };

        msg!("Allocating token account");

        create_or_allocate_account_raw(
            *ctx.accounts.token_program.key,
            participation_token_info,
            &ctx.accounts.rent.to_account_info(),
            &ctx.accounts.system_program,
            &ctx.accounts.payer,
            Account::LEN,
            signer_seeds,
        )?;

        invoke_signed(
            &initialize_account2(
                &ctx.accounts.token_program.key,
                participation_token_info.key,
                participation_mint_info.key,
                &fair_launch.key(),
            )
            .unwrap(),
            &[
                ctx.accounts.token_program.clone(),
                participation_token_info.clone(),
                fair_launch.to_account_info(),
                participation_mint_info.clone(),
                ctx.accounts.rent.to_account_info(),
            ],
            &[signer_seeds],
        )?;
        msg!("Minting token");

        invoke_signed(
            &mint_to(
                &ctx.accounts.token_program.key,
                participation_mint_info.key,
                participation_token_info.key,
                &fair_launch.key(),
                &[],
                1,
            )
            .unwrap(),
            &[
                ctx.accounts.token_program.clone(),
                participation_token_info.clone(),
                fair_launch.to_account_info(),
                participation_mint_info.clone(),
                ctx.accounts.rent.to_account_info(),
            ],
            &[&authority_seeds],
        )?;

        msg!("Creating metadata");
        let metadata_infos = vec![
            ctx.accounts.metadata.clone(),
            participation_mint_info.clone(),
            ctx.accounts.payer.clone(),
            ctx.accounts.token_metadata_program.clone(),
            ctx.accounts.token_program.clone(),
            ctx.accounts.system_program.clone(),
            ctx.accounts.rent.to_account_info().clone(),
            fair_launch.to_account_info(),
        ];

        let master_edition_infos = vec![
            ctx.accounts.master_edition.clone(),
            participation_mint_info.clone(),
            fair_launch.to_account_info(),
            ctx.accounts.payer.clone(),
            ctx.accounts.metadata.clone(),
            ctx.accounts.token_metadata_program.clone(),
            ctx.accounts.token_program.clone(),
            ctx.accounts.system_program.clone(),
            ctx.accounts.rent.to_account_info().clone(),
        ];

        invoke_signed(
            &create_metadata_accounts(
                *ctx.accounts.token_metadata_program.key,
                *ctx.accounts.metadata.key,
                *participation_mint_info.key,
                fair_launch.key(),
                *ctx.accounts.payer.key,
                fair_launch.key(),
                data.name,
                data.symbol.clone(),
                data.uri,
                Some(creators),
                data.seller_fee_basis_points,
                false,
                data.is_mutable,
            ),
            metadata_infos.as_slice(),
            &[&authority_seeds],
        )?;

        msg!("Creating master edition");
        invoke_signed(
            &create_master_edition(
                *ctx.accounts.token_metadata_program.key,
                *ctx.accounts.master_edition.key,
                *participation_mint_info.key,
                fair_launch.key(),
                fair_launch.key(),
                *ctx.accounts.metadata.key,
                *ctx.accounts.payer.key,
                None,
            ),
            master_edition_infos.as_slice(),
            &[&authority_seeds],
        )?;

        Ok(())
    }

    pub fn update_participation_nft<'info>(
        ctx: Context<'_, '_, '_, 'info, UpdateParticipationNFT<'info>>,
        participation_modulo: u8,
        data: TokenMetadata,
    ) -> ProgramResult {
        let fair_launch = &mut ctx.accounts.fair_launch;
        fair_launch.participation_modulo = participation_modulo;

        let token_program = &ctx.accounts.token_program;

        if token_program.key != &spl_token::id() {
            return Err(ErrorCode::InvalidTokenProgram.into());
        }

        if participation_modulo == 0 {
            return Err(ErrorCode::InvalidParticipationModulo.into());
        }

        let authority_seeds = [
            PREFIX.as_bytes(),
            fair_launch.token_mint.as_ref(),
            &[fair_launch.bump],
        ];

        let mut creators: Vec<metaplex_token_metadata::state::Creator> =
            vec![metaplex_token_metadata::state::Creator {
                address: fair_launch.key(),
                verified: true,
                share: 0,
            }];

        if let Some(cre) = &data.creators {
            for c in cre {
                creators.push(metaplex_token_metadata::state::Creator {
                    address: c.address,
                    verified: c.verified,
                    share: c.share,
                });
            }
        }

        let update_infos = vec![
            ctx.accounts.token_metadata_program.clone(),
            ctx.accounts.token_program.clone(),
            ctx.accounts.metadata.clone(),
            fair_launch.to_account_info().clone(),
        ];

        msg!("Updating metadata");
        invoke_signed(
            &update_metadata_accounts(
                *ctx.accounts.token_metadata_program.key,
                *ctx.accounts.metadata.key,
                fair_launch.key(),
                None,
                Some(metaplex_token_metadata::state::Data {
                    name: data.name,
                    symbol: data.symbol,
                    uri: data.uri,
                    creators: Some(creators),
                    seller_fee_basis_points: data.seller_fee_basis_points,
                }),
                None,
            ),
            update_infos.as_slice(),
            &[&authority_seeds],
        )?;

        Ok(())
    }

    pub fn mint_participation_nft<'info>(
        ctx: Context<'_, '_, '_, 'info, MintParticipationNFT<'info>>,
    ) -> ProgramResult {
        let fair_launch = &ctx.accounts.fair_launch;
        let fair_launch_ticket = &mut ctx.accounts.fair_launch_ticket;
        let buyer = &ctx.accounts.buyer;
        let buyer_nft_token_account_info = &ctx.accounts.buyer_nft_token_account;

        let token_program = &ctx.accounts.token_program;

        if token_program.key != &spl_token::id() {
            return Err(ErrorCode::InvalidTokenProgram.into());
        }

        if fair_launch.participation_modulo == 0 {
            return Err(ErrorCode::InvalidParticipationModulo.into());
        }

        if fair_launch_ticket.gotten_participation {
            return Err(ErrorCode::AlreadyMintedParticipation.into());
        }

        if let Some(val) = fair_launch_ticket
            .seq
            .checked_rem(fair_launch.participation_modulo as u64)
        {
            msg!("Val is {}", val);
            if val != 0 {
                return Err(ErrorCode::NotEligibleForParticipation.into());
            }
        } else {
            return Err(ErrorCode::NotEligibleForParticipation.into());
        }

        fair_launch_ticket.gotten_participation = true;

        let authority_seeds = [
            PREFIX.as_bytes(),
            fair_launch.token_mint.as_ref(),
            &[fair_launch.bump],
        ];

        let buyer_nft_token_account: Account = assert_initialized(&buyer_nft_token_account_info)?;

        if buyer_nft_token_account.mint != *ctx.accounts.new_mint.key {
            return Err(ErrorCode::ParticipationMintMismatch.into());
        }

        if buyer_nft_token_account.delegate.is_some() {
            return Err(ErrorCode::AccountShouldHaveNoDelegates.into());
        }

        if buyer_nft_token_account.owner != *buyer.key {
            return Err(ErrorCode::AccountOwnerShouldBeBuyer.into());
        }

        assert_owned_by(buyer_nft_token_account_info, &token_program.key)?;

        // assert is an ATA
        assert_derivation(
            &spl_associated_token_account::id(),
            buyer_nft_token_account_info,
            &[
                buyer.key.as_ref(),
                token_program.key.as_ref(),
                &ctx.accounts.new_mint.key.as_ref(),
            ],
        )?;

        let edition_infos = vec![
            ctx.accounts.metadata.clone(),
            ctx.accounts.new_metadata.clone(),
            ctx.accounts.new_edition.clone(),
            ctx.accounts.master_edition.clone(),
            ctx.accounts.new_mint.clone(),
            ctx.accounts.participation_token_account.clone(),
            ctx.accounts.participation_mint.to_account_info(),
            ctx.accounts.payer.clone(),
            ctx.accounts.token_metadata_program.clone(),
            ctx.accounts.token_program.clone(),
            ctx.accounts.system_program.clone(),
            ctx.accounts.edition_mark_pda.clone(),
            ctx.accounts.rent.to_account_info(),
            fair_launch.to_account_info(),
        ];

        invoke_signed(
            &mint_new_edition_from_master_edition_via_token(
                *ctx.accounts.token_metadata_program.key,
                *ctx.accounts.new_metadata.key,
                *ctx.accounts.new_edition.key,
                *ctx.accounts.master_edition.key,
                *ctx.accounts.new_mint.key,
                *ctx.accounts.payer.key,
                *ctx.accounts.payer.key,
                fair_launch.key(),
                *ctx.accounts.participation_token_account.key,
                fair_launch.key(),
                *ctx.accounts.metadata.key,
                ctx.accounts.participation_mint.key(),
                fair_launch_ticket.seq,
            ),
            edition_infos.as_slice(),
            &[&authority_seeds],
        )?;

        invoke_signed(
            &update_metadata_accounts(
                *ctx.accounts.token_metadata_program.key,
                *ctx.accounts.new_metadata.key,
                fair_launch.key(),
                None,
                None,
                Some(true),
            ),
            &[
                ctx.accounts.token_metadata_program.clone(),
                ctx.accounts.new_metadata.clone(),
                fair_launch.to_account_info(),
            ],
            &[&authority_seeds],
        )?;

        Ok(())
    }

    pub fn mint_tokens<'info>(
        ctx: Context<'_, '_, '_, 'info, MintTokens<'info>>,
        amount: u64,
    ) -> ProgramResult {
        let fair_launch = &mut ctx.accounts.fair_launch;
        let token_account = &mut ctx.accounts.token_account;
        let token_mint = &mut ctx.accounts.token_mint;
        let authority = &mut ctx.accounts.authority;
        let token_program = &ctx.accounts.token_program;

        if token_program.key != &spl_token::id() {
            return Err(ErrorCode::InvalidTokenProgram.into());
        }
        if token_account.mint != fair_launch.token_mint {
            return Err(ErrorCode::TokenMintMismatch.into());
        }
        if fair_launch.number_tickets_sold
            > fair_launch.number_tickets_dropped + fair_launch.number_tickets_punched
        {
            return Err(ErrorCode::CannotMintTokensUntilAllCashedOut.into());
        }

        let token_account_info = &token_account.to_account_info();

        assert_owned_by(token_account_info, &token_program.key)?;

        // assert is an ATA
        assert_derivation(
            &spl_associated_token_account::id(),
            token_account_info,
            &[
                authority.key.as_ref(),
                token_program.key.as_ref(),
                &token_mint.key().as_ref(),
            ],
        )?;

        if token_account.delegate.is_some() {
            return Err(ErrorCode::AccountShouldHaveNoDelegates.into());
        }

        if token_account.owner != *authority.key {
            return Err(ErrorCode::AccountOwnerShouldBeBuyer.into());
        }

        let total_new = token_mint
            .supply
            .checked_add(amount)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        if total_new > fair_launch.data.number_of_tokens {
            return Err(ErrorCode::CannotMintMoreTokensThanTotal.into());
        }

        let signer_seeds = [
            PREFIX.as_bytes(),
            fair_launch.token_mint.as_ref(),
            &[fair_launch.bump],
        ];

        spl_token_mint_to(
            token_mint.to_account_info(),
            token_account_info.clone(),
            amount,
            fair_launch.to_account_info(),
            &signer_seeds,
            ctx.accounts.token_program.clone(),
        )?;

        if !fair_launch.phase_three_started {
            fair_launch.number_tokens_preminted = total_new
        }

        Ok(())
    }
}
#[derive(Accounts)]
#[instruction(bump: u8, treasury_bump: u8, token_mint_bump: u8, data: FairLaunchData)]
pub struct InitializeFairLaunch<'info> {
    #[account(init, seeds=[PREFIX.as_bytes(), token_mint.key.as_ref()], payer=payer, bump=bump, space=FAIR_LAUNCH_SPACE_VEC_START+8u64.checked_mul((data.price_range_end - data.price_range_start).checked_div(data.tick_size).ok_or(ErrorCode::NumericalOverflowError)?.checked_add(2).ok_or(ErrorCode::NumericalOverflowError)?).ok_or(ErrorCode::NumericalOverflowError)? as usize)]
    fair_launch: ProgramAccount<'info, FairLaunch>,
    #[account(init, seeds=[PREFIX.as_bytes(), authority.key.as_ref(), MINT.as_bytes(), data.uuid.as_bytes()], mint::authority=fair_launch, mint::decimals=0, payer=payer, bump=token_mint_bump)]
    token_mint: CpiAccount<'info, Mint>,
    #[account(mut)]
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
    clock: Sysvar<'info, Clock>,
}

/// Limited Update that only sets phase 3 dates once bitmap is in place and fully setup.
#[derive(Accounts)]
pub struct StartPhaseThree<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref()], bump=fair_launch.bump, has_one=authority, has_one=token_mint)]
    fair_launch: ProgramAccount<'info, FairLaunch>,
    #[account(seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref(), LOTTERY.as_bytes()], constraint=fair_launch_lottery_bitmap.to_account_info().data_len() > 0, bump=fair_launch_lottery_bitmap.bump, has_one=fair_launch)]
    fair_launch_lottery_bitmap: ProgramAccount<'info, FairLaunchLotteryBitmap>,
    #[account(signer)]
    authority: AccountInfo<'info>,
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.authority.as_ref(), MINT.as_bytes(), fair_launch.data.uuid.as_bytes()], bump=fair_launch.token_mint_bump)]
    token_mint: CpiAccount<'info, Mint>,
}

/// Restarts phase two with as much time as the lottery duration had if duration is passed
#[derive(Accounts)]
pub struct RestartPhaseTwo<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref()], bump=fair_launch.bump)]
    fair_launch: ProgramAccount<'info, FairLaunch>,
    clock: Sysvar<'info, Clock>,
}

/// Can only create the fair launch lottery bitmap after phase 1 has ended.
#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct CreateFairLaunchLotteryBitmap<'info> {
    #[account(seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref()], bump=fair_launch.bump, has_one=authority)]
    fair_launch: ProgramAccount<'info, FairLaunch>,
    #[account(init, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref(), LOTTERY.as_bytes()],  payer=payer, bump=bump, space= FAIR_LAUNCH_LOTTERY_SIZE + (fair_launch.number_tickets_sold.checked_div(8).ok_or(ErrorCode::NumericalOverflowError)? as usize) + 1)]
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
    #[account(init, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref(), buyer.key.as_ref()],  payer=payer, bump=bump, space=FAIR_LAUNCH_TICKET_SIZE)]
    fair_launch_ticket: ProgramAccount<'info, FairLaunchTicket>,
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref()], bump=fair_launch.bump, has_one=treasury)]
    fair_launch: ProgramAccount<'info, FairLaunch>,
    #[account(mut)]
    treasury: AccountInfo<'info>,
    #[account(mut, signer, constraint= buyer.data_is_empty() && buyer.lamports() > 0)]
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
    #[account(init, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref(), &fair_launch_ticket.seq.to_le_bytes()],  payer=payer, bump=bump, space=FAIR_LAUNCH_TICKET_SEQ_SIZE)]
    fair_launch_ticket_seq_lookup: ProgramAccount<'info, FairLaunchTicketSeqLookup>,
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref()], bump=fair_launch.bump)]
    fair_launch: ProgramAccount<'info, FairLaunch>,
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref(), fair_launch_ticket.buyer.as_ref()], bump=fair_launch_ticket.bump, has_one=fair_launch)]
    fair_launch_ticket: ProgramAccount<'info, FairLaunchTicket>,
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
pub struct AdjustTicket<'info> {
    #[account(mut)]
    fair_launch_ticket: ProgramAccount<'info, FairLaunchTicket>,
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref()], bump=fair_launch.bump)]
    fair_launch: ProgramAccount<'info, FairLaunch>,
    fair_launch_lottery_bitmap: AccountInfo<'info>,
    #[account(mut)]
    treasury: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    system_program: AccountInfo<'info>,
    clock: Sysvar<'info, Clock>,
    // Remaining REQUIRED account put in remaining due to anchor cli bug:
    // [writable/signer ONLY in phase 1/2] buyer
    // Remaining accounts in this order if using spl tokens for payment:
    // [Writable/optional] treasury mint
    // [Writable/optional] buyer token account (must be ata)
    // [optional] transfer authority to transfer amount from buyer token account ( may be 0 if transferring money out )
    // [optional] token program
}

#[derive(Accounts)]
pub struct PunchTicket<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref(), fair_launch_ticket.buyer.as_ref()], bump=fair_launch_ticket.bump, has_one=fair_launch)]
    fair_launch_ticket: ProgramAccount<'info, FairLaunchTicket>,
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref()], bump=fair_launch.bump, has_one=token_mint)]
    fair_launch: ProgramAccount<'info, FairLaunch>,
    #[account(seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref(), LOTTERY.as_bytes()], bump=fair_launch_lottery_bitmap.bump)]
    fair_launch_lottery_bitmap: ProgramAccount<'info, FairLaunchLotteryBitmap>,
    #[account(mut, signer)]
    payer: AccountInfo<'info>,
    #[account(mut)]
    buyer_token_account: AccountInfo<'info>,
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.authority.as_ref(), MINT.as_bytes(), fair_launch.data.uuid.as_bytes()], bump=fair_launch.token_mint_bump)]
    token_mint: AccountInfo<'info>,
    #[account(address = spl_token::id())]
    token_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct WithdrawFunds<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref()], bump=fair_launch.bump, has_one=authority, has_one=treasury)]
    fair_launch: ProgramAccount<'info, FairLaunch>,
    #[account(mut)]
    treasury: AccountInfo<'info>,
    #[account(signer, mut)]
    authority: AccountInfo<'info>,
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.authority.as_ref(), MINT.as_bytes(), fair_launch.data.uuid.as_bytes()], bump=fair_launch.token_mint_bump)]
    token_mint: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    system_program: AccountInfo<'info>,
    // Remaining accounts in this order if using spl tokens for payment:
    // [Writable/optional] treasury mint
    // [Writable/optional] buyer token account (must be ata)
    // [optional] token program
}

#[derive(Accounts)]
pub struct ReceiveRefund<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref()], bump=fair_launch.bump, has_one=treasury)]
    fair_launch: ProgramAccount<'info, FairLaunch>,
    #[account(mut)]
    treasury: AccountInfo<'info>,
    #[account(mut)]
    buyer: AccountInfo<'info>,
    #[account(mut)]
    buyer_token_account: AccountInfo<'info>,
    #[account(signer)]
    transfer_authority: AccountInfo<'info>,
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.authority.as_ref(), MINT.as_bytes(), fair_launch.data.uuid.as_bytes()], bump=fair_launch.token_mint_bump)]
    token_mint: AccountInfo<'info>,
    #[account(address = spl_token::id())]
    token_program: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    system_program: AccountInfo<'info>,
    clock: Sysvar<'info, Clock>,
    // Remaining accounts in this order if using spl tokens for payment:
    // [Writable/optional] treasury mint
    // [Writable/optional] buyer payment token account (must be ata)
}

#[derive(Accounts)]
pub struct SetTokenMetadata<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref()], bump=fair_launch.bump, has_one=authority, has_one=token_mint)]
    fair_launch: ProgramAccount<'info, FairLaunch>,
    #[account(mut, signer)]
    authority: AccountInfo<'info>,
    #[account(mut, signer)]
    payer: AccountInfo<'info>,
    // With the following accounts we aren't using anchor macros because they are CPI'd
    // through to token-metadata which will do all the validations we need on them.
    #[account(mut)]
    metadata: AccountInfo<'info>,
    #[account(mut)]
    token_mint: AccountInfo<'info>,
    #[account(address = metaplex_token_metadata::id())]
    token_metadata_program: AccountInfo<'info>,
    #[account(address = spl_token::id())]
    token_program: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    system_program: AccountInfo<'info>,
    rent: Sysvar<'info, Rent>,
    clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
#[instruction(participation_mint_bump: u8, participation_token_bump: u8)]
pub struct SetParticipationNFT<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref()], bump=fair_launch.bump, has_one=authority)]
    fair_launch: ProgramAccount<'info, FairLaunch>,
    #[account(signer)]
    authority: AccountInfo<'info>,
    #[account(mut, signer)]
    payer: AccountInfo<'info>,
    #[account(init, seeds=[PREFIX.as_bytes(), authority.key.as_ref(), MINT.as_bytes(), fair_launch.data.uuid.as_bytes(), PARTICIPATION.as_bytes()], mint::authority=fair_launch, mint::decimals=0, payer=payer, bump=participation_mint_bump)]
    participation_mint: CpiAccount<'info, Mint>,
    #[account(mut, seeds=[PREFIX.as_bytes(), authority.key.as_ref(), MINT.as_bytes(), fair_launch.data.uuid.as_bytes(), PARTICIPATION.as_bytes(), ACCOUNT.as_bytes()], bump=participation_token_bump)]
    participation_token_account: AccountInfo<'info>,
    // With the following accounts we aren't using anchor macros because they are CPI'd
    // through to token-metadata which will do all the validations we need on them.
    #[account(mut)]
    metadata: AccountInfo<'info>,
    #[account(mut)]
    master_edition: AccountInfo<'info>,
    #[account(address = metaplex_token_metadata::id())]
    token_metadata_program: AccountInfo<'info>,
    #[account(address = spl_token::id())]
    token_program: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    system_program: AccountInfo<'info>,
    rent: Sysvar<'info, Rent>,
    clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
pub struct UpdateParticipationNFT<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref()], bump=fair_launch.bump, has_one=authority)]
    fair_launch: ProgramAccount<'info, FairLaunch>,
    #[account(signer)]
    authority: AccountInfo<'info>,
    // With the following accounts we aren't using anchor macros because they are CPI'd
    // through to token-metadata which will do all the validations we need on them.
    #[account(mut)]
    metadata: AccountInfo<'info>,
    #[account(address = metaplex_token_metadata::id())]
    token_metadata_program: AccountInfo<'info>,
    #[account(address = spl_token::id())]
    token_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct MintParticipationNFT<'info> {
    #[account(seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref()], bump=fair_launch.bump)]
    fair_launch: ProgramAccount<'info, FairLaunch>,
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref(), fair_launch_ticket.buyer.as_ref()], bump=fair_launch_ticket.bump, has_one=fair_launch, has_one=buyer)]
    fair_launch_ticket: ProgramAccount<'info, FairLaunchTicket>,
    #[account(mut, signer)]
    payer: AccountInfo<'info>,
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.authority.as_ref(), MINT.as_bytes(), fair_launch.data.uuid.as_bytes(), PARTICIPATION.as_bytes()], bump=fair_launch.participation_mint_bump)]
    participation_mint: CpiAccount<'info, Mint>,
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.authority.as_ref(), MINT.as_bytes(), fair_launch.data.uuid.as_bytes(), PARTICIPATION.as_bytes(), ACCOUNT.as_bytes()], bump=fair_launch.participation_token_bump)]
    participation_token_account: AccountInfo<'info>,
    buyer: AccountInfo<'info>,
    buyer_nft_token_account: AccountInfo<'info>,
    // With the following accounts we aren't using anchor macros because they are CPI'd
    // through to token-metadata which will do all the validations we need on them.
    // This will fail if there is more than one token in existence and we force you to provide
    // an ata that must belong to buyer and we check that it has the token from this new_mint.
    #[account(mut)]
    new_metadata: AccountInfo<'info>,
    #[account(mut)]
    new_edition: AccountInfo<'info>,
    #[account(mut)]
    new_mint: AccountInfo<'info>,
    #[account(signer)]
    new_mint_authority: AccountInfo<'info>,
    #[account(mut)]
    metadata: AccountInfo<'info>,
    #[account(mut)]
    master_edition: AccountInfo<'info>,
    #[account(mut)]
    edition_mark_pda: AccountInfo<'info>,
    #[account(address = metaplex_token_metadata::id())]
    token_metadata_program: AccountInfo<'info>,
    #[account(address = spl_token::id())]
    token_program: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    system_program: AccountInfo<'info>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct MintTokens<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref()], bump=fair_launch.bump, has_one=authority, has_one=token_mint)]
    fair_launch: ProgramAccount<'info, FairLaunch>,
    #[account(signer)]
    authority: AccountInfo<'info>,
    #[account(mut)]
    token_account: CpiAccount<'info, TokenAccount>,
    #[account(address = spl_token::id())]
    token_program: AccountInfo<'info>,
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.authority.as_ref(), MINT.as_bytes(), fair_launch.data.uuid.as_bytes()], bump=fair_launch.token_mint_bump)]
    token_mint: CpiAccount<'info, Mint>,
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
8 + // lottery duration
8 + // tick size
8 + // number of tokens
8 + // fee
1 + // anti rug option
2 + // anti rug bp
8 + // anti rug token count
8 + // self destruct date
8 + // number of tickets unseq'ed
8 + // number of tickets sold
8 + // number of tickets dropped
8 + // number of tickets punched 
8 + // number of tokens burned for refunds
8 + // number of tokens preminted
1 + // phase three started
9 + // treasury snapshot
8 + // current_eligible_holders
8 + // current median,
4 + // u32 representing number of amounts in vec so far
1 + // participation modulo (added later)
1 + // participation_mint_bump (added later)
1 + // participation_token_bump (added later)
33 + // participation_mint (added later)
65; // padding

pub const FAIR_LAUNCH_TICKET_SIZE: usize = 8 + // discriminator
32 + // fair launch reverse lookup
32 + // buyer
8 + // amount paid in so far
1 + // state
1 + // bump
8 + // seq
1 + // gotten participation
49; //padding

pub const FAIR_LAUNCH_TICKET_SEQ_SIZE: usize = 8 + //discriminator
32 + // fair launch ticket reverse lookup
32 + // buyer,
8 + //seq
1 + // bump
50; // padding;

// Note both TokenMetadata/Creator copied over from token metadata due to anchor needing them
// in file to put into IDL
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct Creator {
    pub address: Pubkey,
    pub verified: bool,
    // In percentages, NOT basis points ;) Watch out!
    pub share: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct TokenMetadata {
    /// The name of the asset
    pub name: String,
    /// The symbol for the asset
    pub symbol: String,
    /// URI pointing to JSON representing the asset
    pub uri: String,
    /// Royalty basis points that goes to creators in secondary sales (0-10000)
    pub seller_fee_basis_points: u16,
    /// Array of creators, optional
    pub creators: Option<Vec<Creator>>,
    pub is_mutable: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct AntiRugSetting {
    /// basis points kept in the treasury until conditions are met
    pub reserve_bp: u16,
    /// The supply of the fair launch mint must be below this amount
    /// to unlock the reserve
    pub token_requirement: u64,
    /// if you don't meet your promise by this date, pro-rated refunds are allowed
    pub self_destruct_date: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct FairLaunchData {
    pub uuid: String,
    pub price_range_start: u64,
    pub price_range_end: u64,
    pub phase_one_start: i64,
    pub phase_one_end: i64,
    pub phase_two_end: i64,
    pub lottery_duration: i64,
    pub tick_size: u64,
    pub number_of_tokens: u64,
    pub fee: u64,
    pub anti_rug_setting: Option<AntiRugSetting>,
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
    /// Tickets that are missing a corresponding seq pda. Crank it.
    pub number_tickets_un_seqed: u64,
    /// If I have to explain this, you're an idiot.
    pub number_tickets_sold: u64,
    /// People that withdrew in phase 2 because they dislike you.
    pub number_tickets_dropped: u64,
    /// People who won the lottery and punched ticket in exchange for token. Good job!
    pub number_tickets_punched: u64,
    /// if you go past refund date, here is how many people lost faith in you.
    pub number_tokens_burned_for_refunds: u64,
    /// here is how many tokens you preminted before people had access. SHAME. *bell*
    pub number_tokens_preminted: u64,
    /// Yes.
    pub phase_three_started: bool,
    /// Snapshot of treasury taken on first withdrawal.
    pub treasury_snapshot: Option<u64>,
    pub current_eligible_holders: u64,
    pub current_median: u64,
    pub counts_at_each_tick: Vec<u64>,
    pub participation_modulo: u8,
    pub participation_mint_bump: u8,
    pub participation_token_bump: u8,
    pub participation_mint: Option<Pubkey>,
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
    pub gotten_participation: bool,
}

#[account]
pub struct FairLaunchTicketSeqLookup {
    pub fair_launch_ticket: Pubkey,
    pub buyer: Pubkey,
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
    CannotSetFairLaunchLotteryUntilAllTicketsAreSequenced,
    #[msg("During phase three, since you did not pay up to the median, you can only withdraw your funds")]
    CanOnlySubmitZeroDuringPhaseThree,
    #[msg("During phase three, since you paid above median, you can only withdraw the difference")]
    CanOnlySubmitDifferenceDuringPhaseThree,
    #[msg("You did not win the lottery, therefore you can only withdraw your funds")]
    DidNotWinLotteryCanOnlyWithdraw,
    #[msg("This account should have no delegates")]
    AccountShouldHaveNoDelegates,
    #[msg("Token minting failed")]
    TokenMintToFailed,
    #[msg("During phase two and one buyer must be signer")]
    DuringPhaseTwoAndOneBuyerMustBeSigner,
    #[msg("Invalid fair launch ticket state for this operation")]
    InvalidFairLaunchTicketState,
    #[msg("Cannot cash out until all refunds and punches (permissionless calls) have been processed. Use the CLI.")]
    CannotCashOutUntilAllRefundsAndPunchesHaveBeenProcessed,
    #[msg("Cannot cash out until phase three")]
    CannotCashOutUntilPhaseThree,
    #[msg("Cannot update fair launch variables once it is in progress")]
    CannotUpdateFairLaunchDataOnceInProgress,
    #[msg("Not able to adjust tickets between phase two and three")]
    PhaseTwoEnded,
    #[msg("Cannot punch ticket when having paid less than median.")]
    CannotPunchTicketWhenHavingPaidLessThanMedian,
    #[msg("You have already withdrawn your seed capital alotment from the treasury.")]
    AlreadyWithdrawnCapitalAlotment,
    #[msg("No anti rug settings on this fair launch. Should've checked twice.")]
    NoAntiRugSetting,
    #[msg("Self destruct date has not passed yet, so you are not eligible for a refund.")]
    SelfDestructNotPassed,
    #[msg("Token burn failed")]
    TokenBurnFailed,
    #[msg("No treasury snapshot present")]
    NoTreasurySnapshot,
    #[msg("Cannot refund until all existing tickets have been dropped or punched")]
    CannotRefundUntilAllTicketsHaveBeenPunchedOrDropped,
    #[msg("Cannot refund until phase three")]
    CannotRefundUntilPhaseThree,
    #[msg("Invalid reserve bp")]
    InvalidReserveBp,
    #[msg("Anti Rug Token Requirement must be less than or equal to number of tokens being sold")]
    InvalidAntiRugTokenRequirement,
    #[msg("Cannot punch ticket until phase three")]
    CannotPunchTicketUntilPhaseThree,
    #[msg("Cannot punch ticket until you have refunded the difference between your given price and the median.")]
    CannotPunchTicketUntilEqualized,
    #[msg("Invalid lottery duration")]
    InvalidLotteryDuration,
    #[msg("Phase two already started")]
    PhaseThreeAlreadyStarted,
    #[msg("Phase two hasnt ended yet")]
    PhaseTwoHasntEndedYet,
    #[msg("Lottery duration hasnt ended yet")]
    LotteryDurationHasntEndedYet,
    #[msg("Fair launch ticket and fair launch key mismatch")]
    FairLaunchMismatch,
    #[msg("Participation Token Account already exists")]
    ParticipationTokenAccountAlreadyExists,
    #[msg("Invalid participation modulo")]
    InvalidParticipationModulo,
    #[msg("Already got participation")]
    AlreadyMintedParticipation,
    #[msg("Not eligible for participation")]
    NotEligibleForParticipation,
    #[msg("The mint on this account does not match the participation nft mint")]
    ParticipationMintMismatch,
    #[msg("Account owner should be buyer")]
    AccountOwnerShouldBeBuyer,
    #[msg("Account owner should be fair launch authority")]
    AccountOwnerShouldBeAuthority,
    #[msg("Token mint mismatch")]
    TokenMintMismatch,
    #[msg("Cannot mint more tokens than are allowed by the fair launch")]
    CannotMintMoreTokensThanTotal,
    #[msg("Due to concerns that you might mint, burn, then mint again and mess up the counter, you can only mint once before the FLP")]
    CanOnlyPremintOnce,
    #[msg("Once phase three has begun, no more FLP tokens can be minted until all ticket holders have been given tokens")]
    CannotMintTokensUntilAllCashedOut,
}
