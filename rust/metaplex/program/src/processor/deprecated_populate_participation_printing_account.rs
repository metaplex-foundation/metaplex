use {
    crate::{
        deprecated_state::{AuctionManagerV1, ParticipationConfigV1},
        error::MetaplexError,
        state::{NonWinningConstraint, Store, WinningConstraint, PREFIX},
        utils::{
            assert_derivation, assert_initialized, assert_owned_by,
            assert_store_safety_vault_manager_match, transfer_safety_deposit_box_items,
        },
    },
    metaplex_auction::processor::{AuctionData, AuctionDataExtended, AuctionState},
    metaplex_token_metadata::{
        deprecated_instruction::deprecated_mint_printing_tokens_via_token, state::MasterEditionV1,
    },
    metaplex_token_vault::state::SafetyDepositBox,
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        entrypoint::ProgramResult,
        program::invoke_signed,
        pubkey::Pubkey,
    },
    spl_token::{instruction::close_account, state::Account},
};

fn mint_printing_tokens<'a: 'b, 'b>(
    program: &AccountInfo<'a>,
    destination: &AccountInfo<'a>,
    token: &AccountInfo<'a>,
    one_time_printing_authorization_mint: &AccountInfo<'a>,
    printing_mint: &AccountInfo<'a>,
    burn_authority: &AccountInfo<'a>,
    metadata: &AccountInfo<'a>,
    master_edition: &AccountInfo<'a>,
    token_program_info: &AccountInfo<'a>,
    rent_info: &AccountInfo<'a>,
    supply: u64,
    authority_signer_seeds: &'b [&'b [u8]],
) -> ProgramResult {
    let result = invoke_signed(
        &deprecated_mint_printing_tokens_via_token(
            *program.key,
            *destination.key,
            *token.key,
            *one_time_printing_authorization_mint.key,
            *printing_mint.key,
            *burn_authority.key,
            *metadata.key,
            *master_edition.key,
            supply,
        ),
        &[
            program.clone(),
            destination.clone(),
            token.clone(),
            one_time_printing_authorization_mint.clone(),
            printing_mint.clone(),
            burn_authority.clone(),
            master_edition.clone(),
            metadata.clone(),
            token_program_info.clone(),
            rent_info.clone(),
        ],
        &[authority_signer_seeds],
    );

    result.map_err(|_| MetaplexError::PrintingAuthorizationTokensFailed.into())
}

#[allow(clippy::unnecessary_cast)]
#[allow(clippy::absurd_extreme_comparisons)]
pub fn process_deprecated_populate_participation_printing_account<'a>(
    program_id: &'a Pubkey,
    accounts: &'a [AccountInfo<'a>],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let safety_deposit_token_store_info = next_account_info(account_info_iter)?;
    let transient_one_time_holding_info = next_account_info(account_info_iter)?;
    let participation_printing_holding_account_info = next_account_info(account_info_iter)?;
    let one_time_printing_authorization_mint_info = next_account_info(account_info_iter)?;
    let printing_mint_info = next_account_info(account_info_iter)?;
    let safety_deposit_info = next_account_info(account_info_iter)?;
    let vault_info = next_account_info(account_info_iter)?;
    let fraction_mint_info = next_account_info(account_info_iter)?;
    let auction_info = next_account_info(account_info_iter)?;
    let auction_extended_info = next_account_info(account_info_iter)?;
    let auction_manager_info = next_account_info(account_info_iter)?;
    let token_program_info = next_account_info(account_info_iter)?;
    let token_vault_program_info = next_account_info(account_info_iter)?;
    let token_metadata_program_info = next_account_info(account_info_iter)?;
    let store_info = next_account_info(account_info_iter)?;
    let master_edition_info = next_account_info(account_info_iter)?;
    let metadata_info = next_account_info(account_info_iter)?;
    let transfer_authority_info = next_account_info(account_info_iter)?;
    let payer_info = next_account_info(account_info_iter)?;
    let rent_info = next_account_info(account_info_iter)?;

    let auction_manager = AuctionManagerV1::from_account_info(auction_manager_info)?;
    let safety_deposit = SafetyDepositBox::from_account_info(safety_deposit_info)?;
    let safety_deposit_token_store: Account = assert_initialized(&safety_deposit_token_store_info)?;
    let auction = AuctionData::from_account_info(auction_info)?;
    let auction_extended = AuctionDataExtended::from_account_info(auction_extended_info)?;
    let master_edition = MasterEditionV1::from_account_info(master_edition_info)?;
    let transient_one_time_auth_holding_account: Account =
        assert_initialized(transient_one_time_holding_info)?;
    let participation_printing_account: Account =
        assert_initialized(participation_printing_holding_account_info)?;
    let store = Store::from_account_info(store_info)?;

    let config: &ParticipationConfigV1;
    if let Some(part_config) = &auction_manager.settings.participation_config {
        config = part_config
    } else {
        return Err(MetaplexError::NotEligibleForParticipation.into());
    }

    if auction_manager.auction != *auction_info.key {
        return Err(MetaplexError::AuctionManagerAuctionMismatch.into());
    }

    if auction.state != AuctionState::Ended {
        return Err(MetaplexError::AuctionHasNotEnded.into());
    }

    assert_store_safety_vault_manager_match(
        &auction_manager.authority,
        &safety_deposit_info,
        &vault_info,
        &store.token_vault_program,
    )?;

    assert_owned_by(transient_one_time_holding_info, token_program_info.key)?;
    assert_owned_by(safety_deposit_token_store_info, token_program_info.key)?;
    assert_owned_by(
        participation_printing_holding_account_info,
        token_program_info.key,
    )?;
    assert_owned_by(
        one_time_printing_authorization_mint_info,
        token_program_info.key,
    )?;
    assert_owned_by(printing_mint_info, token_program_info.key)?;
    assert_owned_by(safety_deposit_info, &store.token_vault_program)?;
    assert_owned_by(vault_info, &store.token_vault_program)?;
    assert_owned_by(fraction_mint_info, token_program_info.key)?;
    assert_owned_by(auction_info, &store.auction_program)?;
    assert_owned_by(auction_extended_info, &store.auction_program)?;
    assert_owned_by(auction_manager_info, program_id)?;
    assert_owned_by(store_info, program_id)?;
    assert_owned_by(master_edition_info, &store.token_metadata_program)?;
    assert_owned_by(metadata_info, &store.token_metadata_program)?;

    if transient_one_time_auth_holding_account.owner != *auction_manager_info.key {
        return Err(MetaplexError::IncorrectOwner.into());
    }

    if transient_one_time_auth_holding_account.mint
        != master_edition.one_time_printing_authorization_mint
    {
        return Err(MetaplexError::TransientAuthAccountMintMismatch.into());
    }

    if store.token_program != *token_program_info.key {
        return Err(MetaplexError::TokenProgramMismatch.into());
    }

    if store.token_vault_program != *token_vault_program_info.key {
        return Err(MetaplexError::TokenProgramMismatch.into());
    }

    if store.token_metadata_program != *token_metadata_program_info.key {
        return Err(MetaplexError::TokenProgramMismatch.into());
    }

    if master_edition.one_time_printing_authorization_mint != safety_deposit.token_mint {
        return Err(MetaplexError::SafetyDepositBoxMasterEditionOneTimeAuthMintMismatch.into());
    }

    if master_edition.one_time_printing_authorization_mint
        != *one_time_printing_authorization_mint_info.key
    {
        return Err(MetaplexError::MasterEditionOneTimeAuthMintMismatch.into());
    }

    if master_edition.printing_mint != *printing_mint_info.key {
        return Err(MetaplexError::MasterEditionMintMismatch.into());
    }

    if let Some(state) = &auction_manager.state.participation_state {
        if let Some(token) = state.printing_authorization_token_account {
            if *participation_printing_holding_account_info.key != token {
                return Err(MetaplexError::PrintingAuthorizationTokenAccountMismatch.into());
            }
        }
    }

    assert_derivation(
        &store.auction_program,
        auction_extended_info,
        &[
            metaplex_auction::PREFIX.as_bytes(),
            store.auction_program.as_ref(),
            vault_info.key.as_ref(),
            metaplex_auction::EXTENDED.as_bytes(),
        ],
    )?;

    if participation_printing_account.amount == 0 && safety_deposit_token_store.amount > 0 {
        let auction_bump_seed = assert_derivation(
            program_id,
            auction_manager_info,
            &[PREFIX.as_bytes(), &auction_manager.auction.as_ref()],
        )?;

        let auction_auth_seeds = &[
            PREFIX.as_bytes(),
            &auction_manager.auction.as_ref(),
            &[auction_bump_seed],
        ];

        transfer_safety_deposit_box_items(
            token_vault_program_info.clone(),
            transient_one_time_holding_info.clone(),
            safety_deposit_info.clone(),
            safety_deposit_token_store_info.clone(),
            vault_info.clone(),
            fraction_mint_info.clone(),
            auction_manager_info.clone(),
            transfer_authority_info.clone(),
            rent_info.clone(),
            1,
            auction_auth_seeds,
        )?;

        let mut amount_to_mint = auction_extended.total_uncancelled_bids;
        if config.winner_constraint == WinningConstraint::NoParticipationPrize {
            amount_to_mint = amount_to_mint
                .checked_sub(auction.num_winners())
                .ok_or(MetaplexError::NumericalOverflowError)?;
        } else if config.non_winning_constraint == NonWinningConstraint::NoParticipationPrize {
            amount_to_mint = auction.num_winners();
        }

        mint_printing_tokens(
            token_metadata_program_info,
            participation_printing_holding_account_info,
            transient_one_time_holding_info,
            one_time_printing_authorization_mint_info,
            printing_mint_info,
            auction_manager_info,
            metadata_info,
            master_edition_info,
            token_program_info,
            rent_info,
            amount_to_mint,
            auction_auth_seeds,
        )?;

        // Close transient to save sol for payer
        invoke_signed(
            &close_account(
                token_program_info.key,
                transient_one_time_holding_info.key,
                payer_info.key,
                auction_manager_info.key,
                &[auction_manager_info.key],
            )?,
            &[
                token_program_info.clone(),
                transient_one_time_holding_info.clone(),
                payer_info.clone(),
                auction_manager_info.clone(),
            ],
            &[auction_auth_seeds],
        )?;
    }

    Ok(())
}
