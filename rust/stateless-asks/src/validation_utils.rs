use {
    crate::{AcceptOffer, ErrorCode},
    anchor_lang::{
        prelude::*,
        solana_program::{
            program::{invoke, invoke_signed},
            program_pack::{IsInitialized, Pack},
            system_instruction,
        },
    },
    metaplex_token_metadata::state::Metadata,
    spl_associated_token_account::get_associated_token_address,
    spl_token,
    spl_token::state::Account,
};
pub fn assert_is_ata(ata: &AccountInfo, wallet: &Pubkey, mint: &Pubkey) -> ProgramResult {
    assert_owned_by(ata, &spl_token::id())?;
    let ata_account: Account = assert_initialized(ata)?;
    assert_keys_equal(ata_account.owner, *wallet)?;
    assert_keys_equal(get_associated_token_address(wallet, mint), *ata.key)?;
    Ok(())
}

pub fn assert_keys_equal(key1: Pubkey, key2: Pubkey) -> ProgramResult {
    if key1 != key2 {
        Err(ErrorCode::PublicKeyMismatch.into())
    } else {
        Ok(())
    }
}

pub fn assert_initialized<T: Pack + IsInitialized>(
    account_info: &AccountInfo,
) -> Result<T, ProgramError> {
    let account: T = T::unpack_unchecked(&account_info.data.borrow())?;
    if !account.is_initialized() {
        Err(ErrorCode::UninitializedAccount.into())
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

#[allow(clippy::too_many_arguments)]
pub fn pay_creator_fees<'a>(
    ctx: &Context<'_, '_, '_, 'a, AcceptOffer<'a>>,
    remaining_account_incr: &mut usize,
    metadata_info: &AccountInfo<'a>,
    src_account_info: &AccountInfo<'a>,
    src_authority_info: &AccountInfo<'a>,
    token_program_info: &AccountInfo<'a>,
    system_program_info: Option<&AccountInfo<'a>>,
    fee_mint: &AccountInfo<'a>,
    size: u64,
    is_native: bool,
    seeds: &[&[u8]],
) -> Result<u64, ProgramError> {
    let metadata = Metadata::from_account_info(metadata_info)?;
    let fees = metadata.data.seller_fee_basis_points;
    let total_fee = (fees as u64)
        .checked_mul(size)
        .ok_or(ErrorCode::NumericalOverflow)?
        .checked_div(10000)
        .ok_or(ErrorCode::NumericalOverflow)?;
    let mut remaining_fee = total_fee;
    let remaining_size = size
        .checked_sub(total_fee)
        .ok_or(ErrorCode::NumericalOverflow)?;
    match metadata.data.creators {
        Some(creators) => {
            for creator in creators {
                let pct = creator.share as u64;
                let creator_fee = pct
                    .checked_mul(total_fee)
                    .ok_or(ErrorCode::NumericalOverflow)?
                    .checked_div(100)
                    .ok_or(ErrorCode::NumericalOverflow)?;
                remaining_fee = remaining_fee
                    .checked_sub(creator_fee)
                    .ok_or(ErrorCode::NumericalOverflow)?;
                let current_creator_info = &ctx.remaining_accounts[*remaining_account_incr];
                *remaining_account_incr += 1;
                assert_keys_equal(creator.address, *current_creator_info.key)?;
                if !is_native {
                    let current_creator_token_account_info =
                        &ctx.remaining_accounts[*remaining_account_incr];
                    *remaining_account_incr += 1;
                    assert_is_ata(
                        current_creator_token_account_info,
                        current_creator_info.key,
                        fee_mint.key,
                    )?;
                    if creator_fee > 0 {
                        if seeds.is_empty() {
                            invoke(
                                &spl_token::instruction::transfer(
                                    token_program_info.key,
                                    src_account_info.key,
                                    current_creator_token_account_info.key,
                                    src_authority_info.key,
                                    &[],
                                    creator_fee,
                                )?,
                                &[
                                    src_account_info.clone(),
                                    current_creator_token_account_info.clone(),
                                    src_authority_info.clone(),
                                    token_program_info.clone(),
                                ],
                            )?;
                        } else {
                            invoke_signed(
                                &spl_token::instruction::transfer(
                                    token_program_info.key,
                                    src_account_info.key,
                                    current_creator_token_account_info.key,
                                    src_authority_info.key,
                                    &[],
                                    creator_fee,
                                )?,
                                &[
                                    src_account_info.clone(),
                                    current_creator_token_account_info.clone(),
                                    src_authority_info.clone(),
                                    token_program_info.clone(),
                                ],
                                &[seeds],
                            )?;
                        }
                    }
                } else if creator_fee > 0 {
                    if !seeds.is_empty() {
                        msg!("Maker cannot pay with native SOL");
                        return Err(ProgramError::InvalidAccountData);
                    }
                    match system_program_info {
                        Some(sys_program_info) => {
                            invoke(
                                &system_instruction::transfer(
                                    src_account_info.key,
                                    current_creator_info.key,
                                    creator_fee,
                                ),
                                &[
                                    src_account_info.clone(),
                                    current_creator_info.clone(),
                                    sys_program_info.clone(),
                                ],
                            )?;
                        }
                        None => {
                            msg!("Invalid System Program Info");
                            return Err(ProgramError::IncorrectProgramId);
                        }
                    }
                }
            }
        }
        None => {
            msg!("No creators found in metadata");
        }
    }
    // Any dust is returned to the party posting the NFT
    Ok(remaining_size
        .checked_add(remaining_fee)
        .ok_or(ErrorCode::NumericalOverflow)?)
}
