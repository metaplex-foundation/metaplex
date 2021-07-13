use solana_program::log::sol_log_compute_units;

use {
    crate::{
        error::MetaplexError,
        state::{
            AuctionManager, AuctionManagerStatus, Key, OriginalAuthorityLookup, Store,
            WhitelistedCreator, WinningConfigItem, MAX_BID_REDEMPTION_TICKET_SIZE, PREFIX,
        },
    },
    arrayref::{array_mut_ref, array_ref, mut_array_refs},
    borsh::BorshDeserialize,
    solana_program::{
        account_info::AccountInfo,
        borsh::try_from_slice_unchecked,
        entrypoint::ProgramResult,
        msg,
        program::{invoke, invoke_signed},
        program_error::ProgramError,
        program_pack::{IsInitialized, Pack},
        pubkey::Pubkey,
        system_instruction,
        sysvar::{rent::Rent, Sysvar},
    },
    spl_auction::{
        instruction::end_auction_instruction,
        processor::{end_auction::EndAuctionArgs, AuctionData, AuctionState},
    },
    spl_token::instruction::{set_authority, AuthorityType},
    spl_token_metadata::{
        instruction::update_metadata_accounts,
        state::{Metadata, EDITION},
    },
    spl_token_vault::{instruction::create_withdraw_tokens_instruction, state::SafetyDepositBox},
    std::{convert::TryInto, str::FromStr},
};

/// Cheap method to just grab amount from token account, instead of deserializing entire thing
pub fn get_amount_from_token_account(
    token_account_info: &AccountInfo,
) -> Result<u64, ProgramError> {
    // TokeAccount layout:   mint(32), owner(32), ...
    let data = token_account_info.try_borrow_data()?;
    let amount_data = array_ref![data, 64, 8];
    Ok(u64::from_le_bytes(*amount_data))
}

/// assert initialized account
pub fn assert_initialized<T: Pack + IsInitialized>(
    account_info: &AccountInfo,
) -> Result<T, ProgramError> {
    let account: T = T::unpack_unchecked(&account_info.data.borrow())?;
    if !account.is_initialized() {
        Err(MetaplexError::Uninitialized.into())
    } else {
        Ok(account)
    }
}

pub fn assert_rent_exempt(rent: &Rent, account_info: &AccountInfo) -> ProgramResult {
    if !rent.is_exempt(account_info.lamports(), account_info.data_len()) {
        Err(MetaplexError::NotRentExempt.into())
    } else {
        Ok(())
    }
}

pub fn assert_owned_by(account: &AccountInfo, owner: &Pubkey) -> ProgramResult {
    if account.owner != owner {
        Err(MetaplexError::IncorrectOwner.into())
    } else {
        Ok(())
    }
}

pub fn assert_signer(account_info: &AccountInfo) -> ProgramResult {
    if !account_info.is_signer {
        Err(ProgramError::MissingRequiredSignature)
    } else {
        Ok(())
    }
}

pub fn assert_store_safety_vault_manager_match(
    auction_manager: &AuctionManager,
    safety_deposit_info: &AccountInfo,
    vault_info: &AccountInfo,
    token_vault_program: &Pubkey,
) -> ProgramResult {
    if auction_manager.vault != *vault_info.key {
        return Err(MetaplexError::AuctionManagerVaultMismatch.into());
    }

    let data = safety_deposit_info.data.borrow();
    let vault_key = Pubkey::new_from_array(*array_ref![data, 1, 32]);
    let token_mint_key = Pubkey::new_from_array(*array_ref![data, 33, 32]);

    assert_derivation(
        &token_vault_program,
        safety_deposit_info,
        &[
            spl_token_vault::state::PREFIX.as_bytes(),
            vault_info.key.as_ref(),
            token_mint_key.as_ref(),
        ],
    )?;

    if *vault_info.key != vault_key {
        return Err(MetaplexError::SafetyDepositBoxVaultMismatch.into());
    }

    Ok(())
}

pub fn assert_at_least_one_creator_matches_or_store_public_and_all_verified(
    program_id: &Pubkey,
    auction_manager: &AuctionManager,
    metadata: &Metadata,
    whitelisted_creator_info: &AccountInfo,
    store_info: &AccountInfo,
) -> ProgramResult {
    let store = Store::from_account_info(store_info)?;
    if store.public {
        return Ok(());
    }
    if let Some(creators) = &metadata.data.creators {
        // does it exist? It better!
        let existing_whitelist_creator: WhitelistedCreator =
            match WhitelistedCreator::from_account_info(whitelisted_creator_info) {
                Ok(val) => val,
                Err(_) => return Err(MetaplexError::InvalidWhitelistedCreator.into()),
            };

        if !existing_whitelist_creator.activated {
            return Err(MetaplexError::WhitelistedCreatorInactive.into());
        }

        let mut found = false;
        for creator in creators {
            // Now find at least one creator that can make this pda in the list
            let (key, _) = Pubkey::find_program_address(
                &[
                    PREFIX.as_bytes(),
                    program_id.as_ref(),
                    auction_manager.store.as_ref(),
                    creator.address.as_ref(),
                ],
                program_id,
            );

            if key == *whitelisted_creator_info.key {
                found = true;
            }

            if !creator.verified {
                return Err(MetaplexError::CreatorHasNotVerifiedMetadata.into());
            }
        }

        if found {
            return Ok(());
        }
    }
    Err(MetaplexError::InvalidWhitelistedCreator.into())
}

pub fn assert_authority_correct(
    auction_manager: &AuctionManager,
    authority_info: &AccountInfo,
) -> ProgramResult {
    if auction_manager.authority != *authority_info.key {
        return Err(MetaplexError::AuctionManagerAuthorityMismatch.into());
    }

    assert_signer(authority_info)?;

    Ok(())
}
/// Create account almost from scratch, lifted from
/// https://github.com/solana-labs/solana-program-library/blob/7d4873c61721aca25464d42cc5ef651a7923ca79/associated-token-account/program/src/processor.rs#L51-L98
#[inline(always)]
pub fn create_or_allocate_account_raw<'a>(
    program_id: Pubkey,
    new_account_info: &AccountInfo<'a>,
    rent_sysvar_info: &AccountInfo<'a>,
    system_program_info: &AccountInfo<'a>,
    payer_info: &AccountInfo<'a>,
    size: usize,
    signer_seeds: &[&[u8]],
) -> Result<(), ProgramError> {
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
    msg!("Completed assignation!");

    Ok(())
}

#[allow(clippy::too_many_arguments)]
pub fn transfer_safety_deposit_box_items<'a>(
    token_vault_program: AccountInfo<'a>,
    destination: AccountInfo<'a>,
    safety_deposit_box: AccountInfo<'a>,
    safety_deposit_token_store: AccountInfo<'a>,
    vault: AccountInfo<'a>,
    fraction_mint: AccountInfo<'a>,
    vault_authority: AccountInfo<'a>,
    transfer_authority: AccountInfo<'a>,
    rent: AccountInfo<'a>,
    amount: u64,
    signer_seeds: &[&[u8]],
) -> ProgramResult {
    invoke_signed(
        &create_withdraw_tokens_instruction(
            *token_vault_program.key,
            *destination.key,
            *safety_deposit_box.key,
            *safety_deposit_token_store.key,
            *vault.key,
            *fraction_mint.key,
            *vault_authority.key,
            *transfer_authority.key,
            amount,
        ),
        &[
            token_vault_program,
            destination,
            safety_deposit_box,
            safety_deposit_token_store,
            vault,
            fraction_mint,
            vault_authority,
            transfer_authority,
            rent,
        ],
        &[&signer_seeds],
    )?;

    Ok(())
}

pub fn transfer_metadata_ownership<'a>(
    token_metadata_program: AccountInfo<'a>,
    metadata_info: AccountInfo<'a>,
    update_authority: AccountInfo<'a>,
    new_update_authority: AccountInfo<'a>,
    signer_seeds: &[&[u8]],
) -> ProgramResult {
    invoke_signed(
        &update_metadata_accounts(
            *token_metadata_program.key,
            *metadata_info.key,
            *update_authority.key,
            Some(*new_update_authority.key),
            None,
            Some(true),
        ),
        &[
            update_authority,
            new_update_authority,
            metadata_info,
            token_metadata_program,
        ],
        &[&signer_seeds],
    )?;

    Ok(())
}

pub fn transfer_mint_authority<'a>(
    new_authority_seeds: &[&[u8]],
    new_authority_key: &Pubkey,
    new_authority_info: &AccountInfo<'a>,
    mint_info: &AccountInfo<'a>,
    mint_authority_info: &AccountInfo<'a>,
    token_program_info: &AccountInfo<'a>,
) -> ProgramResult {
    msg!("Setting mint authority");
    invoke_signed(
        &set_authority(
            token_program_info.key,
            mint_info.key,
            Some(new_authority_key),
            AuthorityType::MintTokens,
            mint_authority_info.key,
            &[&mint_authority_info.key],
        )
        .unwrap(),
        &[
            mint_authority_info.clone(),
            mint_info.clone(),
            token_program_info.clone(),
            new_authority_info.clone(),
        ],
        &[new_authority_seeds],
    )?;
    msg!("Setting freeze authority");
    invoke_signed(
        &set_authority(
            token_program_info.key,
            mint_info.key,
            Some(&new_authority_key),
            AuthorityType::FreezeAccount,
            mint_authority_info.key,
            &[&mint_authority_info.key],
        )
        .unwrap(),
        &[
            mint_authority_info.clone(),
            mint_info.clone(),
            token_program_info.clone(),
            new_authority_info.clone(),
        ],
        &[new_authority_seeds],
    )?;

    Ok(())
}

pub struct CommonRedeemReturn {
    pub redemption_bump_seed: u8,
    pub auction_manager: AuctionManager,
    pub cancelled: bool,
    pub rent: Rent,
    pub win_index: Option<usize>,
    pub token_metadata_program: Pubkey,
}

pub struct CommonRedeemCheckArgs<'a> {
    pub program_id: &'a Pubkey,
    pub auction_manager_info: &'a AccountInfo<'a>,
    pub safety_deposit_token_store_info: &'a AccountInfo<'a>,
    pub destination_info: &'a AccountInfo<'a>,
    pub bid_redemption_info: &'a AccountInfo<'a>,
    pub safety_deposit_info: &'a AccountInfo<'a>,
    pub vault_info: &'a AccountInfo<'a>,
    pub auction_info: &'a AccountInfo<'a>,
    pub bidder_metadata_info: &'a AccountInfo<'a>,
    pub bidder_info: &'a AccountInfo<'a>,
    pub token_program_info: &'a AccountInfo<'a>,
    pub token_vault_program_info: &'a AccountInfo<'a>,
    pub token_metadata_program_info: &'a AccountInfo<'a>,
    pub store_info: &'a AccountInfo<'a>,
    pub rent_info: &'a AccountInfo<'a>,
    pub is_participation: bool,
    // If this is being called by the auctioneer to pull prizes out they overwrite the win index
    // they would normally get if they themselves bid for whatever win index they choose.
    pub overwrite_win_index: Option<usize>,
    // In newer endpoints, to conserve CPU and make way for 10,000 person auctions,
    // client must specify win index and then we simply check if the address matches for O(1) lookup vs O(n)
    // scan. This is an option so older actions which rely on the O(n) lookup because we can't change their call structure
    // can continue to work.
    pub user_provided_win_index: Option<Option<usize>>,
    pub assert_bidder_signer: bool,
    // For printing v2, the edition pda is what essentially forms a backstop for bad bidders. We do not need this additional
    // check which isn't accurate anyway when one winning config item has an amount > 1.
    pub ignore_bid_redeemed_item_check: bool,
}

fn calculate_win_index(
    bidder_info: &AccountInfo,
    auction_info: &AccountInfo,
    user_provided_win_index: Option<Option<usize>>,
    overwrite_win_index: Option<usize>,
) -> Result<Option<usize>, ProgramError> {
    let mut win_index: Option<usize>;
    // User provided us with an option of an option telling us what if anything they won. We need to validate.
    if let Some(up_win_index) = user_provided_win_index {
        // check that this person is the winner they say they are. Only if not doing an override of win index,
        // which we know likely wont match bidder info and is simply checking below that you arent stealing a prize.

        if overwrite_win_index.is_none() {
            if let Some(up_win_index_unwrapped) = up_win_index {
                let winner = AuctionData::get_winner_at(auction_info, up_win_index_unwrapped);
                if let Some(winner_key) = winner {
                    if winner_key != *bidder_info.key {
                        return Err(MetaplexError::WinnerIndexMismatch.into());
                    }
                } else {
                    return Err(MetaplexError::WinnerIndexMismatch.into());
                }
            }
        }

        // Notice if overwrite win index is some, this gets wiped anyway in the if statement below.
        // If not, it becomes the win index going forward as we have validated the user is either
        // saying they won nothing (Participation redemption) or they won something
        // and they weren't lying.
        win_index = up_win_index;
    } else {
        // Legacy system where we O(n) scan the bid index to find the winner index. CPU intensive.
        win_index = AuctionData::get_is_winner(auction_info, bidder_info.key);
    }

    // This means auctioneer is attempting to pull goods out of the system, and is attempting to set
    // the win index for themselves. Has a different field because it has different logic - mainly
    // just checking to make sure you arent claiming from someone who won. Supersedes normal user provided
    // logic.
    if let Some(index) = overwrite_win_index {
        let winner_at = AuctionData::get_winner_at(auction_info, index);
        if winner_at.is_some() {
            return Err(MetaplexError::AuctioneerCantClaimWonPrize.into());
        } else {
            win_index = overwrite_win_index
        }
    }

    Ok(win_index)
}

#[allow(clippy::too_many_arguments)]
pub fn common_redeem_checks(
    args: CommonRedeemCheckArgs,
) -> Result<CommonRedeemReturn, ProgramError> {
    let CommonRedeemCheckArgs {
        program_id,
        auction_manager_info,
        safety_deposit_token_store_info,
        destination_info,
        bid_redemption_info,
        safety_deposit_info,
        vault_info,
        auction_info,
        bidder_metadata_info,
        bidder_info,
        token_program_info,
        token_vault_program_info,
        token_metadata_program_info,
        rent_info,
        store_info,
        is_participation,
        overwrite_win_index,
        user_provided_win_index,
        assert_bidder_signer,
        ignore_bid_redeemed_item_check,
    } = args;

    let rent = &Rent::from_account_info(&rent_info)?;

    let mut auction_manager: AuctionManager =
        AuctionManager::from_account_info(auction_manager_info)?;
    let store_data = store_info.data.borrow();
    let cancelled: bool;

    let auction_program = Pubkey::new_from_array(*array_ref![store_data, 2, 32]);
    let token_vault_program = Pubkey::new_from_array(*array_ref![store_data, 34, 32]);
    let token_metadata_program = Pubkey::new_from_array(*array_ref![store_data, 66, 32]);
    let token_program = Pubkey::new_from_array(*array_ref![store_data, 98, 32]);

    let mut redemption_bump_seed: u8 = 0;
    if overwrite_win_index.is_some() {
        cancelled = false;

        if *bidder_info.key != auction_manager.authority {
            return Err(MetaplexError::MustBeAuctioneer.into());
        }
    } else {
        let bidder_metadata_data = bidder_metadata_info.data.borrow();
        if bidder_metadata_data[80] == 0 {
            cancelled = false
        } else {
            cancelled = true;
        }
        assert_owned_by(bidder_metadata_info, &auction_program)?;
        assert_derivation(
            &auction_program,
            bidder_metadata_info,
            &[
                spl_auction::PREFIX.as_bytes(),
                auction_program.as_ref(),
                auction_info.key.as_ref(),
                bidder_info.key.as_ref(),
                "metadata".as_bytes(),
            ],
        )?;

        let bidder_pubkey = Pubkey::new_from_array(*array_ref![bidder_metadata_data, 0, 32]);
        if bidder_pubkey != *bidder_info.key {
            return Err(MetaplexError::BidderMetadataBidderMismatch.into());
        }
        let redemption_path = [
            PREFIX.as_bytes(),
            auction_manager.auction.as_ref(),
            bidder_metadata_info.key.as_ref(),
        ];
        let (redemption_key, actual_redemption_bump_seed) =
            Pubkey::find_program_address(&redemption_path, &program_id);

        redemption_bump_seed = actual_redemption_bump_seed;
        if redemption_key != *bid_redemption_info.key {
            return Err(MetaplexError::BidRedemptionMismatch.into());
        }
    }

    let win_index = calculate_win_index(
        bidder_info,
        auction_info,
        user_provided_win_index,
        overwrite_win_index,
    )?;

    if !bid_redemption_info.data_is_empty() && overwrite_win_index.is_none() {
        let bid_redemption_data = bid_redemption_info.data.borrow();

        if bid_redemption_data[0] != Key::BidRedemptionTicketV1 as u8 {
            return Err(MetaplexError::DataTypeMismatch.into());
        }

        let mut participation_redeemed = false;
        if bid_redemption_data[1] == 1 {
            participation_redeemed = true;
        }
        let items_redeemed = bid_redemption_data[2];
        msg!(
            "Items redeemed is {} and participation redemption is {}",
            items_redeemed,
            participation_redeemed
        );
        let possible_items_to_redeem = match win_index {
            Some(val) => auction_manager.settings.winning_configs[val].items.len(),
            None => 0,
        };
        if (is_participation && participation_redeemed)
            || (!is_participation
                && !ignore_bid_redeemed_item_check
                && items_redeemed == possible_items_to_redeem as u8)
        {
            return Err(MetaplexError::BidAlreadyRedeemed.into());
        }
    }

    if assert_bidder_signer {
        assert_signer(bidder_info)?;
    }

    assert_owned_by(&destination_info, token_program_info.key)?;
    assert_owned_by(&auction_manager_info, &program_id)?;
    assert_owned_by(safety_deposit_token_store_info, token_program_info.key)?;
    if !bid_redemption_info.data_is_empty() {
        assert_owned_by(bid_redemption_info, &program_id)?;
    }
    assert_owned_by(safety_deposit_info, &token_vault_program)?;
    assert_owned_by(vault_info, &token_vault_program)?;
    assert_owned_by(auction_info, &auction_program)?;
    assert_owned_by(store_info, &program_id)?;

    assert_store_safety_vault_manager_match(
        &auction_manager,
        &safety_deposit_info,
        &vault_info,
        &token_vault_program,
    )?;
    // looking out for you!
    assert_rent_exempt(rent, &destination_info)?;

    if auction_manager.auction != *auction_info.key {
        return Err(MetaplexError::AuctionManagerAuctionMismatch.into());
    }

    if *store_info.key != auction_manager.store {
        return Err(MetaplexError::AuctionManagerStoreMismatch.into());
    }

    if token_program != *token_program_info.key {
        return Err(MetaplexError::AuctionManagerTokenProgramMismatch.into());
    }

    if token_vault_program != *token_vault_program_info.key {
        return Err(MetaplexError::AuctionManagerTokenVaultProgramMismatch.into());
    }

    if token_metadata_program != *token_metadata_program_info.key {
        return Err(MetaplexError::AuctionManagerTokenMetadataProgramMismatch.into());
    }

    if AuctionData::get_state(auction_info)? != AuctionState::Ended {
        return Err(MetaplexError::AuctionHasNotEnded.into());
    }

    // No-op if already set.
    auction_manager.state.status = AuctionManagerStatus::Disbursing;

    Ok(CommonRedeemReturn {
        redemption_bump_seed,
        auction_manager,
        cancelled,
        rent: *rent,
        win_index,
        token_metadata_program,
    })
}

pub struct CommonRedeemFinishArgs<'a> {
    pub program_id: &'a Pubkey,
    pub auction_manager: AuctionManager,
    pub auction_manager_info: &'a AccountInfo<'a>,
    pub bidder_metadata_info: &'a AccountInfo<'a>,
    pub rent_info: &'a AccountInfo<'a>,
    pub system_info: &'a AccountInfo<'a>,
    pub payer_info: &'a AccountInfo<'a>,
    pub bid_redemption_info: &'a AccountInfo<'a>,
    pub winning_index: Option<usize>,
    pub redemption_bump_seed: u8,
    pub bid_redeemed: bool,
    pub participation_redeemed: bool,
    pub winning_item_index: Option<usize>,
    pub overwrite_win_index: Option<usize>,
}
#[allow(clippy::too_many_arguments)]
pub fn common_redeem_finish(args: CommonRedeemFinishArgs) -> ProgramResult {
    let CommonRedeemFinishArgs {
        program_id,
        auction_manager,
        auction_manager_info,
        bidder_metadata_info,
        rent_info,
        system_info,
        payer_info,
        bid_redemption_info,
        winning_index,
        redemption_bump_seed,
        bid_redeemed,
        participation_redeemed,
        winning_item_index,
        overwrite_win_index,
    } = args;

    if (bid_redeemed || participation_redeemed) && overwrite_win_index.is_none() {
        let redemption_seeds = &[
            PREFIX.as_bytes(),
            auction_manager.auction.as_ref(),
            bidder_metadata_info.key.as_ref(),
            &[redemption_bump_seed],
        ];

        if bid_redemption_info.data_is_empty() {
            create_or_allocate_account_raw(
                *program_id,
                &bid_redemption_info,
                &rent_info,
                &system_info,
                &payer_info,
                MAX_BID_REDEMPTION_TICKET_SIZE,
                redemption_seeds,
            )?;
        }
        // Saving on CPU in these large actions by avoiding borsh
        let data = &mut bid_redemption_info.data.borrow_mut();
        let output = array_mut_ref![data, 0, MAX_BID_REDEMPTION_TICKET_SIZE];

        let (key, participation_redeemed_ptr, items_redeemed_ptr) =
            mut_array_refs![output, 1, 1, 1];

        *key = [Key::BidRedemptionTicketV1 as u8];

        let curr_items_redeemed = u8::from_le_bytes(*items_redeemed_ptr);

        if participation_redeemed {
            *participation_redeemed_ptr = [1];
        } else if bid_redeemed {
            *items_redeemed_ptr = curr_items_redeemed
                .checked_add(1)
                .ok_or(MetaplexError::NumericalOverflowError)?
                .to_le_bytes();
        }
    }

    msg!("About to pass through the eye of the needle");
    sol_log_compute_units();

    if bid_redeemed {
        if let Some(index) = winning_index {
            if let Some(item_index) = winning_item_index {
                AuctionManager::set_claimed_and_status(
                    auction_manager_info,
                    auction_manager.state.status,
                    index,
                    item_index,
                    auction_manager.straight_shot_optimization,
                );
            }
        }
    }

    Ok(())
}

pub struct CommonWinningConfigCheckReturn {
    pub winning_config_item: WinningConfigItem,
    pub winning_item_index: Option<usize>,
}

pub fn common_winning_config_checks(
    auction_manager: &AuctionManager,
    safety_deposit_info: &AccountInfo,
    winning_index: usize,
    ignore_claim: bool,
) -> Result<CommonWinningConfigCheckReturn, ProgramError> {
    let winning_config = &auction_manager.settings.winning_configs[winning_index];
    let winning_config_state = &auction_manager.state.winning_config_states[winning_index];

    let mut winning_item_index = None;
    for i in 0..winning_config.items.len() {
        if winning_config.items[i].safety_deposit_box_index
            == SafetyDepositBox::get_order(safety_deposit_info)
        {
            winning_item_index = Some(i);
            break;
        }
    }

    let winning_config_item = match winning_item_index {
        Some(index) => winning_config.items[index],
        None => return Err(MetaplexError::SafetyDepositBoxNotUsedInAuction.into()),
    };

    let winning_config_state_item = match winning_item_index {
        Some(index) => winning_config_state.items[index],
        None => return Err(MetaplexError::SafetyDepositBoxNotUsedInAuction.into()),
    };

    // For printing v2, we may call many times for different editions and the edition PDA check makes sure it cant
    // be claimed over-much. This would be 1 time, we need n times.
    if winning_config_state_item.claimed && !ignore_claim {
        return Err(MetaplexError::PrizeAlreadyClaimed.into());
    }

    Ok(CommonWinningConfigCheckReturn {
        winning_config_item,
        winning_item_index,
    })
}

#[allow(clippy::too_many_arguments)]
pub fn shift_authority_back_to_originating_user<'a>(
    program_id: &Pubkey,
    auction_manager: &AuctionManager,
    auction_manager_info: &AccountInfo<'a>,
    master_metadata_info: &AccountInfo<'a>,
    original_authority: &AccountInfo<'a>,
    original_authority_lookup_info: &AccountInfo<'a>,
    printing_mint_info: &AccountInfo<'a>,
    token_program_info: &AccountInfo<'a>,
    authority_seeds: &[&[u8]],
) -> ProgramResult {
    let original_authority_lookup_seeds = &[
        PREFIX.as_bytes(),
        &auction_manager.auction.as_ref(),
        master_metadata_info.key.as_ref(),
    ];

    let (expected_key, _) =
        Pubkey::find_program_address(original_authority_lookup_seeds, &program_id);

    if expected_key != *original_authority_lookup_info.key {
        return Err(MetaplexError::OriginalAuthorityLookupKeyMismatch.into());
    }

    let original_authority_lookup: OriginalAuthorityLookup =
        OriginalAuthorityLookup::from_account_info(original_authority_lookup_info)?;
    if original_authority_lookup.original_authority != *original_authority.key {
        return Err(MetaplexError::OriginalAuthorityMismatch.into());
    }
    transfer_mint_authority(
        authority_seeds,
        original_authority.key,
        original_authority,
        printing_mint_info,
        auction_manager_info,
        token_program_info,
    )?;

    Ok(())
}

// TODO due to a weird stack access violation bug we had to remove the args struct from this method
// to get redemptions working again after integrating new Auctions program. Try to bring it back one day
#[inline(always)]
pub fn spl_token_transfer<'a: 'b, 'b>(
    source: AccountInfo<'a>,
    destination: AccountInfo<'a>,
    amount: u64,
    authority: AccountInfo<'a>,
    authority_signer_seeds: &'b [&'b [u8]],
    token_program: AccountInfo<'a>,
) -> ProgramResult {
    let result = invoke_signed(
        &spl_token::instruction::transfer(
            token_program.key,
            source.key,
            destination.key,
            authority.key,
            &[],
            amount,
        )?,
        &[source, destination, authority, token_program],
        &[authority_signer_seeds],
    );

    result.map_err(|_| MetaplexError::TokenTransferFailed.into())
}

pub fn assert_edition_valid(
    program_id: &Pubkey,
    mint: &Pubkey,
    edition_account_info: &AccountInfo,
) -> ProgramResult {
    let edition_seeds = &[
        spl_token_metadata::state::PREFIX.as_bytes(),
        program_id.as_ref(),
        &mint.as_ref(),
        EDITION.as_bytes(),
    ];
    let (edition_key, _) = Pubkey::find_program_address(edition_seeds, program_id);
    if edition_key != *edition_account_info.key {
        return Err(MetaplexError::InvalidEditionKey.into());
    }

    Ok(())
}

// TODO due to a weird stack access violation bug we had to remove the args struct from this method
// to get redemptions working again after integrating new Auctions program. Try to bring it back one day.
pub fn spl_token_mint_to<'a: 'b, 'b>(
    mint: AccountInfo<'a>,
    destination: AccountInfo<'a>,
    amount: u64,
    authority: AccountInfo<'a>,
    authority_signer_seeds: &'b [&'b [u8]],
    token_program: AccountInfo<'a>,
) -> ProgramResult {
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
        &[authority_signer_seeds],
    );
    result.map_err(|_| MetaplexError::TokenMintToFailed.into())
}

pub fn assert_derivation(
    program_id: &Pubkey,
    account: &AccountInfo,
    path: &[&[u8]],
) -> Result<u8, ProgramError> {
    let (key, bump) = Pubkey::find_program_address(&path, program_id);
    if key != *account.key {
        return Err(MetaplexError::DerivedKeyInvalid.into());
    }
    Ok(bump)
}

pub fn try_from_slice_checked<T: BorshDeserialize>(
    data: &[u8],
    data_type: Key,
    data_size: usize,
) -> Result<T, ProgramError> {
    if (data[0] != data_type as u8 && data[0] != Key::Uninitialized as u8)
        || data.len() != data_size
    {
        return Err(MetaplexError::DataTypeMismatch.into());
    }

    let result: T = try_from_slice_unchecked(data)?;

    Ok(result)
}

pub fn end_auction<'a: 'b, 'b>(
    resource: Pubkey,
    auction: AccountInfo<'a>,
    authority: AccountInfo<'a>,
    auction_program: AccountInfo<'a>,
    clock: AccountInfo<'a>,
    authority_signer_seeds: &'b [&'b [u8]],
) -> ProgramResult {
    invoke_signed(
        &end_auction_instruction(
            *auction_program.key,
            *authority.key,
            EndAuctionArgs {
                resource,
                reveal: None,
            },
        ),
        &[auction, authority, auction_program, clock],
        &[authority_signer_seeds],
    )?;

    Ok(())
}

pub fn assert_is_ata(
    account: &AccountInfo,
    wallet: &Pubkey,
    token_program: &Pubkey,
    mint: &Pubkey,
) -> ProgramResult {
    assert_derivation(
        &Pubkey::from_str("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL").unwrap(),
        account,
        &[wallet.as_ref(), token_program.as_ref(), mint.as_ref()],
    )?;

    Ok(())
}
