//! Request card to redeem instruction processing

use crate::{
    error::NFTPacksError,
    instruction::RequestCardToRedeemArgs,
    math::SafeMath,
    state::{InitProvingProcessParams, PackSet, PackVoucher, ProvingProcess},
    utils::*,
};
use metaplex::state::Store;
use metaplex_token_metadata::{
    state::{Edition, EDITION, PREFIX as EDITION_PREFIX},
    utils::assert_derivation,
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    clock::Clock,
    entrypoint::ProgramResult,
    program_error::ProgramError,
    program_option::COption,
    program_pack::Pack,
    pubkey::Pubkey,
    sysvar::{rent::Rent, Sysvar},
};
use spl_token::state::Account;

/// Process ClaimPack instruction
pub fn request_card_for_redeem(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    args: RequestCardToRedeemArgs,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let pack_set_account = next_account_info(account_info_iter)?;
    let store_account = next_account_info(account_info_iter)?;
    let edition_data_account = next_account_info(account_info_iter)?;
    let edition_mint_account = next_account_info(account_info_iter)?;
    let voucher_account = next_account_info(account_info_iter)?;
    let proving_process_account = next_account_info(account_info_iter)?;
    let user_wallet_account = next_account_info(account_info_iter)?;
    let user_token_account = next_account_info(account_info_iter)?;
    let randomness_oracle_account = next_account_info(account_info_iter)?;
    let clock_info = next_account_info(account_info_iter)?;
    let clock = Clock::from_account_info(clock_info)?;
    let rent_info = next_account_info(account_info_iter)?;
    let rent = &Rent::from_account_info(rent_info)?;

    // Validate owners
    assert_owned_by(randomness_oracle_account, &randomness_oracle_program::id())?;
    assert_owned_by(pack_set_account, program_id)?;
    assert_owned_by(store_account, &metaplex::id())?;
    assert_owned_by(edition_mint_account, &spl_token::id())?;
    assert_owned_by(user_token_account, &spl_token::id())?;
    assert_owned_by(voucher_account, program_id)?;

    let store = Store::from_account_info(store_account)?;

    assert_owned_by(edition_data_account, &store.token_metadata_program)?;
    assert_signer(&user_wallet_account)?;

    let pack_set = PackSet::unpack(&pack_set_account.data.borrow())?;
    assert_account_key(store_account, &pack_set.store)?;

    let proving_process_seeds = &[
        ProvingProcess::PREFIX.as_bytes(),
        pack_set_account.key.as_ref(),
        edition_mint_account.key.as_ref(),
    ];
    let bump_seed = assert_derivation(program_id, proving_process_account, proving_process_seeds)?;

    let mut proving_process = get_proving_process_data(
        program_id,
        proving_process_account,
        user_wallet_account,
        edition_mint_account,
        pack_set_account.key,
        proving_process_seeds,
        bump_seed,
        rent,
    )?;

    assert_derivation(
        program_id,
        voucher_account,
        &[
            PackVoucher::PREFIX.as_bytes(),
            pack_set_account.key.as_ref(),
            &args.index.to_le_bytes(),
        ],
    )?;

    let voucher = PackVoucher::unpack(&voucher_account.data.borrow_mut())?;

    assert_account_key(pack_set_account, &voucher.pack_set)?;

    assert_derivation(
        &store.token_metadata_program,
        edition_data_account,
        &[
            EDITION_PREFIX.as_bytes(),
            store.token_metadata_program.as_ref(),
            edition_mint_account.key.as_ref(),
            EDITION.as_bytes(),
        ],
    )?;

    let edition = Edition::from_account_info(edition_data_account)?;

    if edition.parent != voucher.master {
        return Err(NFTPacksError::WrongEdition.into());
    }

    let user_token_acc = Account::unpack(&user_token_account.data.borrow_mut())?;
    if user_token_acc.mint != *edition_mint_account.key {
        return Err(NFTPacksError::WrongEditionMint.into());
    }

    if user_token_acc.owner != *user_wallet_account.key {
        if let COption::Some(delegated) = user_token_acc.delegate {
            if user_token_acc.delegated_amount == 0 || delegated != *user_wallet_account.key {
                return Err(NFTPacksError::WrongVoucherOwner.into());
            }
        } else {
            return Err(NFTPacksError::WrongVoucherOwner.into());
        }
    }

    assert_account_key(pack_set_account, &proving_process.pack_set)?;
    assert_account_key(edition_mint_account, &proving_process.voucher_mint)?;

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

    // (rand * (max - min + min)) / u16::MAX
    let next_card_to_redeem: u32 = ((random_value as u32)
        .error_mul(max.error_sub(min)?)?
        .error_add(min)?)
    .error_div(u16::MAX as u32)?;

    proving_process.next_card_to_redeem = next_card_to_redeem;

    // Update state
    ProvingProcess::pack(proving_process, *proving_process_account.data.borrow_mut())?;

    Ok(())
}

/// Returns deserialized proving process data or initialized if it wasn't initialized yet
pub fn get_proving_process_data<'a>(
    program_id: &Pubkey,
    account_info: &AccountInfo<'a>,
    user_wallet: &AccountInfo<'a>,
    voucher_mint: &AccountInfo<'a>,
    pack_set: &Pubkey,
    signers_seeds: &[&[u8]],
    bump_seed: u8,
    rent: &Rent,
) -> Result<ProvingProcess, ProgramError> {
    let unpack = ProvingProcess::unpack(&account_info.data.borrow_mut());

    let proving_process = match unpack {
        Ok(data) => Ok(data),
        Err(_) => {
            create_account::<ProvingProcess>(
                program_id,
                user_wallet.clone(),
                account_info.clone(),
                &[&[signers_seeds, &[&[bump_seed]]].concat()],
                rent,
            )?;

            let mut data = ProvingProcess::unpack_unchecked(&account_info.data.borrow_mut())?;

            data.init(InitProvingProcessParams {
                voucher_mint: *voucher_mint.key,
                pack_set: *pack_set,
            });
            Ok(data)
        }
    };

    proving_process
}
