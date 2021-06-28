use {
    crate::{
        error::MetadataError,
        processor::process_create_metadata_accounts,
        state::{
            get_reservation_list, Data, Edition, Key, MasterEdition, Metadata, EDITION,
            MAX_CREATOR_LIMIT, MAX_EDITION_LEN, MAX_NAME_LENGTH, MAX_SYMBOL_LENGTH, MAX_URI_LENGTH,
            PREFIX,
        },
    },
    borsh::{BorshDeserialize, BorshSerialize},
    solana_program::{
        account_info::AccountInfo,
        borsh::try_from_slice_unchecked,
        entrypoint::ProgramResult,
        msg,
        program::{invoke, invoke_signed},
        program_error::ProgramError,
        program_pack::{IsInitialized, Pack},
        pubkey::Pubkey,
        system_instruction,
        sysvar::{rent::Rent, Sysvar},
    },
    spl_token::{
        instruction::{set_authority, AuthorityType},
        state::Mint,
    },
    std::convert::TryInto,
};

pub fn assert_data_valid(
    data: &Data,
    update_authority: &Pubkey,
    existing_metadata: &Metadata,
    allow_direct_creator_writes: bool,
) -> ProgramResult {
    if data.name.len() > MAX_NAME_LENGTH {
        return Err(MetadataError::NameTooLong.into());
    }

    if data.symbol.len() > MAX_SYMBOL_LENGTH {
        return Err(MetadataError::SymbolTooLong.into());
    }

    if data.uri.len() > MAX_URI_LENGTH {
        return Err(MetadataError::UriTooLong.into());
    }

    if data.seller_fee_basis_points > 10000 {
        return Err(MetadataError::InvalidBasisPoints.into());
    }

    if data.creators.is_some() {
        if let Some(creators) = &data.creators {
            if creators.len() > MAX_CREATOR_LIMIT {
                return Err(MetadataError::CreatorsTooLong.into());
            }

            if creators.is_empty() {
                return Err(MetadataError::CreatorsMustBeAtleastOne.into());
            } else {
                let mut found = false;
                let mut total: u8 = 0;
                for i in 0..creators.len() {
                    let creator = &creators[i];
                    for j in (i + 1)..creators.len() {
                        if creators[j].address == creator.address {
                            return Err(MetadataError::DuplicateCreatorAddress.into());
                        }
                    }

                    total = total
                        .checked_add(creator.share)
                        .ok_or(MetadataError::NumericalOverflowError)?;

                    if creator.address == *update_authority {
                        found = true;
                    }

                    // Dont allow metadata owner to unilaterally say a creator verified...
                    // cross check with array, only let them say verified=true here if
                    // it already was true and in the array.
                    // Conversely, dont let a verified creator be wiped.
                    if creator.address != *update_authority && !allow_direct_creator_writes {
                        if let Some(existing_creators) = &existing_metadata.data.creators {
                            match existing_creators
                                .iter()
                                .find(|c| c.address == creator.address)
                            {
                                Some(existing_creator) => {
                                    if creator.verified && !existing_creator.verified {
                                        return Err(
                                            MetadataError::CannotVerifyAnotherCreator.into()
                                        );
                                    } else if !creator.verified && existing_creator.verified {
                                        return Err(
                                            MetadataError::CannotUnverifyAnotherCreator.into()
                                        );
                                    }
                                }
                                None => {
                                    if creator.verified {
                                        return Err(
                                            MetadataError::CannotVerifyAnotherCreator.into()
                                        );
                                    }
                                }
                            }
                        } else {
                            if creator.verified {
                                return Err(MetadataError::CannotVerifyAnotherCreator.into());
                            }
                        }
                    }
                }

                if !found && !allow_direct_creator_writes {
                    return Err(MetadataError::MustBeOneOfCreators.into());
                }
                if total != 100 {
                    return Err(MetadataError::ShareTotalMustBe100.into());
                }
            }
        }
    }

    Ok(())
}

/// assert initialized account
pub fn assert_initialized<T: Pack + IsInitialized>(
    account_info: &AccountInfo,
) -> Result<T, ProgramError> {
    let account: T = T::unpack_unchecked(&account_info.data.borrow())?;
    if !account.is_initialized() {
        Err(MetadataError::Uninitialized.into())
    } else {
        Ok(account)
    }
}

/// Create account almost from scratch, lifted from
/// https://github.com/solana-labs/solana-program-library/tree/master/associated-token-account/program/src/processor.rs#L51-L98
#[inline(always)]
pub fn create_or_allocate_account_raw<'a>(
    program_id: Pubkey,
    new_account_info: &AccountInfo<'a>,
    rent_sysvar_info: &AccountInfo<'a>,
    system_program_info: &AccountInfo<'a>,
    payer_info: &AccountInfo<'a>,
    size: usize,
    signer_seeds: &[&[u8]],
) -> ProgramResult {
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

    msg!("Allocate space for the account");
    invoke_signed(
        &system_instruction::allocate(new_account_info.key, size.try_into().unwrap()),
        &[new_account_info.clone(), system_program_info.clone()],
        &[&signer_seeds],
    )?;

    msg!("Assign the account to the owning program");
    invoke_signed(
        &system_instruction::assign(new_account_info.key, &program_id),
        &[new_account_info.clone(), system_program_info.clone()],
        &[&signer_seeds],
    )?;

    Ok(())
}

pub fn assert_update_authority_is_correct(
    metadata: &Metadata,
    update_authority_info: &AccountInfo,
) -> ProgramResult {
    if metadata.update_authority != *update_authority_info.key {
        return Err(MetadataError::UpdateAuthorityIncorrect.into());
    }

    if !update_authority_info.is_signer {
        return Err(MetadataError::UpdateAuthorityIsNotSigner.into());
    }

    Ok(())
}

pub fn assert_mint_authority_matches_mint(
    mint: &Mint,
    mint_authority_info: &AccountInfo,
) -> ProgramResult {
    match mint.mint_authority {
        solana_program::program_option::COption::None => {
            return Err(MetadataError::InvalidMintAuthority.into());
        }
        solana_program::program_option::COption::Some(key) => {
            if *mint_authority_info.key != key {
                return Err(MetadataError::InvalidMintAuthority.into());
            }
        }
    }

    if !mint_authority_info.is_signer {
        return Err(MetadataError::NotMintAuthority.into());
    }

    Ok(())
}

pub fn assert_supply_invariance(
    master_edition: &MasterEdition,
    printing_mint: &Mint,
    new_supply: u64,
) -> ProgramResult {
    // The supply of printed tokens and the supply of the master edition should, when added, never exceed max supply.
    // Every time a printed token is burned, master edition.supply goes up by 1.
    if let Some(max_supply) = master_edition.max_supply {
        let current_supply = printing_mint
            .supply
            .checked_add(master_edition.supply)
            .ok_or(MetadataError::NumericalOverflowError)?;
        let new_proposed_supply = current_supply
            .checked_add(new_supply)
            .ok_or(MetadataError::NumericalOverflowError)?;
        if new_proposed_supply > max_supply {
            return Err(MetadataError::PrintingWouldBreachMaximumSupply.into());
        }
    }

    Ok(())
}
pub fn transfer_mint_authority<'a>(
    edition_key: &Pubkey,
    edition_account_info: &AccountInfo<'a>,
    mint_info: &AccountInfo<'a>,
    mint_authority_info: &AccountInfo<'a>,
    token_program_info: &AccountInfo<'a>,
) -> ProgramResult {
    msg!("Setting mint authority");
    invoke_signed(
        &set_authority(
            token_program_info.key,
            mint_info.key,
            Some(edition_key),
            AuthorityType::MintTokens,
            mint_authority_info.key,
            &[&mint_authority_info.key],
        )
        .unwrap(),
        &[
            mint_authority_info.clone(),
            mint_info.clone(),
            token_program_info.clone(),
            edition_account_info.clone(),
        ],
        &[],
    )?;
    msg!("Setting freeze authority");
    invoke_signed(
        &set_authority(
            token_program_info.key,
            mint_info.key,
            Some(&edition_key),
            AuthorityType::FreezeAccount,
            mint_authority_info.key,
            &[&mint_authority_info.key],
        )
        .unwrap(),
        &[
            mint_authority_info.clone(),
            mint_info.clone(),
            token_program_info.clone(),
            edition_account_info.clone(),
        ],
        &[],
    )?;
    Ok(())
}

pub fn assert_rent_exempt(rent: &Rent, account_info: &AccountInfo) -> ProgramResult {
    if !rent.is_exempt(account_info.lamports(), account_info.data_len()) {
        Err(MetadataError::NotRentExempt.into())
    } else {
        Ok(())
    }
}

// Todo deprecate this for assert derivation
pub fn assert_edition_valid(
    program_id: &Pubkey,
    mint: &Pubkey,
    edition_account_info: &AccountInfo,
) -> ProgramResult {
    let edition_seeds = &[
        PREFIX.as_bytes(),
        program_id.as_ref(),
        &mint.as_ref(),
        EDITION.as_bytes(),
    ];
    let (edition_key, _) = Pubkey::find_program_address(edition_seeds, program_id);
    if edition_key != *edition_account_info.key {
        return Err(MetadataError::InvalidEditionKey.into());
    }

    Ok(())
}

#[allow(clippy::too_many_arguments)]
pub fn mint_limited_edition<'a>(
    program_id: &Pubkey,
    new_metadata_account_info: &AccountInfo<'a>,
    new_edition_account_info: &AccountInfo<'a>,
    master_edition_account_info: &AccountInfo<'a>,
    mint_info: &AccountInfo<'a>,
    mint_authority_info: &AccountInfo<'a>,
    payer_account_info: &AccountInfo<'a>,
    update_authority_info: &AccountInfo<'a>,
    master_metadata_account_info: &AccountInfo<'a>,
    token_program_account_info: &AccountInfo<'a>,
    system_account_info: &AccountInfo<'a>,
    rent_info: &AccountInfo<'a>,
    reservation_list_info: Option<&AccountInfo<'a>>,
) -> ProgramResult {
    let master_metadata = Metadata::from_account_info(master_metadata_account_info)?;
    let mut master_edition = MasterEdition::from_account_info(master_edition_account_info)?;
    let mint: Mint = assert_initialized(mint_info)?;

    assert_mint_authority_matches_mint(&mint, mint_authority_info)?;

    assert_edition_valid(
        program_id,
        &master_metadata.mint,
        master_edition_account_info,
    )?;

    let edition_seeds = &[
        PREFIX.as_bytes(),
        program_id.as_ref(),
        &mint_info.key.as_ref(),
        EDITION.as_bytes(),
    ];
    let (edition_key, bump_seed) = Pubkey::find_program_address(edition_seeds, program_id);
    if edition_key != *new_edition_account_info.key {
        return Err(MetadataError::InvalidEditionKey.into());
    }

    if reservation_list_info.is_none() {
        if let Some(max) = master_edition.max_supply {
            if master_edition.supply >= max {
                return Err(MetadataError::MaxEditionsMintedAlready.into());
            }
        }

        master_edition.supply += 1;
        master_edition.serialize(&mut *master_edition_account_info.data.borrow_mut())?;
    }

    if mint.supply != 1 {
        return Err(MetadataError::EditionsMustHaveExactlyOneToken.into());
    }

    // create the metadata the normal way...
    process_create_metadata_accounts(
        program_id,
        &[
            new_metadata_account_info.clone(),
            mint_info.clone(),
            mint_authority_info.clone(),
            payer_account_info.clone(),
            update_authority_info.clone(),
            system_account_info.clone(),
            rent_info.clone(),
        ],
        master_metadata.data,
        true,
        false,
    )?;

    let edition_authority_seeds = &[
        PREFIX.as_bytes(),
        program_id.as_ref(),
        &mint_info.key.as_ref(),
        EDITION.as_bytes(),
        &[bump_seed],
    ];

    create_or_allocate_account_raw(
        *program_id,
        new_edition_account_info,
        rent_info,
        system_account_info,
        payer_account_info,
        MAX_EDITION_LEN,
        edition_authority_seeds,
    )?;

    let mut new_edition = Edition::from_account_info(new_edition_account_info)?;
    new_edition.key = Key::EditionV1;
    new_edition.parent = *master_edition_account_info.key;

    new_edition.edition = match reservation_list_info {
        Some(account) => {
            let mut reservation_list = get_reservation_list(account)?;

            if let Some(supply_snapshot) = reservation_list.supply_snapshot() {
                let mut prev_total_offsets: u64 = 0;
                let mut offset: Option<u64> = None;
                let mut reservations = reservation_list.reservations();
                for i in 0..reservations.len() {
                    let mut reservation = &mut reservations[i];

                    if reservation.address == *mint_authority_info.key {
                        offset = Some(
                            prev_total_offsets
                                .checked_add(reservation.spots_remaining)
                                .ok_or(MetadataError::NumericalOverflowError)?,
                        );
                        // You get your editions in reverse order but who cares, saves a byte
                        reservation.spots_remaining = reservation
                            .spots_remaining
                            .checked_sub(1)
                            .ok_or(MetadataError::NumericalOverflowError)?;

                        reservation_list.set_reservations(reservations)?;
                        reservation_list.save(account)?;
                        break;
                    }

                    if reservation.address == solana_program::system_program::id() {
                        // This is an anchor point in the array...it means we reset our math to
                        // this offset because we may be missing information in between this point and
                        // the points before it.
                        prev_total_offsets = reservation.total_spots;
                    } else {
                        prev_total_offsets = prev_total_offsets
                            .checked_add(reservation.total_spots)
                            .ok_or(MetadataError::NumericalOverflowError)?;
                    }
                }

                match offset {
                    Some(val) => supply_snapshot
                        .checked_add(val)
                        .ok_or(MetadataError::NumericalOverflowError)?,
                    None => {
                        return Err(MetadataError::AddressNotInReservation.into());
                    }
                }
            } else {
                return Err(MetadataError::ReservationNotSet.into());
            }
        }
        None => master_edition.supply,
    };

    new_edition.serialize(&mut *new_edition_account_info.data.borrow_mut())?;

    // Now make sure this mint can never be used by anybody else.
    transfer_mint_authority(
        &edition_key,
        new_edition_account_info,
        mint_info,
        mint_authority_info,
        token_program_account_info,
    )?;

    Ok(())
}

pub fn spl_token_burn(params: TokenBurnParams<'_, '_>) -> ProgramResult {
    let TokenBurnParams {
        mint,
        source,
        authority,
        token_program,
        amount,
        authority_signer_seeds,
    } = params;
    let mut seeds: Vec<&[&[u8]]> = vec![];
    if let Some(seed) = authority_signer_seeds {
        seeds.push(seed);
    }
    let result = invoke_signed(
        &spl_token::instruction::burn(
            token_program.key,
            source.key,
            mint.key,
            authority.key,
            &[],
            amount,
        )?,
        &[source, mint, authority, token_program],
        seeds.as_slice(),
    );
    result.map_err(|_| MetadataError::TokenBurnFailed.into())
}

/// TokenBurnParams
pub struct TokenBurnParams<'a: 'b, 'b> {
    /// mint
    pub mint: AccountInfo<'a>,
    /// source
    pub source: AccountInfo<'a>,
    /// amount
    pub amount: u64,
    /// authority
    pub authority: AccountInfo<'a>,
    /// authority_signer_seeds
    pub authority_signer_seeds: Option<&'b [&'b [u8]]>,
    /// token_program
    pub token_program: AccountInfo<'a>,
}

pub fn spl_token_mint_to(params: TokenMintToParams<'_, '_>) -> ProgramResult {
    let TokenMintToParams {
        mint,
        destination,
        authority,
        token_program,
        amount,
        authority_signer_seeds,
    } = params;
    let mut seeds: Vec<&[&[u8]]> = vec![];
    if let Some(seed) = authority_signer_seeds {
        seeds.push(seed);
    }
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
        seeds.as_slice(),
    );
    result.map_err(|_| MetadataError::TokenMintToFailed.into())
}

/// TokenMintToParams
pub struct TokenMintToParams<'a: 'b, 'b> {
    /// mint
    pub mint: AccountInfo<'a>,
    /// destination
    pub destination: AccountInfo<'a>,
    /// amount
    pub amount: u64,
    /// authority
    pub authority: AccountInfo<'a>,
    /// authority_signer_seeds
    pub authority_signer_seeds: Option<&'b [&'b [u8]]>,
    /// token_program
    pub token_program: AccountInfo<'a>,
}

pub fn assert_derivation(
    program_id: &Pubkey,
    account: &AccountInfo,
    path: &[&[u8]],
) -> Result<u8, ProgramError> {
    let (key, bump) = Pubkey::find_program_address(&path, program_id);
    if key != *account.key {
        return Err(MetadataError::DerivedKeyInvalid.into());
    }
    Ok(bump)
}

pub fn assert_signer(account_info: &AccountInfo) -> ProgramResult {
    if !account_info.is_signer {
        Err(ProgramError::MissingRequiredSignature)
    } else {
        Ok(())
    }
}

pub fn assert_owned_by(account: &AccountInfo, owner: &Pubkey) -> ProgramResult {
    if account.owner != owner {
        Err(MetadataError::IncorrectOwner.into())
    } else {
        Ok(())
    }
}

pub fn assert_token_program_matches_package(token_program_info: &AccountInfo) -> ProgramResult {
    if *token_program_info.key != spl_token::id() {
        return Err(MetadataError::InvalidTokenProgram.into());
    }

    Ok(())
}

pub fn try_from_slice_checked<T: BorshDeserialize>(
    data: &[u8],
    data_type: Key,
    data_size: usize,
) -> Result<T, ProgramError> {
    if (data[0] != data_type as u8 && data[0] != Key::Uninitialized as u8)
        || data.len() != data_size
    {
        return Err(MetadataError::DataTypeMismatch.into());
    }

    let result: T = try_from_slice_unchecked(data)?;

    Ok(result)
}
