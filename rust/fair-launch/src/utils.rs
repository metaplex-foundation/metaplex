use {
    crate::{ErrorCode, FairLaunch, FairLaunchData, MAX_GRANULARITY},
    anchor_lang::{
        prelude::{
            msg, AccountInfo, ProgramAccount, ProgramError, ProgramResult, Pubkey, Rent,
            SolanaSysvar,
        },
        solana_program::{
            program::{invoke, invoke_signed},
            program_pack::{IsInitialized, Pack},
            system_instruction,
        },
    },
    std::convert::TryInto,
};

pub fn assert_initialized<T: Pack + IsInitialized>(
    account_info: &AccountInfo,
) -> Result<T, ProgramError> {
    let account: T = T::unpack_unchecked(&account_info.data.borrow())?;
    if !account.is_initialized() {
        Err(ErrorCode::Uninitialized.into())
    } else {
        Ok(account)
    }
}

pub fn assert_owned_by(account: &AccountInfo, owner: &Pubkey) -> ProgramResult {
    if account.owner != owner {
        Err(ErrorCode::IncorrectOwner.into())
    } else {
        Ok(())
    }
}
///TokenTransferParams
pub struct TokenTransferParams<'a: 'b, 'b> {
    /// source
    pub source: AccountInfo<'a>,
    /// destination
    pub destination: AccountInfo<'a>,
    /// amount
    pub amount: u64,
    /// authority
    pub authority: AccountInfo<'a>,
    /// authority_signer_seeds
    pub authority_signer_seeds: &'b [&'b [u8]],
    /// token_program
    pub token_program: AccountInfo<'a>,
}

#[inline(always)]
pub fn spl_token_transfer(params: TokenTransferParams<'_, '_>) -> ProgramResult {
    let TokenTransferParams {
        source,
        destination,
        authority,
        token_program,
        amount,
        authority_signer_seeds,
    } = params;

    let result = invoke_signed(
        &spl_token::instruction::transfer(
            token_program.key,
            source.key,
            destination.key,
            authority.key,
            &[],
            amount,
        )?,
        &[source, destination, authority, token_program],
        &[authority_signer_seeds],
    );

    result.map_err(|_| ErrorCode::TokenTransferFailed.into())
}

pub fn adjust_counts(
    fair_launch: &mut ProgramAccount<FairLaunch>,
    new_amount: u64,
    old_amount: Option<u64>,
) -> ProgramResult {
    let price_range_offset = fair_launch
        .data
        .price_range_start
        .checked_div(fair_launch.data.tick_size)
        .ok_or(ErrorCode::NumericalOverflowError)?;

    if let Some(old) = old_amount {
        if old >= fair_launch.data.price_range_start {
            let mut index = old
                .checked_div(fair_launch.data.tick_size)
                .ok_or(ErrorCode::NumericalOverflowError)?;
            index = index
                .checked_sub(price_range_offset)
                .ok_or(ErrorCode::NumericalOverflowError)?;
            let place = index as usize;
            fair_launch.counts_at_each_tick[place] = fair_launch.counts_at_each_tick[place]
                .checked_sub(1)
                .ok_or(ErrorCode::NumericalOverflowError)?;
        }
    }

    if new_amount >= fair_launch.data.price_range_start {
        let mut index = new_amount
            .checked_div(fair_launch.data.tick_size)
            .ok_or(ErrorCode::NumericalOverflowError)?;
        index = index
            .checked_sub(price_range_offset)
            .ok_or(ErrorCode::NumericalOverflowError)?;
        let place = index as usize;
        fair_launch.counts_at_each_tick[place] = fair_launch.counts_at_each_tick[place]
            .checked_add(1)
            .ok_or(ErrorCode::NumericalOverflowError)?;
    }

    let mut total_counts: u64 = 0;
    for n in &fair_launch.counts_at_each_tick {
        total_counts = total_counts
            .checked_add(*n)
            .ok_or(ErrorCode::NumericalOverflowError)?;
    }

    let median_location = total_counts
        .checked_div(2)
        .ok_or(ErrorCode::NumericalOverflowError)?;

    let mut counter: u64 = 0;
    let mut ticks: u64 = 0;
    let mut last_seen_tick_value_with_positive_counts: u64 = 0;
    for n in &fair_launch.counts_at_each_tick {
        counter = counter
            .checked_add(*n)
            .ok_or(ErrorCode::NumericalOverflowError)?;
        if counter > median_location {
            if let Some(val) = median_location.checked_rem(2) {
                if val == 0 {
                    let half_way = ticks
                        .checked_sub(last_seen_tick_value_with_positive_counts)
                        .ok_or(ErrorCode::NumericalOverflowError)?;
                    ticks = half_way
                        .checked_div(2)
                        .ok_or(ErrorCode::NumericalOverflowError)?;
                    ticks = last_seen_tick_value_with_positive_counts
                        .checked_add(ticks)
                        .ok_or(ErrorCode::NumericalOverflowError)?;
                }
            }
            break;
        }
        if n > &0 {
            last_seen_tick_value_with_positive_counts = ticks;
        }
        ticks = ticks
            .checked_add(fair_launch.data.tick_size)
            .ok_or(ErrorCode::NumericalOverflowError)?;
    }

    fair_launch.current_median = ticks
        .checked_add(fair_launch.data.price_range_start)
        .ok_or(ErrorCode::NumericalOverflowError)?;

    Ok(())
}

pub fn get_mask_and_index_for_seq(seq: u64) -> Result<(u8, usize), ProgramError> {
    let my_position_in_index = seq
        .checked_div(8)
        .ok_or(ErrorCode::NumericalOverflowError)?;
    let my_position_from_right = 7 - seq
        .checked_div(8)
        .ok_or(ErrorCode::NumericalOverflowError)?;
    let mask = u8::pow(2, my_position_from_right as u32);
    Ok((mask, my_position_in_index as usize))
}

pub fn assert_data_valid(data: &FairLaunchData) -> ProgramResult {
    if data.phase_one_end < data.phase_one_start {
        return Err(ErrorCode::TimestampsDontLineUp.into());
    }

    if data.phase_two_end < data.phase_one_end {
        return Err(ErrorCode::TimestampsDontLineUp.into());
    }

    if data.uuid.len() != 6 {
        return Err(ErrorCode::UuidMustBeExactly6Length.into());
    }

    if data.tick_size == 0 {
        return Err(ErrorCode::TickSizeTooSmall.into());
    }

    if data.number_of_tokens == 0 {
        return Err(ErrorCode::CannotGiveZeroTokens.into());
    }

    if data.price_range_end <= data.price_range_start {
        return Err(ErrorCode::InvalidPriceRanges.into());
    }

    let difference = data
        .price_range_end
        .checked_sub(data.price_range_start)
        .ok_or(ErrorCode::NumericalOverflowError)?;
    let possible_valid_user_prices = difference
        .checked_div(data.tick_size)
        .ok_or(ErrorCode::NumericalOverflowError)?;
    let remainder = difference
        .checked_rem(data.tick_size)
        .ok_or(ErrorCode::NumericalOverflowError)?;

    if remainder > 0 {
        return Err(ErrorCode::CannotUseTickSizeThatGivesRemainder.into());
    }

    if possible_valid_user_prices > MAX_GRANULARITY {
        return Err(ErrorCode::TooMuchGranularityInRange.into());
    }

    Ok(())
}

pub fn assert_valid_amount(data: &FairLaunchData, amount: u64) -> ProgramResult {
    if amount < data.price_range_start || amount > data.price_range_end {
        return Err(ErrorCode::InvalidPurchaseAmount.into());
    }

    if let Some(val) = amount.checked_rem(data.tick_size) {
        if val > 0 {
            return Err(ErrorCode::InvalidPurchaseAmount.into());
        }
    }

    Ok(())
}

pub fn assert_derivation(
    program_id: &Pubkey,
    account: &AccountInfo,
    path: &[&[u8]],
) -> Result<u8, ProgramError> {
    let (key, bump) = Pubkey::find_program_address(&path, program_id);
    if key != *account.key {
        return Err(ErrorCode::DerivedKeyInvalid.into());
    }
    Ok(bump)
}

/// Create account almost from scratch, lifted from
/// https://github.com/solana-labs/solana-program-library/blob/7d4873c61721aca25464d42cc5ef651a7923ca79/associated-token-account/program/src/processor.rs#L51-L98
#[inline(always)]
pub fn create_or_allocate_account_raw<'a>(
    program_id: Pubkey,
    new_account_info: &AccountInfo<'a>,
    rent_sysvar_info: &AccountInfo<'a>,
    system_program_info: &AccountInfo<'a>,
    payer_info: &AccountInfo<'a>,
    size: usize,
    signer_seeds: &[&[u8]],
) -> Result<(), ProgramError> {
    let rent = &Rent::from_account_info(rent_sysvar_info)?;
    let required_lamports = rent
        .minimum_balance(size)
        .max(1)
        .saturating_sub(new_account_info.lamports());

    if required_lamports > 0 {
        msg!("Transfer {} lamports to the new account", required_lamports);
        invoke(
            &system_instruction::transfer(&payer_info.key, new_account_info.key, required_lamports),
            &[
                payer_info.clone(),
                new_account_info.clone(),
                system_program_info.clone(),
            ],
        )?;
    }

    let accounts = &[new_account_info.clone(), system_program_info.clone()];

    msg!("Allocate space for the account");
    invoke_signed(
        &system_instruction::allocate(new_account_info.key, size.try_into().unwrap()),
        accounts,
        &[&signer_seeds],
    )?;

    msg!("Assign the account to the owning program");
    invoke_signed(
        &system_instruction::assign(new_account_info.key, &program_id),
        accounts,
        &[&signer_seeds],
    )?;
    msg!("Completed assignation!");

    Ok(())
}

pub fn spl_token_mint_to<'a: 'b, 'b>(
    mint: AccountInfo<'a>,
    destination: AccountInfo<'a>,
    amount: u64,
    authority: AccountInfo<'a>,
    authority_signer_seeds: &'b [&'b [u8]],
    token_program: AccountInfo<'a>,
) -> ProgramResult {
    let result = invoke_signed(
        &spl_token::instruction::mint_to(
            token_program.key,
            mint.key,
            destination.key,
            authority.key,
            &[],
            amount,
        )?,
        &[mint, destination, authority, token_program],
        &[authority_signer_seeds],
    );
    result.map_err(|_| ErrorCode::TokenMintToFailed.into())
}
