use {
    crate::{
        error::MetadataError,
        state::{
            get_reservation_list, Data, EditionMarker, Key, MasterEditionV1, Metadata, EDITION,
            EDITION_MARKER_BIT_SIZE, MAX_CREATOR_LIMIT, MAX_EDITION_LEN, MAX_EDITION_MARKER_SIZE,
            MAX_MASTER_EDITION_LEN, MAX_METADATA_LEN, MAX_NAME_LENGTH, MAX_SYMBOL_LENGTH,
            MAX_URI_LENGTH, PREFIX,
        },
    },
    arrayref::{array_mut_ref, array_ref, array_refs, mut_array_refs},
    borsh::{BorshDeserialize, BorshSerialize},
    solana_program::{
        account_info::AccountInfo,
        borsh::try_from_slice_unchecked,
        entrypoint::ProgramResult,
        msg,
        program::{invoke, invoke_signed},
        program_error::ProgramError,
        program_option::COption,
        program_pack::{IsInitialized, Pack},
        pubkey::Pubkey,
        system_instruction,
        sysvar::{rent::Rent, Sysvar},
    },
    spl_token::{
        instruction::{set_authority, AuthorityType},
        state::{Account, Mint},
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

/// Unpacks COption from a slice, taken from token program
fn unpack_coption_key(src: &[u8; 36]) -> Result<COption<Pubkey>, ProgramError> {
    let (tag, body) = array_refs![src, 4, 32];
    match *tag {
        [0, 0, 0, 0] => Ok(COption::None),
        [1, 0, 0, 0] => Ok(COption::Some(Pubkey::new_from_array(*body))),
        _ => Err(ProgramError::InvalidAccountData),
    }
}

/// Cheap method to just grab owner Pubkey from token account, instead of deserializing entire thing
pub fn get_owner_from_token_account(
    token_account_info: &AccountInfo,
) -> Result<Pubkey, ProgramError> {
    // TokeAccount layout:   mint(32), owner(32), ...
    let data = token_account_info.try_borrow_data()?;
    let owner_data = array_ref![data, 32, 32];
    Ok(Pubkey::new_from_array(*owner_data))
}

pub fn get_mint_authority(account_info: &AccountInfo) -> Result<COption<Pubkey>, ProgramError> {
    // In token program, 36, 8, 1, 1 is the layout, where the first 36 is mint_authority
    // so we start at 0.
    let data = account_info.try_borrow_data().unwrap();
    let authority_bytes = array_ref![data, 0, 36];

    Ok(unpack_coption_key(&authority_bytes)?)
}

pub fn get_mint_freeze_authority(
    account_info: &AccountInfo,
) -> Result<COption<Pubkey>, ProgramError> {
    let data = account_info.try_borrow_data().unwrap();
    let authority_bytes = array_ref![data, 36 + 8 + 1 + 1, 36];

    Ok(unpack_coption_key(&authority_bytes)?)
}

/// cheap method to just get supply off a mint without unpacking whole object
pub fn get_mint_supply(account_info: &AccountInfo) -> Result<u64, ProgramError> {
    // In token program, 36, 8, 1, 1 is the layout, where the first 8 is supply u64.
    // so we start at 36.
    let data = account_info.try_borrow_data().unwrap();
    let bytes = array_ref![data, 36, 8];

    Ok(u64::from_le_bytes(*bytes))
}

pub fn assert_mint_authority_matches_mint(
    mint_authority: &COption<Pubkey>,
    mint_authority_info: &AccountInfo,
) -> ProgramResult {
    match mint_authority {
        COption::None => {
            return Err(MetadataError::InvalidMintAuthority.into());
        }
        COption::Some(key) => {
            if mint_authority_info.key != key {
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
    master_edition: &MasterEditionV1,
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
    let accounts = &[
        mint_authority_info.clone(),
        mint_info.clone(),
        token_program_info.clone(),
        edition_account_info.clone(),
    ];
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
        accounts,
        &[],
    )?;
    msg!("Setting freeze authority");
    let freeze_authority = get_mint_freeze_authority(mint_info)?;
    if freeze_authority.is_some() {
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
            accounts,
            &[],
        )?;
        msg!("Finished setting freeze authority");
    } else {
        msg!("Skipping freeze authority because this mint has none")
    }

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

pub fn extract_edition_number_from_deprecated_reservation_list(
    account: &AccountInfo,
    mint_authority_info: &AccountInfo,
) -> Result<u64, ProgramError> {
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
            Some(val) => Ok(supply_snapshot
                .checked_add(val)
                .ok_or(MetadataError::NumericalOverflowError)?),
            None => {
                return Err(MetadataError::AddressNotInReservation.into());
            }
        }
    } else {
        return Err(MetadataError::ReservationNotSet.into());
    }
}

pub fn calculate_edition_number(
    mint_authority_info: &AccountInfo,
    reservation_list_info: Option<&AccountInfo>,
    edition_override: Option<u64>,
    me_supply: u64,
) -> Result<u64, ProgramError> {
    let edition = match reservation_list_info {
        Some(account) => {
            extract_edition_number_from_deprecated_reservation_list(account, mint_authority_info)?
        }
        None => {
            if let Some(edit) = edition_override {
                edit
            } else {
                me_supply
                    .checked_add(1)
                    .ok_or(MetadataError::NumericalOverflowError)?
            }
        }
    };

    Ok(edition)
}

fn get_max_supply_off_master_edition(
    master_edition_account_info: &AccountInfo,
) -> Result<Option<u64>, ProgramError> {
    let data = master_edition_account_info.try_borrow_data()?;
    // this is an option, 9 bytes, first is 0 means is none
    if data[9] == 0 {
        Ok(None)
    } else {
        let amount_data = array_ref![data, 10, 8];
        Ok(Some(u64::from_le_bytes(*amount_data)))
    }
}

pub fn get_supply_off_master_edition(
    master_edition_account_info: &AccountInfo,
) -> Result<u64, ProgramError> {
    let data = master_edition_account_info.try_borrow_data()?;
    // this is an option, 9 bytes, first is 0 means is none

    let amount_data = array_ref![data, 1, 8];
    Ok(u64::from_le_bytes(*amount_data))
}

pub fn calculate_supply_change<'a>(
    master_edition_account_info: &AccountInfo<'a>,
    reservation_list_info: Option<&AccountInfo<'a>>,
    edition_override: Option<u64>,
    me_supply: u64,
) -> ProgramResult {
    if reservation_list_info.is_none() {
        let new_supply: u64;
        if let Some(edition) = edition_override {
            if edition > me_supply {
                new_supply = edition;
            } else {
                new_supply = me_supply
            }
        } else {
            new_supply = me_supply
                .checked_add(1)
                .ok_or(MetadataError::NumericalOverflowError)?;
        }

        if let Some(max) = get_max_supply_off_master_edition(master_edition_account_info)? {
            if new_supply > max {
                return Err(MetadataError::MaxEditionsMintedAlready.into());
            }
        }
        // Doing old school serialization to protect CPU credits.
        let edition_data = &mut master_edition_account_info.data.borrow_mut();
        let output = array_mut_ref![edition_data, 0, MAX_MASTER_EDITION_LEN];

        let (_key, supply, _the_rest) =
            mut_array_refs![output, 1, 8, MAX_MASTER_EDITION_LEN - 8 - 1];
        *supply = new_supply.to_le_bytes();
    }

    Ok(())
}

#[allow(clippy::too_many_arguments)]
pub fn mint_limited_edition<'a>(
    program_id: &'a Pubkey,
    master_metadata: Metadata,
    new_metadata_account_info: &'a AccountInfo<'a>,
    new_edition_account_info: &'a AccountInfo<'a>,
    master_edition_account_info: &'a AccountInfo<'a>,
    mint_info: &'a AccountInfo<'a>,
    mint_authority_info: &'a AccountInfo<'a>,
    payer_account_info: &'a AccountInfo<'a>,
    update_authority_info: &'a AccountInfo<'a>,
    token_program_account_info: &'a AccountInfo<'a>,
    system_account_info: &'a AccountInfo<'a>,
    rent_info: &'a AccountInfo<'a>,
    // Only present with MasterEditionV1 calls, if present, use edition based off address in res list,
    // otherwise, pull off the top
    reservation_list_info: Option<&'a AccountInfo<'a>>,
    // Only present with MasterEditionV2 calls, if present, means
    // directing to a specific version, otherwise just pull off the top
    edition_override: Option<u64>,
) -> ProgramResult {
    let me_supply = get_supply_off_master_edition(master_edition_account_info)?;
    let mint_authority = get_mint_authority(mint_info)?;
    let mint_supply = get_mint_supply(mint_info)?;
    assert_mint_authority_matches_mint(&mint_authority, mint_authority_info)?;

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

    if reservation_list_info.is_some() && edition_override.is_some() {
        return Err(MetadataError::InvalidOperation.into());
    }

    calculate_supply_change(
        master_edition_account_info,
        reservation_list_info,
        edition_override,
        me_supply,
    )?;

    if mint_supply != 1 {
        return Err(MetadataError::EditionsMustHaveExactlyOneToken.into());
    }

    // create the metadata the normal way...
    process_create_metadata_accounts_logic(
        &program_id,
        CreateMetadataAccountsLogicArgs {
            metadata_account_info: new_metadata_account_info,
            mint_info,
            mint_authority_info,
            payer_account_info,
            update_authority_info,
            system_account_info,
            rent_info,
        },
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

    // Doing old school serialization to protect CPU credits.
    let edition_data = &mut new_edition_account_info.data.borrow_mut();
    let output = array_mut_ref![edition_data, 0, MAX_EDITION_LEN];

    let (key, parent, edition, _padding) = mut_array_refs![output, 1, 32, 8, 200];

    *key = [Key::EditionV1 as u8];
    parent.copy_from_slice(master_edition_account_info.key.as_ref());

    *edition = calculate_edition_number(
        mint_authority_info,
        reservation_list_info,
        edition_override,
        me_supply,
    )?
    .to_le_bytes();

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

pub struct CreateMetadataAccountsLogicArgs<'a> {
    pub metadata_account_info: &'a AccountInfo<'a>,
    pub mint_info: &'a AccountInfo<'a>,
    pub mint_authority_info: &'a AccountInfo<'a>,
    pub payer_account_info: &'a AccountInfo<'a>,
    pub update_authority_info: &'a AccountInfo<'a>,
    pub system_account_info: &'a AccountInfo<'a>,
    pub rent_info: &'a AccountInfo<'a>,
}

/// Create a new account instruction
pub fn process_create_metadata_accounts_logic(
    program_id: &Pubkey,
    accounts: CreateMetadataAccountsLogicArgs,
    data: Data,
    allow_direct_creator_writes: bool,
    is_mutable: bool,
) -> ProgramResult {
    let CreateMetadataAccountsLogicArgs {
        metadata_account_info,
        mint_info,
        mint_authority_info,
        payer_account_info,
        update_authority_info,
        system_account_info,
        rent_info,
    } = accounts;

    let mint_authority = get_mint_authority(mint_info)?;
    assert_mint_authority_matches_mint(&mint_authority, mint_authority_info)?;
    assert_owned_by(mint_info, &spl_token::id())?;

    let metadata_seeds = &[
        PREFIX.as_bytes(),
        program_id.as_ref(),
        mint_info.key.as_ref(),
    ];
    let (metadata_key, metadata_bump_seed) =
        Pubkey::find_program_address(metadata_seeds, program_id);
    let metadata_authority_signer_seeds = &[
        PREFIX.as_bytes(),
        program_id.as_ref(),
        mint_info.key.as_ref(),
        &[metadata_bump_seed],
    ];

    if metadata_account_info.key != &metadata_key {
        return Err(MetadataError::InvalidMetadataKey.into());
    }

    create_or_allocate_account_raw(
        *program_id,
        metadata_account_info,
        rent_info,
        system_account_info,
        payer_account_info,
        MAX_METADATA_LEN,
        metadata_authority_signer_seeds,
    )?;

    let mut metadata = Metadata::from_account_info(metadata_account_info)?;
    assert_data_valid(
        &data,
        update_authority_info.key,
        &metadata,
        allow_direct_creator_writes,
    )?;

    metadata.mint = *mint_info.key;
    metadata.key = Key::MetadataV1;
    metadata.data = data;
    metadata.is_mutable = is_mutable;
    metadata.update_authority = *update_authority_info.key;

    puff_out_data_fields(&mut metadata);

    let edition_seeds = &[
        PREFIX.as_bytes(),
        program_id.as_ref(),
        metadata.mint.as_ref(),
        EDITION.as_bytes()
    ];
    let (_, edition_bump_seed) =
        Pubkey::find_program_address(edition_seeds, program_id);
    metadata.edition_nonce = Some(edition_bump_seed);
    
    metadata.serialize(&mut *metadata_account_info.data.borrow_mut())?;

    Ok(())
}

pub fn puff_out_data_fields(metadata: &mut Metadata) {
    let mut array_of_zeroes = vec![];
    while array_of_zeroes.len() < MAX_NAME_LENGTH - metadata.data.name.len() {
        array_of_zeroes.push(0u8);
    }
    metadata.data.name = metadata.data.name.clone() + std::str::from_utf8(&array_of_zeroes).unwrap();

    let mut array_of_zeroes = vec![];
    while array_of_zeroes.len() < MAX_SYMBOL_LENGTH - metadata.data.symbol.len() {
        array_of_zeroes.push(0u8);
    }
    metadata.data.symbol = metadata.data.symbol.clone() + std::str::from_utf8(&array_of_zeroes).unwrap();

    let mut array_of_zeroes = vec![];
    while array_of_zeroes.len() < MAX_URI_LENGTH - metadata.data.uri.len() {
        array_of_zeroes.push(0u8);
    }
    metadata.data.uri = metadata.data.uri.clone() + std::str::from_utf8(&array_of_zeroes).unwrap();
}

pub struct MintNewEditionFromMasterEditionViaTokenLogicArgs<'a> {
    pub new_metadata_account_info: &'a AccountInfo<'a>,
    pub new_edition_account_info: &'a AccountInfo<'a>,
    pub master_edition_account_info: &'a AccountInfo<'a>,
    pub mint_info: &'a AccountInfo<'a>,
    pub edition_marker_info: &'a AccountInfo<'a>,
    pub mint_authority_info: &'a AccountInfo<'a>,
    pub payer_account_info: &'a AccountInfo<'a>,
    pub owner_account_info: &'a AccountInfo<'a>,
    pub token_account_info: &'a AccountInfo<'a>,
    pub update_authority_info: &'a AccountInfo<'a>,
    pub master_metadata_account_info: &'a AccountInfo<'a>,
    pub token_program_account_info: &'a AccountInfo<'a>,
    pub system_account_info: &'a AccountInfo<'a>,
    pub rent_info: &'a AccountInfo<'a>,
}

pub fn process_mint_new_edition_from_master_edition_via_token_logic<'a>(
    program_id: &'a Pubkey,
    accounts: MintNewEditionFromMasterEditionViaTokenLogicArgs<'a>,
    edition: u64,
    ignore_owner_signer: bool,
) -> ProgramResult {
    let MintNewEditionFromMasterEditionViaTokenLogicArgs {
        new_metadata_account_info,
        new_edition_account_info,
        master_edition_account_info,
        mint_info,
        edition_marker_info,
        mint_authority_info,
        payer_account_info,
        owner_account_info,
        token_account_info,
        update_authority_info,
        master_metadata_account_info,
        token_program_account_info,
        system_account_info,
        rent_info,
    } = accounts;

    assert_token_program_matches_package(token_program_account_info)?;
    assert_owned_by(mint_info, &spl_token::id())?;
    assert_owned_by(token_account_info, &spl_token::id())?;
    assert_owned_by(master_edition_account_info, program_id)?;
    assert_owned_by(master_metadata_account_info, program_id)?;

    let master_metadata = Metadata::from_account_info(master_metadata_account_info)?;
    let token_account: Account = assert_initialized(token_account_info)?;

    if !ignore_owner_signer {
        assert_signer(owner_account_info)?;

        if token_account.owner != *owner_account_info.key {
            return Err(MetadataError::InvalidOwner.into());
        }
    }

    if token_account.mint != master_metadata.mint {
        return Err(MetadataError::TokenAccountMintMismatchV2.into());
    }

    if token_account.amount < 1 {
        return Err(MetadataError::NotEnoughTokens.into());
    }

    if !new_metadata_account_info.data_is_empty() {
        return Err(MetadataError::AlreadyInitialized.into());
    }

    if !new_edition_account_info.data_is_empty() {
        return Err(MetadataError::AlreadyInitialized.into());
    }

    let edition_number = edition.checked_div(EDITION_MARKER_BIT_SIZE).unwrap();
    let as_string = edition_number.to_string();

    let bump = assert_derivation(
        program_id,
        edition_marker_info,
        &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            master_metadata.mint.as_ref(),
            EDITION.as_bytes(),
            as_string.as_bytes(),
        ],
    )?;

    if edition_marker_info.data_is_empty() {
        let seeds = &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            master_metadata.mint.as_ref(),
            EDITION.as_bytes(),
            as_string.as_bytes(),
            &[bump],
        ];

        create_or_allocate_account_raw(
            *program_id,
            edition_marker_info,
            rent_info,
            system_account_info,
            payer_account_info,
            MAX_EDITION_MARKER_SIZE,
            seeds,
        )?;
    }

    let mut edition_marker = EditionMarker::from_account_info(edition_marker_info)?;
    edition_marker.key = Key::EditionMarker;
    if edition_marker.edition_taken(edition)? {
        return Err(MetadataError::AlreadyInitialized.into());
    } else {
        edition_marker.insert_edition(edition)?
    }
    edition_marker.serialize(&mut *edition_marker_info.data.borrow_mut())?;

    mint_limited_edition(
        program_id,
        master_metadata,
        new_metadata_account_info,
        new_edition_account_info,
        master_edition_account_info,
        mint_info,
        mint_authority_info,
        payer_account_info,
        update_authority_info,
        token_program_account_info,
        system_account_info,
        rent_info,
        None,
        Some(edition),
    )?;
    Ok(())
}
