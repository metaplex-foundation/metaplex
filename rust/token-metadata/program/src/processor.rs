use {
    crate::{
        error::MetadataError,
        instruction::MetadataInstruction,
        state::{
            get_reservation_list, Data, Key, MasterEdition, Metadata, Reservation,
            ReservationListV2, EDITION, MAX_MASTER_EDITION_LEN, MAX_METADATA_LEN, MAX_RESERVATIONS,
            MAX_RESERVATION_LIST_SIZE, PREFIX, RESERVATION,
        },
        utils::{
            assert_data_valid, assert_derivation, assert_initialized,
            assert_mint_authority_matches_mint, assert_owned_by, assert_rent_exempt, assert_signer,
            assert_supply_invariance, assert_token_program_matches_package,
            assert_update_authority_is_correct, create_or_allocate_account_raw,
            mint_limited_edition, spl_token_burn, spl_token_mint_to, transfer_mint_authority,
            TokenBurnParams, TokenMintToParams,
        },
    },
    borsh::{BorshDeserialize, BorshSerialize},
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        entrypoint::ProgramResult,
        msg,
        program_error::ProgramError,
        pubkey::Pubkey,
        rent::Rent,
        sysvar::Sysvar,
    },
    spl_token::state::{Account, Mint},
};

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    input: &[u8],
) -> ProgramResult {
    let instruction = MetadataInstruction::try_from_slice(input)?;
    match instruction {
        MetadataInstruction::CreateMetadataAccount(args) => {
            msg!("Instruction: Create Metadata Accounts");
            process_create_metadata_accounts(
                program_id,
                accounts,
                args.data,
                false,
                args.is_mutable,
            )
        }
        MetadataInstruction::UpdateMetadataAccount(args) => {
            msg!("Instruction: Update Metadata Accounts");
            process_update_metadata_accounts(
                program_id,
                accounts,
                args.data,
                args.update_authority,
                args.primary_sale_happened,
            )
        }
        MetadataInstruction::CreateMasterEdition(args) => {
            msg!("Instruction: Create Master Edition");
            process_create_master_edition(program_id, accounts, args.max_supply)
        }
        MetadataInstruction::MintNewEditionFromMasterEditionViaToken => {
            msg!("Instruction: Mint New Edition from Master Edition Via Token");
            process_mint_new_edition_from_master_edition_via_token(program_id, accounts)
        }
        MetadataInstruction::UpdatePrimarySaleHappenedViaToken => {
            msg!("Instruction: Update primary sale via token");
            process_update_primary_sale_happened_via_token(program_id, accounts)
        }
        MetadataInstruction::SetReservationList(args) => {
            msg!("Instruction: Set Reservation List");
            process_set_reservation_list(
                program_id,
                accounts,
                args.reservations,
                args.total_reservation_spots,
            )
        }
        MetadataInstruction::CreateReservationList => {
            msg!("Instruction: Create Reservation List");
            process_create_reservation_list(program_id, accounts)
        }
        MetadataInstruction::SignMetadata => {
            msg!("Instruction: Sign Metadata");
            process_sign_metadata(program_id, accounts)
        }
        MetadataInstruction::MintPrintingTokensViaToken(args) => {
            msg!("Instruction: Mint Printing Tokens Via Token");
            process_mint_printing_tokens_via_token(program_id, accounts, args.supply)
        }
        MetadataInstruction::MintPrintingTokens(args) => {
            msg!("Instruction: Mint Printing Tokens");
            process_mint_printing_tokens(program_id, accounts, args.supply)
        }
    }
}

/// Create a new account instruction
pub fn process_create_metadata_accounts(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: Data,
    allow_direct_creator_writes: bool,
    is_mutable: bool,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let metadata_account_info = next_account_info(account_info_iter)?;
    let mint_info = next_account_info(account_info_iter)?;
    let mint_authority_info = next_account_info(account_info_iter)?;
    let payer_account_info = next_account_info(account_info_iter)?;
    let update_authority_info = next_account_info(account_info_iter)?;
    let system_account_info = next_account_info(account_info_iter)?;
    let rent_info = next_account_info(account_info_iter)?;

    let mint: Mint = assert_initialized(mint_info)?;
    assert_mint_authority_matches_mint(&mint, mint_authority_info)?;
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

    metadata.serialize(&mut *metadata_account_info.data.borrow_mut())?;

    Ok(())
}

/// Update existing account instruction
pub fn process_update_metadata_accounts(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    optional_data: Option<Data>,
    update_authority: Option<Pubkey>,
    primary_sale_happened: Option<bool>,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let metadata_account_info = next_account_info(account_info_iter)?;
    let update_authority_info = next_account_info(account_info_iter)?;
    let mut metadata = Metadata::from_account_info(metadata_account_info)?;

    assert_owned_by(metadata_account_info, program_id)?;
    assert_update_authority_is_correct(&metadata, update_authority_info)?;

    if let Some(data) = optional_data {
        if metadata.is_mutable {
            assert_data_valid(&data, update_authority_info.key, &metadata, false)?;
            metadata.data = data;
        } else {
            return Err(MetadataError::DataIsImmutable.into());
        }
    }

    if let Some(val) = update_authority {
        metadata.update_authority = val;
    }

    if let Some(val) = primary_sale_happened {
        if val {
            metadata.primary_sale_happened = val
        } else {
            return Err(MetadataError::PrimarySaleCanOnlyBeFlippedToTrue.into());
        }
    }

    metadata.serialize(&mut *metadata_account_info.data.borrow_mut())?;
    Ok(())
}

/// Create master edition
pub fn process_create_master_edition(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    max_supply: Option<u64>,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let edition_account_info = next_account_info(account_info_iter)?;
    let mint_info = next_account_info(account_info_iter)?;
    let printing_mint_info = next_account_info(account_info_iter)?;
    let one_time_printing_authorization_mint_info = next_account_info(account_info_iter)?;
    let update_authority_info = next_account_info(account_info_iter)?;
    let printing_mint_authority_info = next_account_info(account_info_iter)?;
    let mint_authority_info = next_account_info(account_info_iter)?;
    let metadata_account_info = next_account_info(account_info_iter)?;
    let payer_account_info = next_account_info(account_info_iter)?;
    let token_program_info = next_account_info(account_info_iter)?;
    let system_account_info = next_account_info(account_info_iter)?;
    let rent_info = next_account_info(account_info_iter)?;

    let metadata = Metadata::from_account_info(metadata_account_info)?;
    let mint: Mint = assert_initialized(mint_info)?;
    let printing_mint: Mint = assert_initialized(printing_mint_info)?;
    let one_time_printing_authorization_mint: Mint =
        assert_initialized(one_time_printing_authorization_mint_info)?;

    let bump_seed = assert_derivation(
        program_id,
        edition_account_info,
        &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            &mint_info.key.as_ref(),
            EDITION.as_bytes(),
        ],
    )?;

    assert_token_program_matches_package(token_program_info)?;
    assert_mint_authority_matches_mint(&mint, mint_authority_info)?;
    assert_mint_authority_matches_mint(&printing_mint, printing_mint_authority_info)?;
    assert_mint_authority_matches_mint(&one_time_printing_authorization_mint, mint_authority_info)?;
    assert_owned_by(metadata_account_info, program_id)?;
    assert_owned_by(mint_info, &spl_token::id())?;
    assert_owned_by(printing_mint_info, &spl_token::id())?;
    assert_owned_by(one_time_printing_authorization_mint_info, &spl_token::id())?;

    if metadata.mint != *mint_info.key {
        return Err(MetadataError::MintMismatch.into());
    }

    if printing_mint.decimals != 0 {
        return Err(MetadataError::PrintingMintDecimalsShouldBeZero.into());
    }

    if one_time_printing_authorization_mint.decimals != 0 {
        return Err(MetadataError::OneTimePrintingAuthorizationMintDecimalsShouldBeZero.into());
    }

    if mint.decimals != 0 {
        return Err(MetadataError::EditionMintDecimalsShouldBeZero.into());
    }

    assert_update_authority_is_correct(&metadata, update_authority_info)?;

    if mint.supply != 1 {
        return Err(MetadataError::EditionsMustHaveExactlyOneToken.into());
    }

    let edition_authority_seeds = &[
        PREFIX.as_bytes(),
        program_id.as_ref(),
        &mint_info.key.as_ref(),
        EDITION.as_bytes(),
        &[bump_seed],
    ];

    create_or_allocate_account_raw(
        *program_id,
        edition_account_info,
        rent_info,
        system_account_info,
        payer_account_info,
        MAX_MASTER_EDITION_LEN,
        edition_authority_seeds,
    )?;

    let mut edition = MasterEdition::from_account_info(edition_account_info)?;

    edition.key = Key::MasterEditionV1;
    edition.supply = 0;
    edition.max_supply = max_supply;
    edition.printing_mint = *printing_mint_info.key;
    edition.one_time_printing_authorization_mint = *one_time_printing_authorization_mint_info.key;
    edition.serialize(&mut *edition_account_info.data.borrow_mut())?;

    // While you can't mint any more of your master record, you can
    // mint as many limited editions as you like, and coins to permission others
    // to mint one of them in the future.
    transfer_mint_authority(
        edition_account_info.key,
        edition_account_info,
        mint_info,
        mint_authority_info,
        token_program_info,
    )?;

    // The program needs to own the printing mint to be able to print tokens via the one time printing auth
    // you can get tokens out of it as update authority via another call.
    transfer_mint_authority(
        edition_account_info.key,
        edition_account_info,
        printing_mint_info,
        printing_mint_authority_info,
        token_program_info,
    )?;

    if max_supply.is_some() {
        // We need to enact limited supply protocol, take away one time printing too.
        let one_time_printing_authorization_mint_authority_info =
            next_account_info(account_info_iter)?;

        transfer_mint_authority(
            &edition_account_info.key,
            edition_account_info,
            one_time_printing_authorization_mint_info,
            one_time_printing_authorization_mint_authority_info,
            token_program_info,
        )?;
    }

    Ok(())
}

pub fn process_mint_new_edition_from_master_edition_via_token(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let new_metadata_account_info = next_account_info(account_info_iter)?;
    let new_edition_account_info = next_account_info(account_info_iter)?;
    let master_edition_account_info = next_account_info(account_info_iter)?;
    let mint_info = next_account_info(account_info_iter)?;
    let mint_authority_info = next_account_info(account_info_iter)?;
    let printing_mint_info = next_account_info(account_info_iter)?;
    let master_token_account_info = next_account_info(account_info_iter)?;
    let burn_authority = next_account_info(account_info_iter)?;
    let payer_account_info = next_account_info(account_info_iter)?;
    let update_authority_info = next_account_info(account_info_iter)?;
    let master_metadata_account_info = next_account_info(account_info_iter)?;
    let token_program_account_info = next_account_info(account_info_iter)?;
    let system_account_info = next_account_info(account_info_iter)?;
    let rent_info = next_account_info(account_info_iter)?;
    let reservation_list_info = match next_account_info(account_info_iter) {
        Ok(account) => Some(account),
        Err(_) => None,
    };

    assert_token_program_matches_package(token_program_account_info)?;
    assert_owned_by(mint_info, &spl_token::id())?;
    assert_owned_by(printing_mint_info, &spl_token::id())?;
    assert_owned_by(master_token_account_info, &spl_token::id())?;

    if !new_metadata_account_info.data_is_empty() {
        return Err(MetadataError::AlreadyInitialized.into());
    }

    if !new_edition_account_info.data_is_empty() {
        return Err(MetadataError::AlreadyInitialized.into());
    }

    assert_owned_by(master_edition_account_info, program_id)?;
    assert_owned_by(master_metadata_account_info, program_id)?;
    if let Some(acct) = reservation_list_info {
        assert_owned_by(acct, program_id)?;
    }

    let token_account: Account = assert_initialized(master_token_account_info)?;
    let master_edition = MasterEdition::from_account_info(master_edition_account_info)?;

    if master_edition.printing_mint != *printing_mint_info.key {
        return Err(MetadataError::PrintingMintMismatch.into());
    }

    if token_account.mint != *printing_mint_info.key {
        return Err(MetadataError::TokenAccountMintMismatch.into());
    }

    if token_account.amount < 1 {
        return Err(MetadataError::NotEnoughTokens.into());
    }

    spl_token_burn(TokenBurnParams {
        mint: printing_mint_info.clone(),
        source: master_token_account_info.clone(),
        amount: 1,
        authority: burn_authority.clone(),
        authority_signer_seeds: None,
        token_program: token_program_account_info.clone(),
    })?;

    mint_limited_edition(
        program_id,
        new_metadata_account_info,
        new_edition_account_info,
        master_edition_account_info,
        mint_info,
        mint_authority_info,
        payer_account_info,
        update_authority_info,
        master_metadata_account_info,
        token_program_account_info,
        system_account_info,
        rent_info,
        reservation_list_info,
    )?;
    Ok(())
}

pub fn process_update_primary_sale_happened_via_token(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let metadata_account_info = next_account_info(account_info_iter)?;
    let owner_info = next_account_info(account_info_iter)?;
    let token_account_info = next_account_info(account_info_iter)?;

    let token_account: Account = assert_initialized(token_account_info)?;
    let mut metadata = Metadata::from_account_info(metadata_account_info)?;

    assert_owned_by(metadata_account_info, program_id)?;
    assert_owned_by(token_account_info, &spl_token::id())?;

    if !owner_info.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if token_account.owner != *owner_info.key {
        return Err(MetadataError::OwnerMismatch.into());
    }

    if token_account.amount == 0 {
        return Err(MetadataError::NoBalanceInAccountForAuthorization.into());
    }

    if token_account.mint != metadata.mint {
        return Err(MetadataError::MintMismatch.into());
    }

    metadata.primary_sale_happened = true;
    metadata.serialize(&mut *metadata_account_info.data.borrow_mut())?;

    Ok(())
}

pub fn process_create_reservation_list(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let reservation_list_info = next_account_info(account_info_iter)?;
    let payer_info = next_account_info(account_info_iter)?;
    let update_authority_info = next_account_info(account_info_iter)?;
    let master_edition_info = next_account_info(account_info_iter)?;
    let resource_info = next_account_info(account_info_iter)?;
    let metadata_info = next_account_info(account_info_iter)?;
    let system_program_info = next_account_info(account_info_iter)?;
    let rent_info = next_account_info(account_info_iter)?;

    assert_owned_by(master_edition_info, program_id)?;
    assert_owned_by(metadata_info, program_id)?;

    let metadata = Metadata::from_account_info(metadata_info)?;
    assert_update_authority_is_correct(&metadata, update_authority_info)?;

    if !reservation_list_info.data_is_empty() {
        return Err(MetadataError::ReservationExists.into());
    }

    let bump = assert_derivation(
        program_id,
        reservation_list_info,
        &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            master_edition_info.key.as_ref(),
            RESERVATION.as_bytes(),
            resource_info.key.as_ref(),
        ],
    )?;

    assert_derivation(
        program_id,
        master_edition_info,
        &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            metadata.mint.as_ref(),
            EDITION.as_bytes(),
        ],
    )?;

    let seeds = &[
        PREFIX.as_bytes(),
        program_id.as_ref(),
        master_edition_info.key.as_ref(),
        RESERVATION.as_bytes(),
        resource_info.key.as_ref(),
        &[bump],
    ];

    create_or_allocate_account_raw(
        *program_id,
        reservation_list_info,
        rent_info,
        system_program_info,
        payer_info,
        MAX_RESERVATION_LIST_SIZE,
        seeds,
    )?;
    let mut reservation = ReservationListV2::from_account_info(reservation_list_info)?;

    reservation.key = Key::ReservationListV2;
    reservation.master_edition = *master_edition_info.key;
    reservation.supply_snapshot = None;
    reservation.reservations = vec![];

    reservation.serialize(&mut *reservation_list_info.data.borrow_mut())?;

    Ok(())
}

pub fn process_set_reservation_list(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    reservations: Vec<Reservation>,
    total_reservation_spots: Option<u64>,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let master_edition_info = next_account_info(account_info_iter)?;
    let reservation_list_info = next_account_info(account_info_iter)?;
    let resource_info = next_account_info(account_info_iter)?;

    assert_signer(resource_info)?;
    assert_owned_by(master_edition_info, program_id)?;
    assert_owned_by(reservation_list_info, program_id)?;

    let mut master_edition = MasterEdition::from_account_info(master_edition_info)?;

    if reservation_list_info.data_is_empty() {
        return Err(MetadataError::ReservationDoesNotExist.into());
    }

    assert_derivation(
        program_id,
        reservation_list_info,
        &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            master_edition_info.key.as_ref(),
            RESERVATION.as_bytes(),
            resource_info.key.as_ref(),
        ],
    )?;

    let mut reservation_list = get_reservation_list(reservation_list_info)?;

    if reservation_list.supply_snapshot().is_some() && total_reservation_spots.is_some() {
        return Err(MetadataError::ReservationAlreadyMade.into());
    }

    let mut total_len: u64 = reservation_list.total_reservation_spots();
    let mut total_len_check: u64 = reservation_list.total_reservation_spots();

    for reservation in &reservations {
        total_len = total_len
            .checked_add(reservation.spots_remaining)
            .ok_or(MetadataError::NumericalOverflowError)?;
        total_len_check = total_len_check
            .checked_add(reservation.total_spots)
            .ok_or(MetadataError::NumericalOverflowError)?;
        if reservation.spots_remaining != reservation.total_spots {
            return Err(
                MetadataError::ReservationSpotsRemainingShouldMatchTotalSpotsAtStart.into(),
            );
        }
    }

    if total_len_check != total_len {
        return Err(MetadataError::SpotMismatch.into());
    }

    reservation_list.add_reservations(reservations);

    if let Some(total) = total_reservation_spots {
        msg!("Total new spots allocated: {:?}", total);
        reservation_list.set_supply_snapshot(Some(master_edition.supply));
        reservation_list.set_total_reservation_spots(total);
        master_edition.supply = master_edition
            .supply
            .checked_add(total as u64)
            .ok_or(MetadataError::NumericalOverflowError)?;

        if let Some(max_supply) = master_edition.max_supply {
            if master_edition.supply > max_supply {
                return Err(MetadataError::ReservationBreachesMaximumSupply.into());
            }
        }
        master_edition.serialize(&mut *master_edition_info.data.borrow_mut())?;
    }

    if total_len > reservation_list.total_reservation_spots() {
        return Err(MetadataError::BeyondAlottedAddressSize.into());
    };

    if reservation_list.reservations().len() > MAX_RESERVATIONS {
        return Err(MetadataError::BeyondMaxAddressSize.into());
    }

    reservation_list.save(reservation_list_info)?;

    Ok(())
}

pub fn process_sign_metadata(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let metadata_info = next_account_info(account_info_iter)?;
    let creator_info = next_account_info(account_info_iter)?;

    assert_signer(creator_info)?;
    assert_owned_by(metadata_info, program_id)?;

    let mut metadata = Metadata::from_account_info(metadata_info)?;

    if let Some(creators) = &mut metadata.data.creators {
        let mut found = false;
        for creator in creators {
            if creator.address == *creator_info.key {
                creator.verified = true;
                found = true;
                break;
            }
        }
        if !found {
            return Err(MetadataError::CreatorNotFound.into());
        }
    } else {
        return Err(MetadataError::NoCreatorsPresentOnMetadata.into());
    }
    metadata.serialize(&mut *metadata_info.data.borrow_mut())?;

    Ok(())
}

pub fn process_mint_printing_tokens_via_token(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    supply: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let destination_info = next_account_info(account_info_iter)?;
    let one_time_token_account_info = next_account_info(account_info_iter)?;
    let one_time_printing_authorization_mint_info = next_account_info(account_info_iter)?;
    let printing_mint_info = next_account_info(account_info_iter)?;
    let burn_authority_info = next_account_info(account_info_iter)?;
    let metadata_info = next_account_info(account_info_iter)?;
    let master_edition_info = next_account_info(account_info_iter)?;
    let token_program_info = next_account_info(account_info_iter)?;
    let rent_info = next_account_info(account_info_iter)?;
    let rent = &Rent::from_account_info(rent_info)?;

    let destination: Account = assert_initialized(destination_info)?;
    let one_time_token_account: Account = assert_initialized(one_time_token_account_info)?;
    let master_edition = MasterEdition::from_account_info(master_edition_info)?;
    let metadata = Metadata::from_account_info(metadata_info)?;

    let printing_mint: Mint = assert_initialized(printing_mint_info)?;

    assert_supply_invariance(&master_edition, &printing_mint, supply)?;
    assert_token_program_matches_package(token_program_info)?;
    assert_rent_exempt(rent, destination_info)?;
    assert_owned_by(destination_info, &spl_token::id())?;
    assert_owned_by(one_time_token_account_info, &spl_token::id())?;
    assert_owned_by(one_time_printing_authorization_mint_info, &spl_token::id())?;
    assert_owned_by(printing_mint_info, &spl_token::id())?;
    assert_owned_by(metadata_info, program_id)?;
    assert_owned_by(master_edition_info, program_id)?;

    if destination.mint != master_edition.printing_mint {
        return Err(MetadataError::DestinationMintMismatch.into());
    }

    if one_time_token_account.mint != master_edition.one_time_printing_authorization_mint {
        return Err(MetadataError::TokenAccountOneTimeAuthMintMismatch.into());
    }

    if one_time_token_account.amount == 0 {
        return Err(MetadataError::NoBalanceInAccountForAuthorization.into());
    }

    if *printing_mint_info.key != master_edition.printing_mint {
        return Err(MetadataError::PrintingMintMismatch.into());
    }

    if *one_time_printing_authorization_mint_info.key
        != master_edition.one_time_printing_authorization_mint
    {
        return Err(MetadataError::OneTimePrintingAuthMintMismatch.into());
    }

    spl_token_burn(TokenBurnParams {
        mint: one_time_printing_authorization_mint_info.clone(),
        source: one_time_token_account_info.clone(),
        amount: 1,
        authority: burn_authority_info.clone(),
        authority_signer_seeds: None,
        token_program: token_program_info.clone(),
    })?;

    let bump = assert_derivation(
        program_id,
        master_edition_info,
        &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            metadata.mint.as_ref(),
            EDITION.as_bytes(),
        ],
    )?;

    let authority_seeds = &[
        PREFIX.as_bytes(),
        program_id.as_ref(),
        metadata.mint.as_ref(),
        EDITION.as_bytes(),
        &[bump],
    ];
    spl_token_mint_to(TokenMintToParams {
        mint: printing_mint_info.clone(),
        destination: destination_info.clone(),
        amount: supply,
        authority: master_edition_info.clone(),
        authority_signer_seeds: Some(authority_seeds),
        token_program: token_program_info.clone(),
    })?;

    Ok(())
}

pub fn process_mint_printing_tokens(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    supply: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let destination_info = next_account_info(account_info_iter)?;
    let printing_mint_info = next_account_info(account_info_iter)?;
    let update_authority_info = next_account_info(account_info_iter)?;
    let metadata_info = next_account_info(account_info_iter)?;
    let master_edition_info = next_account_info(account_info_iter)?;
    let token_program_info = next_account_info(account_info_iter)?;
    let rent_info = next_account_info(account_info_iter)?;
    let rent = &Rent::from_account_info(rent_info)?;

    let destination: Account = assert_initialized(destination_info)?;
    let master_edition = MasterEdition::from_account_info(master_edition_info)?;
    let metadata = Metadata::from_account_info(metadata_info)?;
    let printing_mint: Mint = assert_initialized(printing_mint_info)?;
    assert_token_program_matches_package(token_program_info)?;
    assert_rent_exempt(rent, destination_info)?;
    assert_owned_by(destination_info, &spl_token::id())?;
    assert_update_authority_is_correct(&metadata, update_authority_info)?;
    assert_supply_invariance(&master_edition, &printing_mint, supply)?;
    assert_owned_by(printing_mint_info, &spl_token::id())?;
    assert_owned_by(metadata_info, program_id)?;
    assert_owned_by(master_edition_info, program_id)?;

    let bump = assert_derivation(
        program_id,
        master_edition_info,
        &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            metadata.mint.as_ref(),
            EDITION.as_bytes(),
        ],
    )?;

    let authority_seeds = &[
        PREFIX.as_bytes(),
        program_id.as_ref(),
        metadata.mint.as_ref(),
        EDITION.as_bytes(),
        &[bump],
    ];

    if destination.mint != master_edition.printing_mint {
        return Err(MetadataError::DestinationMintMismatch.into());
    }

    if *printing_mint_info.key != master_edition.printing_mint {
        return Err(MetadataError::PrintingMintMismatch.into());
    }

    spl_token_mint_to(TokenMintToParams {
        mint: printing_mint_info.clone(),
        destination: destination_info.clone(),
        amount: supply,
        authority: master_edition_info.clone(),
        authority_signer_seeds: Some(authority_seeds),
        token_program: token_program_info.clone(),
    })?;

    Ok(())
}
