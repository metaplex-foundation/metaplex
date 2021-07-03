use {
    crate::{
        deprecated_processor::{
            process_deprecated_create_master_edition, process_deprecated_create_reservation_list,
            process_deprecated_mint_new_edition_from_master_edition_via_printing_token,
            process_deprecated_mint_printing_tokens,
            process_deprecated_mint_printing_tokens_via_token,
            process_deprecated_set_reservation_list,
        },
        error::MetadataError,
        instruction::MetadataInstruction,
        state::{
            Data, EditionMarker, Key, MasterEditionV1, MasterEditionV2, Metadata, EDITION,
            MAX_MASTER_EDITION_LEN, MAX_METADATA_LEN, PREFIX,
        },
        utils::{
            assert_data_valid, assert_derivation, assert_initialized,
            assert_mint_authority_matches_mint, assert_owned_by, assert_signer,
            assert_token_program_matches_package, assert_update_authority_is_correct,
            create_or_allocate_account_raw, mint_limited_edition, transfer_mint_authority,
        },
    },
    borsh::{BorshDeserialize, BorshSerialize},
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        entrypoint::ProgramResult,
        msg,
        program_error::ProgramError,
        pubkey::Pubkey,
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
        MetadataInstruction::DeprecatedCreateMasterEdition(args) => {
            msg!("Instruction: Deprecated Create Master Edition");
            process_deprecated_create_master_edition(program_id, accounts, args.max_supply)
        }
        MetadataInstruction::DeprecatedMintNewEditionFromMasterEditionViaPrintingToken => {
            msg!("Instruction: Deprecated Mint New Edition from Master Edition Via Token");
            process_deprecated_mint_new_edition_from_master_edition_via_printing_token(
                program_id, accounts,
            )
        }
        MetadataInstruction::UpdatePrimarySaleHappenedViaToken => {
            msg!("Instruction: Update primary sale via token");
            process_update_primary_sale_happened_via_token(program_id, accounts)
        }
        MetadataInstruction::DeprecatedSetReservationList(args) => {
            msg!("Instruction: Deprecated Set Reservation List");
            process_deprecated_set_reservation_list(
                program_id,
                accounts,
                args.reservations,
                args.total_reservation_spots,
                args.offset,
                args.total_spot_offset,
            )
        }
        MetadataInstruction::DeprecatedCreateReservationList => {
            msg!("Instruction: Deprecated Create Reservation List");
            process_deprecated_create_reservation_list(program_id, accounts)
        }
        MetadataInstruction::SignMetadata => {
            msg!("Instruction: Sign Metadata");
            process_sign_metadata(program_id, accounts)
        }
        MetadataInstruction::DeprecatedMintPrintingTokensViaToken(args) => {
            msg!("Instruction: Deprecated Mint Printing Tokens Via Token");
            process_deprecated_mint_printing_tokens_via_token(program_id, accounts, args.supply)
        }
        MetadataInstruction::DeprecatedMintPrintingTokens(args) => {
            msg!("Instruction: Deprecated Mint Printing Tokens");
            process_deprecated_mint_printing_tokens(program_id, accounts, args.supply)
        }
        MetadataInstruction::CreateMasterEdition(args) => {
            msg!("Instruction: Create Master Edition");
            process_create_master_edition(program_id, accounts, args.max_supply)
        }
        MetadataInstruction::MintNewEditionFromMasterEditionViaToken(args) => {
            msg!("Instruction: Create Master Edition");
            process_mint_new_edition_from_master_edition_via_token(
                program_id,
                accounts,
                args.edition,
            )
        }
        MetadataInstruction::ConvertMasterEditionV1ToV2 => {
            msg!("Instruction: Convert Master Edition V1 to V2");
            process_convert_master_edition_v1_to_v2(program_id, accounts)
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

/// Create master edition
pub fn process_create_master_edition(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    max_supply: Option<u64>,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let edition_account_info = next_account_info(account_info_iter)?;
    let mint_info = next_account_info(account_info_iter)?;
    let update_authority_info = next_account_info(account_info_iter)?;
    let mint_authority_info = next_account_info(account_info_iter)?;
    let payer_account_info = next_account_info(account_info_iter)?;
    let metadata_account_info = next_account_info(account_info_iter)?;
    let token_program_info = next_account_info(account_info_iter)?;
    let system_account_info = next_account_info(account_info_iter)?;
    let rent_info = next_account_info(account_info_iter)?;

    let metadata = Metadata::from_account_info(metadata_account_info)?;
    let mint: Mint = assert_initialized(mint_info)?;

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
    assert_owned_by(metadata_account_info, program_id)?;
    assert_owned_by(mint_info, &spl_token::id())?;

    if metadata.mint != *mint_info.key {
        return Err(MetadataError::MintMismatch.into());
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

    let mut edition = MasterEditionV2::from_account_info(edition_account_info)?;

    edition.key = Key::MasterEditionV2;
    edition.supply = 0;
    edition.max_supply = max_supply;
    edition.serialize(&mut *edition_account_info.data.borrow_mut())?;

    // While you can't mint any more of your master record, you can
    // mint as many limited editions as you like within your max supply.
    transfer_mint_authority(
        edition_account_info.key,
        edition_account_info,
        mint_info,
        mint_authority_info,
        token_program_info,
    )?;

    Ok(())
}

pub fn process_mint_new_edition_from_master_edition_via_token(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    edition: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let new_metadata_account_info = next_account_info(account_info_iter)?;
    let new_edition_account_info = next_account_info(account_info_iter)?;
    let master_edition_account_info = next_account_info(account_info_iter)?;
    let mint_info = next_account_info(account_info_iter)?;
    let edition_marker_info = next_account_info(account_info_iter)?;
    let mint_authority_info = next_account_info(account_info_iter)?;
    let payer_account_info = next_account_info(account_info_iter)?;
    let owner_account_info = next_account_info(account_info_iter)?;
    let token_account_info = next_account_info(account_info_iter)?;
    let update_authority_info = next_account_info(account_info_iter)?;
    let master_metadata_account_info = next_account_info(account_info_iter)?;
    let token_program_account_info = next_account_info(account_info_iter)?;
    let system_account_info = next_account_info(account_info_iter)?;
    let rent_info = next_account_info(account_info_iter)?;

    assert_token_program_matches_package(token_program_account_info)?;
    assert_owned_by(mint_info, &spl_token::id())?;
    assert_owned_by(token_account_info, &spl_token::id())?;
    assert_signer(owner_account_info)?;

    if !new_metadata_account_info.data_is_empty() {
        return Err(MetadataError::AlreadyInitialized.into());
    }

    if !new_edition_account_info.data_is_empty() {
        return Err(MetadataError::AlreadyInitialized.into());
    }

    assert_owned_by(master_edition_account_info, program_id)?;
    assert_owned_by(master_metadata_account_info, program_id)?;

    let token_account: Account = assert_initialized(token_account_info)?;
    let master_metadata = Metadata::from_account_info(master_metadata_account_info)?;

    if token_account.mint != master_metadata.mint {
        return Err(MetadataError::TokenAccountMintMismatchV2.into());
    }

    if token_account.owner != *owner_account_info.key {
        return Err(MetadataError::InvalidOwner.into());
    }

    if token_account.amount < 1 {
        return Err(MetadataError::NotEnoughTokens.into());
    }

    let as_string = edition.to_string();

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
            1,
            seeds,
        )?;
    }

    let mut edition_marker = EditionMarker::from_account_info(edition_marker_info)?;
    edition_marker.key = Key::EditionMarker;
    if edition_marker.edition_taken(edition)? {
        return Err(MetadataError::InvalidEditionKey.into());
    } else {
        edition_marker.insert_edition(edition)?
    }
    edition_marker.serialize(&mut *edition_marker_info.data.borrow_mut())?;

    mint_limited_edition(
        program_id,
        &master_metadata,
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

pub fn process_convert_master_edition_v1_to_v2(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let master_edition_info = next_account_info(account_info_iter)?;
    let one_time_printing_auth_mint_info = next_account_info(account_info_iter)?;
    let printing_mint_info = next_account_info(account_info_iter)?;

    assert_owned_by(master_edition_info, program_id)?;
    assert_owned_by(one_time_printing_auth_mint_info, &spl_token::id())?;
    assert_owned_by(printing_mint_info, &spl_token::id())?;

    let master_edition: MasterEditionV1 = MasterEditionV1::from_account_info(master_edition_info)?;
    let printing_mint: Account = assert_initialized(printing_mint_info)?;
    let auth_mint: Account = assert_initialized(one_time_printing_auth_mint_info)?;

    if master_edition.one_time_printing_authorization_mint != *one_time_printing_auth_mint_info.key
    {
        return Err(MetadataError::OneTimePrintingAuthMintMismatch.into());
    }

    if master_edition.printing_mint != *printing_mint_info.key {
        return Err(MetadataError::PrintingMintMismatch.into());
    }

    if printing_mint.amount != 0 {
        return Err(MetadataError::PrintingMintSupplyMustBeZeroForConversion.into());
    }

    if auth_mint.amount != 0 {
        return Err(MetadataError::OneTimeAuthMintSupplyMustBeZeroForConversion.into());
    }

    MasterEditionV2 {
        key: Key::MasterEditionV2,
        supply: master_edition.supply,
        max_supply: master_edition.max_supply,
    }
    .serialize(&mut *master_edition_info.data.borrow_mut())?;

    Ok(())
}
