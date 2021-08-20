use {
    crate::{
        deprecated_state::{
            AuctionManagerSettingsV1, AuctionManagerV1, ParticipationStateV1, WinningConfigState,
            WinningConfigStateItem, MAX_AUCTION_MANAGER_V1_SIZE,
        },
        error::MetaplexError,
        processor::init_auction_manager_v2::assert_common_checks,
        state::{AuctionManagerStatus, Key, PREFIX},
        utils::create_or_allocate_account_raw,
    },
    borsh::BorshSerialize,
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        entrypoint::ProgramResult,
        pubkey::Pubkey,
    },
};

pub fn process_deprecated_init_auction_manager_v1(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    auction_manager_settings: AuctionManagerSettingsV1,
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
    let (bump_seed, vault, auction) = assert_common_checks(
        program_id,
        auction_manager_info,
        vault_info,
        auction_info,
        store_info,
        accept_payment_info,
        authority_info,
    )?;

    if auction_manager_settings.winning_configs.len() != auction.num_possible_winners() as usize {
        return Err(MetaplexError::WinnerAmountMismatch.into());
    }

    let mut winning_config_states: Vec<WinningConfigState> = vec![];
    let mut winning_item_count: u8 = 0;
    let mut any_with_more_than_one = false;
    for winning_config in &auction_manager_settings.winning_configs {
        let mut winning_config_state_items = vec![];
        let mut safety_deposit_box_found_lookup: Vec<bool> = vec![];
        for _ in 0..vault.token_type_count {
            safety_deposit_box_found_lookup.push(false)
        }
        if winning_config.items.len() > 1 {
            any_with_more_than_one = true;
        }
        for item in &winning_config.items {
            // If this blows then they have more than 255 total items which is unacceptable in current impl
            winning_item_count = winning_item_count
                .checked_add(1)
                .ok_or(MetaplexError::NumericalOverflowError)?;

            // Check if index referenced exists
            if item.safety_deposit_box_index as usize >= safety_deposit_box_found_lookup.len() {
                return Err(MetaplexError::InvalidWinningConfigSafetyDepositIndex.into());
            }

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
        MAX_AUCTION_MANAGER_V1_SIZE,
        authority_seeds,
    )?;

    let mut auction_manager = AuctionManagerV1::from_account_info(auction_manager_info)?;

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
    auction_manager.straight_shot_optimization = !any_with_more_than_one;

    if auction_manager.settings.participation_config.is_some() {
        auction_manager.state.participation_state = Some(ParticipationStateV1 {
            collected_to_accept_payment: 0,
            validated: false,
            primary_sale_happened: false,
            printing_authorization_token_account: None,
        })
    }
    auction_manager.serialize(&mut *auction_manager_info.data.borrow_mut())?;

    Ok(())
}
