//! Request card to redeem instruction processing

use crate::{
    error::NFTPacksError,
    math::SafeMath,
    state::{PackSet, ProvingProcess},
    utils::*,
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    clock::Clock,
    entrypoint::ProgramResult,
    program_pack::Pack,
    pubkey::Pubkey,
    sysvar::Sysvar,
};

/// Process ClaimPack instruction
pub fn request_card_for_redeem(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let pack_set_account = next_account_info(account_info_iter)?;
    let proving_process_account = next_account_info(account_info_iter)?;
    let user_wallet_account = next_account_info(account_info_iter)?;
    let randomness_oracle_account = next_account_info(account_info_iter)?;
    let clock_info = next_account_info(account_info_iter)?;
    let clock = Clock::from_account_info(clock_info)?;

    // Validate owners
    assert_owned_by(randomness_oracle_account, &randomness_oracle_program::id())?;
    assert_owned_by(pack_set_account, program_id)?;

    assert_signer(&user_wallet_account)?;

    let pack_set = PackSet::unpack(&pack_set_account.data.borrow())?;
    let mut proving_process = ProvingProcess::unpack(&proving_process_account.data.borrow_mut())?;

    assert_account_key(pack_set_account, &proving_process.pack_set)?;
    assert_account_key(user_wallet_account, &proving_process.user_wallet)?;

    // Check if user have enough proves
    if pack_set.pack_vouchers != proving_process.proved_vouchers {
        return Err(NFTPacksError::ProvedVouchersMismatchPackVouchers.into());
    }

    pack_set.assert_activated()?;

    // check if user already got index card
    if proving_process.next_card_to_redeem != 0 {
        return Err(NFTPacksError::AlreadySetNextCardToRedeem.into());
    }

    let current_timestamp = clock.unix_timestamp as u64;

    if current_timestamp < pack_set.redeem_start_date {
        return Err(NFTPacksError::WrongRedeemDate.into());
    }

    if let Some(redeem_end_date) = pack_set.redeem_end_date {
        if current_timestamp > redeem_end_date {
            return Err(NFTPacksError::WrongRedeemDate.into());
        }
    }

    if proving_process.cards_redeemed == pack_set.allowed_amount_to_redeem {
        return Err(NFTPacksError::UserRedeemedAllCards.into());
    }

    let random_value = get_random_oracle_value(randomness_oracle_account, &clock)?;

    let min: u32 = (1 as u32).error_add(u16::MAX as u32)?;
    // increment pack cards to include max index
    let max: u32 = ((pack_set.pack_cards.error_add(1)?) as u32).error_add(u16::MAX as u32)?;

    let next_card_to_redeem: u32 = ((random_value as u32)
        .error_mul(max.error_sub(min)?)?
        .error_add(min)?)
    .error_div(u16::MAX as u32)?;

    proving_process.next_card_to_redeem = next_card_to_redeem;

    // Update state
    ProvingProcess::pack(proving_process, *proving_process_account.data.borrow_mut())?;

    Ok(())
}
