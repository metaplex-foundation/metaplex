use crate::ErrorCode;
use anchor_lang::{
    prelude::*,
    solana_program::{
        program::{invoke, invoke_signed},
        program_memory::sol_memcmp,
        program_pack::{IsInitialized, Pack},
        pubkey::PUBKEY_BYTES,
        system_instruction,
    },
};
use anchor_spl::token::Token;
use arrayref::array_ref;
use mpl_token_metadata::state::Metadata;
use spl_associated_token_account::get_associated_token_address;
use spl_token::{instruction::initialize_account2, state::Account};
use std::{convert::TryInto, slice::Iter};

pub fn assert_is_ata(ata: &AccountInfo, wallet: &Pubkey, mint: &Pubkey) -> Result<Account> {
    assert_owned_by(ata, &spl_token::id())?;
    let ata_account: Account = assert_initialized(ata)?;
    assert_keys_equal(ata_account.owner, *wallet)?;
    assert_keys_equal(ata_account.mint, *mint)?;
    assert_keys_equal(get_associated_token_address(wallet, mint), *ata.key)?;
    Ok(ata_account)
}

pub fn make_ata<'a>(
    ata: AccountInfo<'a>,
    wallet: AccountInfo<'a>,
    mint: AccountInfo<'a>,
    fee_payer: AccountInfo<'a>,
    ata_program: AccountInfo<'a>,
    token_program: AccountInfo<'a>,
    system_program: AccountInfo<'a>,
    rent: AccountInfo<'a>,
    fee_payer_seeds: &[&[u8]],
) -> Result<()> {
    let seeds: &[&[&[u8]]];
    let as_arr = [fee_payer_seeds];

    if fee_payer_seeds.len() > 0 {
        seeds = &as_arr;
    } else {
        seeds = &[];
    }

    invoke_signed(
        &spl_associated_token_account::create_associated_token_account(
            &fee_payer.key,
            &wallet.key,
            &mint.key,
        ),
        &[
            ata,
            wallet,
            mint,
            fee_payer,
            ata_program,
            system_program,
            rent,
            token_program,
        ],
        seeds,
    )?;

    Ok(())
}

pub fn assert_metadata_valid<'a>(
    metadata: &UncheckedAccount,
    edition: Option<&UncheckedAccount>,
    mint: &Pubkey,
) -> Result<()> {
    assert_derivation(
        &mpl_token_metadata::id(),
        &metadata.to_account_info(),
        &[
            mpl_token_metadata::state::PREFIX.as_bytes(),
            mpl_token_metadata::id().as_ref(),
            mint.as_ref(),
        ],
    )?;
    if metadata.data_is_empty() {
        return Err(ErrorCode::MetadataDoesntExist.into());
    }

    if let Some(ed) = edition {
        assert_derivation(
            &mpl_token_metadata::id(),
            &ed.to_account_info(),
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                mint.as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
            ],
        )?;
        if ed.data_is_empty() {
            return Err(ErrorCode::EditionDoesntExist.into());
        }
    }

    Ok(())
}

pub fn assert_keys_equal(key1: Pubkey, key2: Pubkey) -> Result<()> {
    if sol_memcmp(key1.as_ref(), key2.as_ref(), PUBKEY_BYTES) != 0 {
        return err!(ErrorCode::PublicKeyMismatch);
    } else {
        Ok(())
    }
}

pub fn assert_initialized<T: Pack + IsInitialized>(account_info: &AccountInfo) -> Result<T> {
    let account: T = T::unpack_unchecked(&account_info.data.borrow())?;
    if !account.is_initialized() {
        Err(ErrorCode::UninitializedAccount.into())
    } else {
        Ok(account)
    }
}

pub fn assert_owned_by(account: &AccountInfo, owner: &Pubkey) -> Result<()> {
    if account.owner != owner {
        Err(ErrorCode::IncorrectOwner.into())
    } else {
        Ok(())
    }
}

pub fn create_program_token_account_if_not_present<'a>(
    program_account: &UncheckedAccount<'a>,
    system_program: &Program<'a, System>,
    fee_payer: &AccountInfo<'a>,
    token_program: &Program<'a, Token>,
    mint: &AccountInfo<'a>,
    owner: &AccountInfo<'a>,
    rent: &Sysvar<'a, Rent>,
    signer_seeds: &[&[u8]],
    fee_seeds: &[&[u8]],
) -> Result<()> {
    assert_owned_by(mint, &token_program.key())?;

    if program_account.data_is_empty() {
        create_or_allocate_account_raw(
            *token_program.key,
            &program_account.to_account_info(),
            &rent.to_account_info(),
            &system_program,
            &fee_payer,
            spl_token::state::Account::LEN,
            fee_seeds,
            signer_seeds,
        )?;

        invoke_signed(
            &initialize_account2(
                &token_program.key,
                &program_account.key(),
                &mint.key(),
                &owner.key(),
            )
            .unwrap(),
            &[
                token_program.to_account_info(),
                mint.to_account_info(),
                program_account.to_account_info(),
                rent.to_account_info(),
                owner.clone(),
            ],
            &[&signer_seeds],
        )?;
    }

    Ok(())
}

#[allow(clippy::too_many_arguments)]
pub fn pay_creator_fees<'a>(
    remaining_accounts: &mut Iter<AccountInfo<'a>>,
    metadata_info: &AccountInfo<'a>,
    payment_account: &AccountInfo<'a>,
    payment_account_owner: &AccountInfo<'a>,
    fee_payer: &AccountInfo<'a>,
    treasury_mint: &AccountInfo<'a>,
    ata_program: &AccountInfo<'a>,
    token_program: &AccountInfo<'a>,
    system_program: &AccountInfo<'a>,
    rent: &AccountInfo<'a>,
    size: u64,
    is_native: bool,
) -> Result<()> {
    let metadata = Metadata::from_account_info(metadata_info)?;
    let total_fee = size as u128;
    match metadata.data.creators {
        Some(creators) => {
            for creator in creators {
                let pct = creator.share as u128;
                let creator_fee = pct
                    .checked_mul(total_fee)
                    .ok_or(ErrorCode::NumericalOverflow)?
                    .checked_div(100)
                    .ok_or(ErrorCode::NumericalOverflow)? as u64;
                let current_creator_info = next_account_info(remaining_accounts)?;
                assert_keys_equal(creator.address, *current_creator_info.key)?;
                if !is_native {
                    let current_creator_token_account_info = next_account_info(remaining_accounts)?;
                    if current_creator_token_account_info.data_is_empty() {
                        make_ata(
                            current_creator_token_account_info.to_account_info(),
                            current_creator_info.to_account_info(),
                            treasury_mint.to_account_info(),
                            fee_payer.to_account_info(),
                            ata_program.to_account_info(),
                            token_program.to_account_info(),
                            system_program.to_account_info(),
                            rent.to_account_info(),
                            &[],
                        )?;
                    }
                    assert_is_ata(
                        current_creator_token_account_info,
                        current_creator_info.key,
                        &treasury_mint.key(),
                    )?;
                    if creator_fee > 0 {
                        invoke(
                            &spl_token::instruction::transfer(
                                token_program.key,
                                &payment_account.key,
                                current_creator_token_account_info.key,
                                payment_account_owner.key,
                                &[],
                                creator_fee,
                            )?,
                            &[
                                payment_account.clone(),
                                current_creator_token_account_info.clone(),
                                token_program.clone(),
                                payment_account_owner.clone(),
                            ],
                        )?;
                    }
                } else if creator_fee > 0 {
                    invoke(
                        &system_instruction::transfer(
                            &payment_account.key,
                            current_creator_info.key,
                            creator_fee,
                        ),
                        &[
                            payment_account.clone(),
                            current_creator_info.clone(),
                            system_program.clone(),
                        ],
                    )?;
                }
            }
        }
        None => {
            msg!("No creators found in metadata");
        }
    }
    Ok(())
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
    new_acct_seeds: &[&[u8]],
) -> Result<()> {
    let rent = &Rent::from_account_info(rent_sysvar_info)?;
    let required_lamports = rent
        .minimum_balance(size)
        .max(1)
        .saturating_sub(new_account_info.lamports());

    if required_lamports > 0 {
        msg!("Transfer {} lamports to the new account", required_lamports);
        let seeds: &[&[&[u8]]];
        let as_arr = [signer_seeds];

        if signer_seeds.len() > 0 {
            seeds = &as_arr;
        } else {
            seeds = &[];
        }
        invoke_signed(
            &system_instruction::transfer(&payer_info.key, new_account_info.key, required_lamports),
            &[
                payer_info.clone(),
                new_account_info.clone(),
                system_program_info.clone(),
            ],
            seeds,
        )?;
    }

    let accounts = &[new_account_info.clone(), system_program_info.clone()];

    msg!("Allocate space for the account {}", new_account_info.key);
    invoke_signed(
        &system_instruction::allocate(new_account_info.key, size.try_into().unwrap()),
        accounts,
        &[&new_acct_seeds],
    )?;

    msg!("Assign the account to the owning program");
    invoke_signed(
        &system_instruction::assign(new_account_info.key, &program_id),
        accounts,
        &[&new_acct_seeds],
    )?;
    msg!("Completed assignation!");

    Ok(())
}

pub fn assert_derivation(program_id: &Pubkey, account: &AccountInfo, path: &[&[u8]]) -> Result<u8> {
    let (key, bump) = Pubkey::find_program_address(&path, program_id);
    if key != *account.key {
        return Err(ErrorCode::DerivedKeyInvalid.into());
    }
    Ok(bump)
}

/// cheap method to get supply and decimals of a mint without unpacking whole object
pub fn get_mint_details(account_info: &AccountInfo) -> Result<(u64, u8)> {
    // In token program, 36, 8, 1, 1 is the layout, where:
    // - the first 8 is supply u64.
    // - the next 1 is decimals u8.
    let data = account_info.try_borrow_data()?;
    let supply = array_ref![data, 36, 8];
    let decimals = array_ref![data, 44, 1];

    Ok((u64::from_le_bytes(*supply), u8::from_le_bytes(*decimals)))
}

#[cfg(test)]
mod tests {
    use crate::utils::get_mint_details;
    use anchor_lang::{
        prelude::{AccountInfo, Pubkey},
        solana_program::{program_option::COption, program_pack::Pack},
    };
    use spl_token::state::Mint;

    #[test]
    fn get_mint_details_smoke_test() {
        let key = Pubkey::new_unique();
        let mut lamports = 0;
        let mut data: Vec<u8> = Vec::with_capacity(Mint::LEN);
        data.resize(Mint::LEN, Default::default());
        let mint = Mint {
            mint_authority: COption::None,
            supply: 1000000000,
            decimals: 9,
            is_initialized: true,
            freeze_authority: COption::None,
        };
        spl_token::state::Mint::pack(mint, &mut data).unwrap();

        let owner = Pubkey::new_unique();

        let account_info = AccountInfo::new(
            &key,
            false,
            false,
            &mut lamports,
            &mut data,
            &owner,
            false,
            0,
        );

        let (supply, decimals) = get_mint_details(&account_info).unwrap();
        assert_eq!(mint.supply, supply);
        assert_eq!(mint.decimals, decimals);
    }
}
