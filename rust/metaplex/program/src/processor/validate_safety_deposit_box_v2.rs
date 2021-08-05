use {
    crate::{
        error::MetaplexError,
        state::{
            AuctionManager, AuctionManagerStatus, AuctionManagerV2, AuctionWinnerTokenTypeTracker,
            Key, OriginalAuthorityLookup, SafetyDepositConfig, Store, WinningConfigType,
            MAX_AUTHORITY_LOOKUP_SIZE, PREFIX, TOTALS,
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
pub fn make_safety_deposit_config<'a>(
    program_id: &Pubkey,
    auction_manager_info: &AccountInfo<'a>,
    safety_deposit_info: &AccountInfo<'a>,
    safety_deposit_config_info: &AccountInfo<'a>,
    payer_info: &AccountInfo<'a>,
    rent_info: &AccountInfo<'a>,
    system_info: &AccountInfo<'a>,
    safety_deposit_config: &SafetyDepositConfig,
) -> ProgramResult {
    let bump = assert_derivation(
        program_id,
        safety_deposit_config_info,
        &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            auction_manager_info.key.as_ref(),
            safety_deposit_info.key.as_ref(),
        ],
    )?;

    create_or_allocate_account_raw(
        *program_id,
        safety_deposit_config_info,
        rent_info,
        system_info,
        payer_info,
        safety_deposit_config.created_size(),
        &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            auction_manager_info.key.as_ref(),
            safety_deposit_info.key.as_ref(),
            &[bump],
        ],
    )?;

    safety_deposit_config.create(safety_deposit_config_info, auction_manager_info.key)?;

    Ok(())
}

pub struct CommonCheckArgs<'a, 'b> {
    pub program_id: &'a Pubkey,
    pub auction_manager_info: &'a AccountInfo<'a>,
    pub metadata_info: &'a AccountInfo<'a>,
    pub original_authority_lookup_info: &'a AccountInfo<'a>,
    pub whitelisted_creator_info: &'a AccountInfo<'a>,
    pub safety_deposit_info: &'a AccountInfo<'a>,
    pub safety_deposit_token_store_info: &'a AccountInfo<'a>,
    pub edition_info: &'a AccountInfo<'a>,
    pub vault_info: &'a AccountInfo<'a>,
    pub mint_info: &'a AccountInfo<'a>,
    pub token_metadata_program_info: &'a AccountInfo<'a>,
    pub auction_manager_store_info: &'a AccountInfo<'a>,
    pub authority_info: &'a AccountInfo<'a>,
    pub store: &'b Store,
    pub auction_manager: &'b dyn AuctionManager,
    pub metadata: &'b Metadata,
    pub safety_deposit: &'b SafetyDepositBox,
    pub vault: &'b Vault,
    pub winning_config_type: &'b WinningConfigType,
}

pub fn assert_common_checks(args: CommonCheckArgs) -> ProgramResult {
    let CommonCheckArgs {
        program_id,
        auction_manager_info,
        metadata_info,
        original_authority_lookup_info,
        whitelisted_creator_info,
        safety_deposit_info,
        safety_deposit_token_store_info,
        edition_info,
        vault_info,
        mint_info,
        token_metadata_program_info,
        auction_manager_store_info,
        authority_info,
        store,
        auction_manager,
        metadata,
        safety_deposit,
        vault,
        winning_config_type,
    } = args;

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

    if *winning_config_type != WinningConfigType::TokenOnlyTransfer {
        assert_owned_by(edition_info, &store.token_metadata_program)?;
    }
    assert_owned_by(vault_info, &store.token_vault_program)?;

    if *token_metadata_program_info.key != store.token_metadata_program {
        return Err(MetaplexError::AuctionManagerTokenMetadataMismatch.into());
    }

    assert_authority_correct(&auction_manager.authority(), authority_info)?;
    assert_store_safety_vault_manager_match(
        &auction_manager.vault(),
        &safety_deposit_info,
        vault_info,
        &store.token_vault_program,
    )?;
    assert_at_least_one_creator_matches_or_store_public_and_all_verified(
        program_id,
        auction_manager,
        &metadata,
        whitelisted_creator_info,
        auction_manager_store_info,
    )?;

    if auction_manager.store() != *auction_manager_store_info.key {
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

    Ok(())
}

pub struct SupplyLogicCheckArgs<'a, 'b> {
    pub program_id: &'a Pubkey,
    pub auction_manager_info: &'a AccountInfo<'a>,
    pub metadata_info: &'a AccountInfo<'a>,
    pub edition_info: &'a AccountInfo<'a>,
    pub metadata_authority_info: &'a AccountInfo<'a>,
    pub original_authority_lookup_info: &'a AccountInfo<'a>,
    pub rent_info: &'a AccountInfo<'a>,
    pub system_info: &'a AccountInfo<'a>,
    pub payer_info: &'a AccountInfo<'a>,
    pub token_metadata_program_info: &'a AccountInfo<'a>,
    pub safety_deposit_token_store_info: &'a AccountInfo<'a>,
    pub auction_manager: &'b dyn AuctionManager,
    pub winning_config_type: &'b WinningConfigType,
    pub metadata: &'b Metadata,
    pub safety_deposit: &'b SafetyDepositBox,
    pub store: &'b Store,
    pub total_amount_requested: u64,
}

pub fn assert_supply_logic_check(args: SupplyLogicCheckArgs) -> ProgramResult {
    let SupplyLogicCheckArgs {
        program_id,
        auction_manager_info,
        metadata_info,
        edition_info,
        metadata_authority_info,
        original_authority_lookup_info,
        rent_info,
        system_info,
        payer_info,
        token_metadata_program_info,
        auction_manager,
        winning_config_type,
        metadata,
        safety_deposit,
        store,
        safety_deposit_token_store_info,
        total_amount_requested,
    } = args;

    let safety_deposit_token_store: Account = assert_initialized(safety_deposit_token_store_info)?;

    let edition_seeds = &[
        spl_token_metadata::state::PREFIX.as_bytes(),
        store.token_metadata_program.as_ref(),
        &metadata.mint.as_ref(),
        spl_token_metadata::state::EDITION.as_bytes(),
    ];

    let (edition_key, _) =
        Pubkey::find_program_address(edition_seeds, &store.token_metadata_program);

    let auction_key = auction_manager.auction();
    let seeds = &[PREFIX.as_bytes(), auction_key.as_ref()];
    let (_, bump_seed) = Pubkey::find_program_address(seeds, &program_id);
    let authority_seeds = &[PREFIX.as_bytes(), auction_key.as_ref(), &[bump_seed]];
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

            if total_amount_requested != 1 {
                return Err(MetaplexError::NotEnoughTokensToSupplyWinners.into());
            }

            let auction_key = auction_manager.auction();

            let original_authority_lookup_seeds = &[
                PREFIX.as_bytes(),
                auction_key.as_ref(),
                metadata_info.key.as_ref(),
            ];

            let (expected_key, original_bump_seed) =
                Pubkey::find_program_address(original_authority_lookup_seeds, &program_id);
            let original_authority_seeds = &[
                PREFIX.as_bytes(),
                auction_key.as_ref(),
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
        WinningConfigType::Participation => {
            // Impossible to use a MEV1 through this avenue of participation...no one time auth token allowed here...
            // If you wish to use those, you must use the AuctionManagerV1 pathway which allows use of the older endpoints,
            // which will classify Participation as a PrintingV2 if it's an MEv2 or use the validate_participation endpoint
            // if it's an MEv1.
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

            if master_edition.max_supply.is_some() {
                return Err(
                    MetaplexError::CantUseLimitedSupplyEditionsWithOpenEditionAuction.into(),
                );
            }
        }
    }

    Ok(())
}

pub fn process_validate_safety_deposit_box_v2<'a>(
    program_id: &'a Pubkey,
    accounts: &'a [AccountInfo<'a>],
    safety_deposit_config: SafetyDepositConfig,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let safety_deposit_config_info = next_account_info(account_info_iter)?;
    let auction_token_tracker_info = next_account_info(account_info_iter)?;
    let mut auction_manager_info = next_account_info(account_info_iter)?;
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

    if !safety_deposit_config_info.data_is_empty() {
        return Err(MetaplexError::AlreadyValidated.into());
    }

    assert_derivation(
        program_id,
        auction_token_tracker_info,
        &[
            PREFIX.as_bytes(),
            &program_id.as_ref(),
            auction_manager_info.key.as_ref(),
            TOTALS.as_bytes(),
        ],
    )?;

    let mut auction_manager = AuctionManagerV2::from_account_info(auction_manager_info)?;
    let mut auction_token_tracker: AuctionWinnerTokenTypeTracker =
        AuctionWinnerTokenTypeTracker::from_account_info(auction_token_tracker_info)?;
    let safety_deposit = SafetyDepositBox::from_account_info(safety_deposit_info)?;
    let metadata = Metadata::from_account_info(metadata_info)?;
    let store = Store::from_account_info(auction_manager_store_info)?;
    // Is it a real vault?
    let vault = Vault::from_account_info(vault_info)?;

    assert_common_checks(CommonCheckArgs {
        program_id,
        auction_manager_info,
        metadata_info,
        original_authority_lookup_info,
        whitelisted_creator_info,
        safety_deposit_info,
        safety_deposit_token_store_info,
        edition_info,
        vault_info,
        mint_info,
        token_metadata_program_info,
        auction_manager_store_info,
        authority_info,
        store: &store,
        auction_manager: &auction_manager,
        metadata: &metadata,
        safety_deposit: &safety_deposit,
        vault: &vault,
        winning_config_type: &safety_deposit_config.winning_config_type,
    })?;

    let total_amount_requested = safety_deposit_config
        .amount_ranges
        .iter()
        .map(|t| t.0 * t.1)
        .sum();

    assert_supply_logic_check(SupplyLogicCheckArgs {
        program_id,
        auction_manager_info,
        metadata_info,
        edition_info,
        metadata_authority_info,
        original_authority_lookup_info,
        rent_info,
        system_info,
        payer_info,
        token_metadata_program_info,
        auction_manager: &auction_manager,
        winning_config_type: &safety_deposit_config.winning_config_type,
        metadata: &metadata,
        safety_deposit: &safety_deposit,
        store: &store,
        safety_deposit_token_store_info,
        total_amount_requested,
    })?;

    if safety_deposit_config.order != safety_deposit.order as u64 {
        return Err(MetaplexError::SafetyDepositConfigOrderMismatch.into());
    }

    if safety_deposit_config.winning_config_type == WinningConfigType::PrintingV1 {
        return Err(MetaplexError::PrintingV1NotAllowedWithAuctionManagerV2.into());
    }

    if safety_deposit_config.winning_config_type != WinningConfigType::Participation
        && (safety_deposit_config.participation_config.is_some()
            || safety_deposit_config.participation_state.is_some())
    {
        return Err(MetaplexError::InvalidOperation.into());
    }

    if safety_deposit_config.winning_config_type == WinningConfigType::Participation {
        if auction_manager.state.has_participation {
            return Err(MetaplexError::AlreadyHasOneParticipationPrize.into());
        } else {
            auction_manager.state.has_participation = true;
        }
    }

    auction_manager.state.safety_config_items_validated = auction_manager
        .state
        .safety_config_items_validated
        .checked_add(1)
        .ok_or(MetaplexError::NumericalOverflowError)?;

    if auction_manager.state.safety_config_items_validated == vault.token_type_count as u64 {
        auction_manager.state.status = AuctionManagerStatus::Validated
    }

    auction_manager.save(&mut auction_manager_info)?;

    if safety_deposit_config.winning_config_type != WinningConfigType::Participation {
        auction_token_tracker.add_one_where_positive_ranges_occur(
            &mut safety_deposit_config.amount_ranges.clone(),
        )?;
        auction_token_tracker.save(auction_token_tracker_info);
    }

    make_safety_deposit_config(
        program_id,
        auction_manager_info,
        safety_deposit_info,
        safety_deposit_config_info,
        payer_info,
        rent_info,
        system_info,
        &safety_deposit_config,
    )?;
    Ok(())
}
