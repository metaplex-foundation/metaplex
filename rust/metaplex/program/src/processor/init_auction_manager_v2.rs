use crate::{
    error::MetaplexError,
    state::{
        AuctionManagerStatus, AuctionManagerV2, AuctionWinnerTokenTypeTracker, Key, Store,
        TupleNumericType, MAX_AUCTION_MANAGER_V2_SIZE, PREFIX, TOTALS,
    },
    utils::{
        assert_derivation, assert_initialized, assert_owned_by, create_or_allocate_account_raw,
    },
};
use borsh::BorshSerialize;
use mpl_auction::processor::{AuctionData, AuctionState};
use mpl_token_vault::state::{Vault, VaultState};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    program_error::ProgramError,
    program_option::COption,
    pubkey::Pubkey,
};
use spl_token::state::Account;

pub fn assert_common_checks(
    program_id: &Pubkey,
    auction_manager_info: &AccountInfo,
    vault_info: &AccountInfo,
    auction_info: &AccountInfo,
    store_info: &AccountInfo,
    accept_payment_info: &AccountInfo,
    authority_info: &AccountInfo,
) -> Result<(u8, Vault, AuctionData), ProgramError> {
    let vault = Vault::from_account_info(vault_info)?;
    let auction = AuctionData::from_account_info(auction_info)?;
    let accept_payment: Account = assert_initialized(accept_payment_info)?;
    // Assert it is real
    let store = Store::from_account_info(store_info)?;
    assert_owned_by(vault_info, &store.token_vault_program)?;
    assert_owned_by(auction_info, &store.auction_program)?;
    assert_owned_by(store_info, program_id)?;
    assert_owned_by(accept_payment_info, &store.token_program)?;

    if auction.authority != *auction_manager_info.key && auction.authority != *authority_info.key {
        return Err(MetaplexError::AuctionAuthorityMismatch.into());
    }

    if vault.authority != *auction_manager_info.key && vault.authority != *authority_info.key {
        return Err(MetaplexError::VaultAuthorityMismatch.into());
    }

    if auction.state != AuctionState::Created {
        return Err(MetaplexError::AuctionMustBeCreated.into());
    }

    let bump_seed = assert_derivation(
        program_id,
        auction_manager_info,
        &[PREFIX.as_bytes(), &auction_info.key.as_ref()],
    )?;

    assert_derivation(
        &store.auction_program,
        auction_info,
        &[
            mpl_auction::PREFIX.as_bytes(),
            &store.auction_program.as_ref(),
            &vault_info.key.as_ref(),
        ],
    )?;

    if auction.token_mint != accept_payment.mint {
        return Err(MetaplexError::AuctionAcceptPaymentMintMismatch.into());
    }

    if accept_payment.owner != *auction_manager_info.key {
        return Err(MetaplexError::AcceptPaymentOwnerMismatch.into());
    }

    if accept_payment.delegate != COption::None {
        return Err(MetaplexError::DelegateShouldBeNone.into());
    }

    if accept_payment.close_authority != COption::None {
        return Err(MetaplexError::CloseAuthorityShouldBeNone.into());
    }

    if vault.state != VaultState::Combined {
        return Err(MetaplexError::VaultNotCombined.into());
    }

    if vault.token_type_count == 0 {
        return Err(MetaplexError::VaultCannotEmpty.into());
    }

    Ok((bump_seed, vault, auction))
}

pub fn process_init_auction_manager_v2(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    amount_type: TupleNumericType,
    length_type: TupleNumericType,
    max_ranges: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let auction_manager_info = next_account_info(account_info_iter)?;
    let auction_token_tracker_info = next_account_info(account_info_iter)?;
    let vault_info = next_account_info(account_info_iter)?;
    let auction_info = next_account_info(account_info_iter)?;
    let authority_info = next_account_info(account_info_iter)?;
    let payer_info = next_account_info(account_info_iter)?;
    let accept_payment_info = next_account_info(account_info_iter)?;
    let store_info = next_account_info(account_info_iter)?;
    let system_info = next_account_info(account_info_iter)?;
    let rent_info = next_account_info(account_info_iter)?;

    let (bump_seed, _vault, _auction) = assert_common_checks(
        program_id,
        auction_manager_info,
        vault_info,
        auction_info,
        store_info,
        accept_payment_info,
        authority_info,
    )?;

    let authority_seeds = &[PREFIX.as_bytes(), &auction_info.key.as_ref(), &[bump_seed]];

    create_or_allocate_account_raw(
        *program_id,
        auction_manager_info,
        rent_info,
        system_info,
        payer_info,
        MAX_AUCTION_MANAGER_V2_SIZE,
        authority_seeds,
    )?;

    let mut auction_manager = AuctionManagerV2::from_account_info(auction_manager_info)?;

    auction_manager.key = Key::AuctionManagerV2;
    auction_manager.store = *store_info.key;
    auction_manager.state.status = AuctionManagerStatus::Initialized;
    auction_manager.vault = *vault_info.key;
    auction_manager.auction = *auction_info.key;
    auction_manager.authority = *authority_info.key;
    auction_manager.accept_payment = *accept_payment_info.key;
    auction_manager.state.safety_config_items_validated = 0;
    auction_manager.state.bids_pushed_to_accept_payment = 0;

    auction_manager.serialize(&mut *auction_manager_info.data.borrow_mut())?;

    if !auction_token_tracker_info.data_is_empty() {
        return Err(ProgramError::AccountAlreadyInitialized);
    } else {
        let token_bump = assert_derivation(
            program_id,
            auction_token_tracker_info,
            &[
                PREFIX.as_bytes(),
                &program_id.as_ref(),
                auction_manager_info.key.as_ref(),
                TOTALS.as_bytes(),
            ],
        )?;

        let token_type_tracker = AuctionWinnerTokenTypeTracker {
            key: Key::AuctionWinnerTokenTypeTrackerV1,
            amount_type,
            length_type,
            amount_ranges: vec![],
        };

        let token_seeds = &[
            PREFIX.as_bytes(),
            &program_id.as_ref(),
            auction_manager_info.key.as_ref(),
            TOTALS.as_bytes(),
            &[token_bump],
        ];

        create_or_allocate_account_raw(
            *program_id,
            auction_token_tracker_info,
            rent_info,
            system_info,
            payer_info,
            token_type_tracker.created_size(max_ranges),
            token_seeds,
        )?;

        token_type_tracker.save(&auction_token_tracker_info);
    }

    Ok(())
}
