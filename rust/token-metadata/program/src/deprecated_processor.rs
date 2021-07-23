use solana_program::msg;

use {
    crate::{
        error::MetadataError,
        state::{
            get_reservation_list, Key, MasterEditionV1, Metadata, Reservation, ReservationListV2,
            EDITION, MAX_MASTER_EDITION_LEN, MAX_RESERVATIONS, MAX_RESERVATION_LIST_SIZE, PREFIX,
            RESERVATION,
        },
        utils::{
            assert_derivation, assert_initialized, assert_mint_authority_matches_mint,
            assert_owned_by, assert_rent_exempt, assert_signer, assert_supply_invariance,
            assert_token_program_matches_package, assert_update_authority_is_correct,
            create_or_allocate_account_raw, mint_limited_edition, spl_token_burn,
            spl_token_mint_to, transfer_mint_authority, TokenBurnParams, TokenMintToParams,
        },
    },
    borsh::BorshSerialize,
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        entrypoint::ProgramResult,
        pubkey::Pubkey,
        rent::Rent,
        sysvar::Sysvar,
    },
    spl_token::state::{Account, Mint},
};

/// Create master edition
pub fn process_deprecated_create_master_edition(
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
    assert_mint_authority_matches_mint(&mint.mint_authority, mint_authority_info)?;
    assert_mint_authority_matches_mint(
        &printing_mint.mint_authority,
        printing_mint_authority_info,
    )?;
    assert_mint_authority_matches_mint(
        &one_time_printing_authorization_mint.mint_authority,
        mint_authority_info,
    )?;
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

    let mut edition = MasterEditionV1::from_account_info(edition_account_info)?;

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

pub fn process_deprecated_mint_new_edition_from_master_edition_via_printing_token<'a>(
    program_id: &'a Pubkey,
    accounts: &'a [AccountInfo<'a>],
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
    let master_edition = MasterEditionV1::from_account_info(master_edition_account_info)?;
    let master_metadata = Metadata::from_account_info(master_metadata_account_info)?;

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
        reservation_list_info,
        None,
    )?;
    Ok(())
}

pub fn process_deprecated_create_reservation_list(
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

pub fn process_deprecated_set_reservation_list(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    reservations: Vec<Reservation>,
    total_reservation_spots: Option<u64>,
    offset: u64,
    total_spot_offset: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let master_edition_info = next_account_info(account_info_iter)?;
    let reservation_list_info = next_account_info(account_info_iter)?;
    let resource_info = next_account_info(account_info_iter)?;

    assert_signer(resource_info)?;
    assert_owned_by(master_edition_info, program_id)?;
    assert_owned_by(reservation_list_info, program_id)?;

    let mut master_edition = MasterEditionV1::from_account_info(master_edition_info)?;

    if reservation_list_info.data_is_empty() {
        return Err(MetadataError::ReservationDoesNotExist.into());
    }

    if reservations.len() > 1 || reservations.len() == 0 {
        return Err(MetadataError::ReservationArrayShouldBeSizeOne.into());
    }

    let my_reservation = &reservations[0];

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

    if my_reservation.spots_remaining != my_reservation.total_spots {
        return Err(MetadataError::ReservationSpotsRemainingShouldMatchTotalSpotsAtStart.into());
    }

    reservation_list.set_current_reservation_spots(
        reservation_list
            .current_reservation_spots()
            .checked_add(my_reservation.total_spots)
            .ok_or(MetadataError::NumericalOverflowError)?,
    );

    reservation_list.add_reservation(my_reservation.clone(), offset, total_spot_offset)?;

    if let Some(total) = total_reservation_spots {
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

    if reservation_list.current_reservation_spots() > reservation_list.total_reservation_spots() {
        msg!("Beyond alotted address size but we're moratoriuming this due to some bad data that's been saved. Cant screw over users for 2 weeks.")
        //return Err(MetadataError::BeyondAlottedAddressSize.into());
    };

    if reservation_list.reservations().len() > MAX_RESERVATIONS {
        return Err(MetadataError::BeyondMaxAddressSize.into());
    }

    reservation_list.save(reservation_list_info)?;

    Ok(())
}

pub fn process_deprecated_mint_printing_tokens_via_token(
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
    let master_edition = MasterEditionV1::from_account_info(master_edition_info)?;
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

pub fn process_deprecated_mint_printing_tokens(
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
    let master_edition = MasterEditionV1::from_account_info(master_edition_info)?;
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
