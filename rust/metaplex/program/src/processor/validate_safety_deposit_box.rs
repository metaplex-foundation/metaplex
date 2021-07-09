use {
    crate::{
        error::MetaplexError,
        state::{
            AuctionManager, AuctionManagerStatus, Key, OriginalAuthorityLookup, ParticipationState,
            SafetyDepositValidationTicket, Store, WinningConfigType, MAX_AUTHORITY_LOOKUP_SIZE,
            MAX_VALIDATION_TICKET_SIZE, PREFIX,
        },
        utils::{
            assert_at_least_one_creator_matches_or_store_public_and_all_verified,
            assert_authority_correct, assert_derivation, assert_initialized, assert_owned_by,
            assert_store_safety_vault_manager_match, create_or_allocate_account_raw,
            transfer_metadata_ownership,
        },
    },
    borsh::BorshSerialize,
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        entrypoint::ProgramResult,
        pubkey::Pubkey,
    },
    spl_token::state::{Account, Mint},
    spl_token_metadata::{
        state::{MasterEditionV1, MasterEditionV2, Metadata},
        utils::assert_update_authority_is_correct,
    },
    spl_token_vault::state::{SafetyDepositBox, Vault},
};
pub fn make_safety_deposit_validation<'a>(
    program_id: &Pubkey,
    auction_manager_info: &AccountInfo<'a>,
    safety_deposit_info: &AccountInfo<'a>,
    safety_deposit_validation_ticket_info: &AccountInfo<'a>,
    payer_info: &AccountInfo<'a>,
    rent_info: &AccountInfo<'a>,
    system_info: &AccountInfo<'a>,
) -> ProgramResult {
    let bump = assert_derivation(
        program_id,
        safety_deposit_validation_ticket_info,
        &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            auction_manager_info.key.as_ref(),
            safety_deposit_info.key.as_ref(),
        ],
    )?;

    create_or_allocate_account_raw(
        *program_id,
        safety_deposit_validation_ticket_info,
        rent_info,
        system_info,
        payer_info,
        MAX_VALIDATION_TICKET_SIZE,
        &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            auction_manager_info.key.as_ref(),
            safety_deposit_info.key.as_ref(),
            &[bump],
        ],
    )?;

    let mut validation =
        SafetyDepositValidationTicket::from_account_info(safety_deposit_validation_ticket_info)?;
    validation.key = Key::SafetyDepositValidationTicketV1;
    validation.address = *safety_deposit_info.key;
    validation.serialize(&mut *safety_deposit_validation_ticket_info.data.borrow_mut())?;

    Ok(())
}

pub fn process_validate_safety_deposit_box(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let safety_deposit_validation_ticket_info = next_account_info(account_info_iter)?;
    let auction_manager_info = next_account_info(account_info_iter)?;
    let metadata_info = next_account_info(account_info_iter)?;
    let original_authority_lookup_info = next_account_info(account_info_iter)?;
    let whitelisted_creator_info = next_account_info(account_info_iter)?;
    let auction_manager_store_info = next_account_info(account_info_iter)?;
    let safety_deposit_info = next_account_info(account_info_iter)?;
    let safety_deposit_token_store_info = next_account_info(account_info_iter)?;
    let mint_info = next_account_info(account_info_iter)?;
    let edition_info = next_account_info(account_info_iter)?;
    let vault_info = next_account_info(account_info_iter)?;
    let authority_info = next_account_info(account_info_iter)?;
    let metadata_authority_info = next_account_info(account_info_iter)?;
    let payer_info = next_account_info(account_info_iter)?;
    let token_metadata_program_info = next_account_info(account_info_iter)?;
    let system_info = next_account_info(account_info_iter)?;
    let rent_info = next_account_info(account_info_iter)?;

    if !safety_deposit_validation_ticket_info.data_is_empty() {
        return Err(MetaplexError::AlreadyValidated.into());
    }

    let mut auction_manager = AuctionManager::from_account_info(auction_manager_info)?;
    let safety_deposit = SafetyDepositBox::from_account_info(safety_deposit_info)?;
    let safety_deposit_token_store: Account = assert_initialized(safety_deposit_token_store_info)?;
    let metadata = Metadata::from_account_info(metadata_info)?;
    let store = Store::from_account_info(auction_manager_store_info)?;
    // Is it a real vault?
    let vault = Vault::from_account_info(vault_info)?;
    // Is it a real mint?
    let _mint: Mint = assert_initialized(mint_info)?;

    if vault.authority != *auction_manager_info.key {
        return Err(MetaplexError::VaultAuthorityMismatch.into());
    }

    assert_owned_by(auction_manager_info, program_id)?;
    assert_owned_by(metadata_info, &store.token_metadata_program)?;
    if !original_authority_lookup_info.data_is_empty() {
        return Err(MetaplexError::AlreadyInitialized.into());
    }

    if *whitelisted_creator_info.key != solana_program::system_program::id() {
        if whitelisted_creator_info.data_is_empty() {
            return Err(MetaplexError::Uninitialized.into());
        }
        assert_owned_by(whitelisted_creator_info, program_id)?;
    }

    assert_owned_by(auction_manager_store_info, program_id)?;
    assert_owned_by(safety_deposit_info, &store.token_vault_program)?;
    assert_owned_by(safety_deposit_token_store_info, &store.token_program)?;
    assert_owned_by(mint_info, &store.token_program)?;
    assert_owned_by(edition_info, &store.token_metadata_program)?;
    assert_owned_by(vault_info, &store.token_vault_program)?;

    if *token_metadata_program_info.key != store.token_metadata_program {
        return Err(MetaplexError::AuctionManagerTokenMetadataMismatch.into());
    }

    assert_authority_correct(&auction_manager, authority_info)?;
    assert_store_safety_vault_manager_match(
        &auction_manager,
        &safety_deposit_info,
        vault_info,
        &store.token_vault_program,
    )?;
    assert_at_least_one_creator_matches_or_store_public_and_all_verified(
        program_id,
        &auction_manager,
        &metadata,
        whitelisted_creator_info,
        auction_manager_store_info,
    )?;

    if auction_manager.store != *auction_manager_store_info.key {
        return Err(MetaplexError::AuctionManagerStoreMismatch.into());
    }

    if *mint_info.key != safety_deposit.token_mint {
        return Err(MetaplexError::SafetyDepositBoxMintMismatch.into());
    }

    if *token_metadata_program_info.key != store.token_metadata_program {
        return Err(MetaplexError::AuctionManagerTokenMetadataProgramMismatch.into());
    }

    // We want to ensure that the mint you are using with this token is one
    // we can actually transfer to and from using our token program invocations, which
    // we can check by asserting ownership by the token program we recorded in init.
    if *mint_info.owner != store.token_program {
        return Err(MetaplexError::TokenProgramMismatch.into());
    }

    let mut total_amount_requested: u64 = 0;
    // At this point we know we have at least one config and they may have different amounts but all
    // point at the same safety deposit box and so have the same winning config type.
    // We default to TokenOnlyTransfer but this will get set by the loop.
    let mut winning_config_type: WinningConfigType = WinningConfigType::TokenOnlyTransfer;
    let mut winning_config_items_validated: u8 = 0;
    let mut all_winning_config_items: u8 = 0;

    for i in 0..auction_manager.settings.winning_configs.len() {
        let possible_config = &auction_manager.settings.winning_configs[i];

        for j in 0..possible_config.items.len() {
            let possible_item = &possible_config.items[j];
            all_winning_config_items = all_winning_config_items
                .checked_add(1)
                .ok_or(MetaplexError::NumericalOverflowError)?;

            if possible_item.safety_deposit_box_index == safety_deposit.order {
                winning_config_type = possible_item.winning_config_type;

                winning_config_items_validated = winning_config_items_validated
                    .checked_add(1)
                    .ok_or(MetaplexError::NumericalOverflowError)?;

                // Build array to sum total amount
                total_amount_requested = total_amount_requested
                    .checked_add(possible_item.amount.into())
                    .ok_or(MetaplexError::NumericalOverflowError)?;
                // Record that primary sale happened at time of validation for later royalties reconcilation
                auction_manager.state.winning_config_states[i].items[j].primary_sale_happened =
                    metadata.primary_sale_happened;
            }
        }
    }

    if let Some(participation_config) = &auction_manager.settings.participation_config {
        if participation_config.safety_deposit_box_index == safety_deposit.order {
            // Really it's unknown how many prints will be made
            // but we set it to 1 since that's how many master edition tokens are in there.
            total_amount_requested = total_amount_requested
                .checked_add(1)
                .ok_or(MetaplexError::NumericalOverflowError)?;

            // now that participation configs can be validated through normal safety deposit endpoints, need to flip this boolean
            // here too, until we can deprecate it later.
            if let Some(state) = &auction_manager.state.participation_state {
                auction_manager.state.participation_state = Some(ParticipationState {
                    collected_to_accept_payment: state.collected_to_accept_payment,
                    primary_sale_happened: state.primary_sale_happened,
                    validated: true,
                    printing_authorization_token_account: state
                        .printing_authorization_token_account,
                })
            }
        }
    }

    if total_amount_requested == 0 {
        return Err(MetaplexError::SafetyDepositBoxNotUsedInAuction.into());
    }

    let edition_seeds = &[
        spl_token_metadata::state::PREFIX.as_bytes(),
        store.token_metadata_program.as_ref(),
        &metadata.mint.as_ref(),
        spl_token_metadata::state::EDITION.as_bytes(),
    ];

    let (edition_key, _) =
        Pubkey::find_program_address(edition_seeds, &store.token_metadata_program);

    let seeds = &[PREFIX.as_bytes(), &auction_manager.auction.as_ref()];
    let (_, bump_seed) = Pubkey::find_program_address(seeds, &program_id);
    let authority_seeds = &[
        PREFIX.as_bytes(),
        &auction_manager.auction.as_ref(),
        &[bump_seed],
    ];

    // Supply logic check
    match winning_config_type {
        WinningConfigType::FullRightsTransfer => {
            assert_update_authority_is_correct(&metadata, metadata_authority_info)?;

            if safety_deposit.token_mint != metadata.mint {
                return Err(MetaplexError::SafetyDepositBoxMetadataMismatch.into());
            }
            if edition_key != *edition_info.key {
                return Err(MetaplexError::InvalidEditionAddress.into());
            }

            if safety_deposit_token_store.amount != 1 {
                return Err(MetaplexError::StoreIsEmpty.into());
            }

            let original_authority_lookup_seeds = &[
                PREFIX.as_bytes(),
                &auction_manager.auction.as_ref(),
                metadata_info.key.as_ref(),
            ];

            let (expected_key, original_bump_seed) =
                Pubkey::find_program_address(original_authority_lookup_seeds, &program_id);
            let original_authority_seeds = &[
                PREFIX.as_bytes(),
                &auction_manager.auction.as_ref(),
                metadata_info.key.as_ref(),
                &[original_bump_seed],
            ];

            if expected_key != *original_authority_lookup_info.key {
                return Err(MetaplexError::OriginalAuthorityLookupKeyMismatch.into());
            }

            // We may need to transfer authority back, or to the new owner, so we need to keep track
            // of original ownership
            create_or_allocate_account_raw(
                *program_id,
                original_authority_lookup_info,
                rent_info,
                system_info,
                payer_info,
                MAX_AUTHORITY_LOOKUP_SIZE,
                original_authority_seeds,
            )?;

            let mut original_authority_lookup =
                OriginalAuthorityLookup::from_account_info(original_authority_lookup_info)?;
            original_authority_lookup.key = Key::OriginalAuthorityLookupV1;

            original_authority_lookup.original_authority = *metadata_authority_info.key;

            transfer_metadata_ownership(
                token_metadata_program_info.clone(),
                metadata_info.clone(),
                metadata_authority_info.clone(),
                auction_manager_info.clone(),
                authority_seeds,
            )?;

            original_authority_lookup
                .serialize(&mut *original_authority_lookup_info.data.borrow_mut())?;
        }
        WinningConfigType::TokenOnlyTransfer => {
            if safety_deposit.token_mint != metadata.mint {
                return Err(MetaplexError::SafetyDepositBoxMetadataMismatch.into());
            }
            if safety_deposit_token_store.amount < total_amount_requested {
                return Err(MetaplexError::NotEnoughTokensToSupplyWinners.into());
            }
        }
        WinningConfigType::PrintingV1 => {
            if edition_key != *edition_info.key {
                return Err(MetaplexError::InvalidEditionAddress.into());
            }
            let master_edition = MasterEditionV1::from_account_info(edition_info)?;
            if safety_deposit.token_mint != master_edition.printing_mint {
                return Err(MetaplexError::SafetyDepositBoxMasterMintMismatch.into());
            }

            if safety_deposit_token_store.amount != total_amount_requested {
                return Err(MetaplexError::NotEnoughTokensToSupplyWinners.into());
            }
        }
        WinningConfigType::PrintingV2 => {
            if edition_key != *edition_info.key {
                return Err(MetaplexError::InvalidEditionAddress.into());
            }
            let master_edition = MasterEditionV2::from_account_info(edition_info)?;
            if safety_deposit.token_mint != metadata.mint {
                return Err(MetaplexError::SafetyDepositBoxMetadataMismatch.into());
            }

            if safety_deposit_token_store.amount != 1 {
                return Err(MetaplexError::NotEnoughTokensToSupplyWinners.into());
            }

            if let Some(max) = master_edition.max_supply {
                let amount_available = max
                    .checked_sub(master_edition.supply)
                    .ok_or(MetaplexError::NumericalOverflowError)?;
                if amount_available < total_amount_requested {
                    return Err(MetaplexError::NotEnoughTokensToSupplyWinners.into());
                }
            }
        }
    }

    auction_manager.state.winning_config_items_validated = match auction_manager
        .state
        .winning_config_items_validated
        .checked_add(winning_config_items_validated)
    {
        Some(val) => val,
        None => return Err(MetaplexError::NumericalOverflowError.into()),
    };

    if auction_manager.state.winning_config_items_validated == all_winning_config_items {
        let mut participation_okay = true;
        if let Some(state) = &auction_manager.state.participation_state {
            participation_okay = state.validated
        }
        if participation_okay {
            auction_manager.state.status = AuctionManagerStatus::Validated
        }
    }

    auction_manager.serialize(&mut *auction_manager_info.data.borrow_mut())?;

    make_safety_deposit_validation(
        program_id,
        auction_manager_info,
        safety_deposit_info,
        safety_deposit_validation_ticket_info,
        payer_info,
        rent_info,
        system_info,
    )?;

    Ok(())
}
