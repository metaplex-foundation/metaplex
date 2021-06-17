use {
    crate::{
        error::MetaplexError,
        state::{
            AuctionManager, AuctionManagerSettings, AuctionManagerStatus, Key, ParticipationState,
            Store, WinningConfigState, WinningConfigStateItem, MAX_AUCTION_MANAGER_SIZE, PREFIX,
        },
        utils::{
            assert_derivation, assert_initialized, assert_owned_by, create_or_allocate_account_raw,
        },
    },
    borsh::BorshSerialize,
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        entrypoint::ProgramResult,
        program_option::COption,
        pubkey::Pubkey,
    },
    spl_auction::processor::{AuctionData, AuctionState},
    spl_token::state::Account,
    spl_token_vault::state::{Vault, VaultState},
};

pub fn process_init_auction_manager(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    auction_manager_settings: AuctionManagerSettings,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let auction_manager_info = next_account_info(account_info_iter)?;
    let vault_info = next_account_info(account_info_iter)?;
    let auction_info = next_account_info(account_info_iter)?;
    let authority_info = next_account_info(account_info_iter)?;
    let payer_info = next_account_info(account_info_iter)?;
    let accept_payment_info = next_account_info(account_info_iter)?;
    let store_info = next_account_info(account_info_iter)?;
    let system_info = next_account_info(account_info_iter)?;
    let rent_info = next_account_info(account_info_iter)?;

    let vault = Vault::from_account_info(vault_info)?;
    let auction = AuctionData::from_account_info(auction_info)?;
    let accept_payment: Account = assert_initialized(accept_payment_info)?;
    // Assert it is real
    let store = Store::from_account_info(store_info)?;

    assert_owned_by(vault_info, &store.token_vault_program)?;
    assert_owned_by(auction_info, &store.auction_program)?;
    assert_owned_by(store_info, program_id)?;
    assert_owned_by(accept_payment_info, &store.token_program)?;

    if auction.state != AuctionState::Created {
        return Err(MetaplexError::AuctionMustBeCreated.into());
    }

    if vault.authority != *auction_manager_info.key {
        return Err(MetaplexError::VaultAuthorityMismatch.into());
    }

    if auction.authority != *auction_manager_info.key {
        return Err(MetaplexError::AuctionAuthorityMismatch.into());
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
            spl_auction::PREFIX.as_bytes(),
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

    if auction_manager_settings.winning_configs.len() != auction.num_possible_winners() as usize {
        return Err(MetaplexError::WinnerAmountMismatch.into());
    }

    let mut winning_config_states: Vec<WinningConfigState> = vec![];
    let mut winning_item_count: u8 = 0;
    for winning_config in &auction_manager_settings.winning_configs {
        let mut winning_config_state_items = vec![];
        let mut safety_deposit_box_found_lookup: Vec<bool> = vec![];
        for _ in 0..vault.token_type_count {
            safety_deposit_box_found_lookup.push(false)
        }
        for item in &winning_config.items {
            // If this blows then they have more than 255 total items which is unacceptable in current impl
            winning_item_count = winning_item_count
                .checked_add(1)
                .ok_or(MetaplexError::NumericalOverflowError)?;

            // Should never have same deposit index appear twice in one config.
            let lookup = safety_deposit_box_found_lookup[item.safety_deposit_box_index as usize];
            if lookup {
                return Err(MetaplexError::DuplicateWinningConfigItemDetected.into());
            } else {
                safety_deposit_box_found_lookup[item.safety_deposit_box_index as usize] = true
            }

            if item.safety_deposit_box_index > vault.token_type_count {
                return Err(MetaplexError::InvalidSafetyDepositBox.into());
            }

            winning_config_state_items.push(WinningConfigStateItem {
                claimed: false,
                primary_sale_happened: false,
            })
        }
        winning_config_states.push(WinningConfigState {
            items: winning_config_state_items,
            money_pushed_to_accept_payment: false,
        })
    }

    let authority_seeds = &[PREFIX.as_bytes(), &auction_info.key.as_ref(), &[bump_seed]];

    create_or_allocate_account_raw(
        *program_id,
        auction_manager_info,
        rent_info,
        system_info,
        payer_info,
        MAX_AUCTION_MANAGER_SIZE,
        authority_seeds,
    )?;

    let mut auction_manager = AuctionManager::from_account_info(auction_manager_info)?;

    auction_manager.key = Key::AuctionManagerV1;
    auction_manager.store = *store_info.key;
    auction_manager.state.status = AuctionManagerStatus::Initialized;
    auction_manager.settings = auction_manager_settings;
    auction_manager.vault = *vault_info.key;
    auction_manager.auction = *auction_info.key;
    auction_manager.authority = *authority_info.key;
    auction_manager.accept_payment = *accept_payment_info.key;
    auction_manager.state.winning_config_items_validated = 0;
    auction_manager.state.winning_config_states = winning_config_states;

    if auction_manager.settings.participation_config.is_some() {
        auction_manager.state.participation_state = Some(ParticipationState {
            collected_to_accept_payment: 0,
            validated: false,
            primary_sale_happened: false,
            printing_authorization_token_account: None,
        })
    }
    auction_manager.serialize(&mut *auction_manager_info.data.borrow_mut())?;

    Ok(())
}
