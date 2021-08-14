use solana_program::msg;

use {
    crate::{
        error::MetaplexError,
        instruction::EmptyPaymentAccountArgs,
        state::{AuctionManager, Key, PayoutTicket, Store, MAX_PAYOUT_TICKET_SIZE, PREFIX},
        utils::{
            assert_derivation, assert_initialized, assert_is_ata, assert_owned_by,
            assert_rent_exempt, create_or_allocate_account_raw, spl_token_transfer,
        },
    },
    borsh::BorshSerialize,
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        entrypoint::ProgramResult,
        program_error::ProgramError,
        program_option::COption,
        pubkey::Pubkey,
        rent::Rent,
        sysvar::Sysvar,
    },
    spl_auction::processor::AuctionData,
    spl_token::state::Account,
    spl_token_metadata::state::{MasterEditionV1, Metadata},
    spl_token_vault::state::SafetyDepositBox,
};

fn assert_winning_config_safety_deposit_validity(
    auction_manager: &AuctionManager,
    safety_deposit: &SafetyDepositBox,
    winning_config_index: Option<u8>,
    winning_config_item_index: Option<u8>,
) -> ProgramResult {
    if let Some(winning_index) = winning_config_index {
        let winning_configs = &auction_manager.settings.winning_configs;
        if (winning_index as usize) < winning_configs.len() {
            let winning_config = &winning_configs[winning_index as usize];
            if let Some(item_index) = winning_config_item_index {
                if winning_config.items[item_index as usize].safety_deposit_box_index
                    != safety_deposit.order
                {
                    return Err(MetaplexError::WinningConfigSafetyDepositMismatch.into());
                }
            } else {
                return Err(MetaplexError::InvalidWinningConfigItemIndex.into());
            }
        } else {
            return Err(MetaplexError::InvalidWinningConfigIndex.into());
        }
    } else if let Some(participation) = &auction_manager.settings.participation_config {
        if participation.safety_deposit_box_index != safety_deposit.order {
            return Err(MetaplexError::ParticipationSafetyDepositMismatch.into());
        }
    } else {
        return Err(MetaplexError::ParticipationNotPresent.into());
    }

    Ok(())
}

fn assert_destination_ownership_validity(
    auction_manager: &AuctionManager,
    metadata: &Metadata,
    destination_info: &AccountInfo,
    destination: &Account,
    store: &Store,
    creator_index: Option<u8>,
) -> ProgramResult {
    if let Some(creators) = &metadata.data.creators {
        if let Some(index) = creator_index {
            if (index as usize) < creators.len() {
                let creator = &creators[index as usize];
                if destination.owner != creator.address {
                    return Err(MetaplexError::IncorrectOwner.into());
                }

                // Let's avoid importing the entire ATA library here just to get a helper and an ID.
                // Assert destination is, in fact, an ATA.
                assert_is_ata(
                    destination_info,
                    &creator.address,
                    &store.token_program,
                    &destination.mint,
                )?;
            } else {
                return Err(MetaplexError::InvalidCreatorIndex.into());
            }
        } else if destination.owner != auction_manager.authority {
            return Err(MetaplexError::IncorrectOwner.into());
        }
    } else if destination.owner != auction_manager.authority {
        return Err(MetaplexError::IncorrectOwner.into());
    }

    if destination.delegate != COption::None {
        return Err(MetaplexError::DelegateShouldBeNone.into());
    }

    if destination.close_authority != COption::None {
        return Err(MetaplexError::CloseAuthorityShouldBeNone.into());
    }

    Ok(())
}

fn calculate_owed_amount(
    auction_manager: &AuctionManager,
    auction: &AuctionData,
    metadata: &Metadata,
    winning_config_index: &Option<u8>,
    winning_config_item_index: &Option<u8>,
    creator_index: &Option<u8>,
) -> Result<u64, ProgramError> {
    let primary_sale_happened = match winning_config_index {
        Some(val) => {
            if let Some(item_index) = winning_config_item_index {
                auction_manager.state.winning_config_states[*val as usize].items
                    [*item_index as usize]
                    .primary_sale_happened
            } else {
                return Err(MetaplexError::InvalidWinningConfigItemIndex.into());
            }
        }
        None => {
            if let Some(config) = &auction_manager.state.participation_state {
                config.primary_sale_happened
            } else {
                false
            }
        }
    };

    let mut amount_available_to_split: u128 = match winning_config_index {
        Some(index) => auction.bid_state.amount(*index as usize) as u128,
        None => {
            // this means the amount owed is the amount collected from participation nft bids.
            if let Some(state) = &auction_manager.state.participation_state {
                state.collected_to_accept_payment as u128
            } else {
                0
            }
        }
    };

    if winning_config_index.is_some() {
        msg!("Winning config index {:?}", winning_config_index.unwrap());
    }
    if winning_config_item_index.is_some() {
        msg!(
            "Winning config item index {:?}",
            winning_config_item_index.unwrap()
        );
    }
    if creator_index.is_some() {
        msg!("Creator index {:?}", creator_index.unwrap());
    }

    msg!("Amount available to split {:?}", amount_available_to_split);
    let numerator: u128 = match creator_index {
        Some(_) => {
            if primary_sale_happened {
                // during secondary sale, artists get a percentage of the proceeds
                metadata.data.seller_fee_basis_points as u128
            } else {
                // during primary sale, artists get all of the proceeds
                10000
            }
        }
        None => {
            if primary_sale_happened {
                // during secondary sale, auctioneer gets whats left after artists get their cut
                (10000 - metadata.data.seller_fee_basis_points) as u128
            } else {
                // during primary sale, auctioneer (creator index not provided)
                // get none of the proceeds
                0u128
            }
        }
    };

    msg!("Numerator {:?}", numerator);

    // Each artist gets a cut of the overall share all artists get. IE if 2 artists contributed and one
    // did 70% and the other 30%, the artist further multiplier of A is 7000 and the other is 3000,
    // because we convert their shares of 70 and 30 to basis point units of 7000 and 3000.
    let artist_further_multiplier = match creator_index {
        Some(index) => match &metadata.data.creators {
            Some(creators) => (creators[*index as usize].share as u128) * 100u128,
            None => return Err(MetaplexError::CreatorIndexExpected.into()),
        },
        None => 10000,
    };

    msg!("Artist further multiplier {:?}", artist_further_multiplier);

    // Numerator represents the whittling to cut the artist or auctioneer's piece  off of the
    // total amount available. So if it's the auctioneer and they get 90% in a secondary sale, this would
    // be (9000/10000) * bid amount, numerator is 9000. Or if it's the artists collective cut, this would
    // be 1000.
    amount_available_to_split = amount_available_to_split
        .checked_mul(numerator)
        .ok_or(MetaplexError::NumericalOverflowError)?;

    msg!(
        "Amount available to split after numerator mult {:?}",
        amount_available_to_split,
    );

    // Artist further multiplier is the numerator of the fraction that is multiplied for the specific
    // artist involved. So if artist A gets 70% of the total artist cut then we'd multiply the
    // artist contribution by a further 7/10, so this would be 7000 basis points, so we're doing *7000
    // here.
    amount_available_to_split = amount_available_to_split
        .checked_mul(artist_further_multiplier)
        .ok_or(MetaplexError::NumericalOverflowError)?;

    msg!(
        "Amount available to split after artist further multiplier mult {:?}",
        amount_available_to_split,
    );
    if amount_available_to_split == 0 {
        // cant do checked_ceil_div on 0
        return Ok(0u64);
    }

    let proportion_divisor = match winning_config_index {
        Some(val) => auction_manager.settings.winning_configs[*val as usize]
            .items
            .len() as u128,
        None => 1,
    };

    // Since we have multiple prizes need to split each prize's contribution by it's portion of config
    let proportional_amount_available_to_split = amount_available_to_split
        .checked_div(proportion_divisor)
        .ok_or(MetaplexError::NumericalOverflowError)?;

    msg!(
        "Divided the amount by {:?} to get {:?} due to sharing reward with other prizes",
        proportion_divisor,
        proportional_amount_available_to_split
    );

    // We do two 10000's - one for the first numerator/10000 fraction and one for the artist contribution
    // For the auctioneer's case, the second 10000 cancels out to 1 because there is no further
    // whittling there (auctioneer shares with nobody) but for the artist they may be sharing
    // with another artist, say a 70/30 split, so we need to further multiply the amount available by
    // 7/10ths or something.
    let final_amount_available_to_split = proportional_amount_available_to_split
        .checked_div(10000 * 10000)
        .ok_or(MetaplexError::NumericalOverflowError)?;
    msg!("Final amount mult {:?}", final_amount_available_to_split);

    Ok(final_amount_available_to_split as u64)
}

pub fn process_empty_payment_account(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    args: EmptyPaymentAccountArgs,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let accept_payment_info = next_account_info(account_info_iter)?;
    let destination_info = next_account_info(account_info_iter)?;
    let auction_manager_info = next_account_info(account_info_iter)?;
    let payout_ticket_info = next_account_info(account_info_iter)?;
    let payer_info = next_account_info(account_info_iter)?;
    let metadata_info = next_account_info(account_info_iter)?;
    let master_edition_info = next_account_info(account_info_iter)?;
    let safety_deposit_info = next_account_info(account_info_iter)?;
    let store_info = next_account_info(account_info_iter)?;
    let vault_info = next_account_info(account_info_iter)?;
    let auction_info = next_account_info(account_info_iter)?;
    let token_program_info = next_account_info(account_info_iter)?;
    let system_info = next_account_info(account_info_iter)?;
    let rent_info = next_account_info(account_info_iter)?;

    let rent = &Rent::from_account_info(&rent_info)?;

    let auction_manager = AuctionManager::from_account_info(auction_manager_info)?;
    let store = Store::from_account_info(store_info)?;
    let safety_deposit = SafetyDepositBox::from_account_info(safety_deposit_info)?;
    let metadata = Metadata::from_account_info(metadata_info)?;
    let auction = AuctionData::from_account_info(auction_info)?;
    let destination: Account = assert_initialized(destination_info)?;
    let accept_payment: Account = assert_initialized(accept_payment_info)?;

    if auction_manager.store != *store_info.key {
        return Err(MetaplexError::AuctionManagerStoreMismatch.into());
    }

    msg!(
        "At this point, accept payment has {:?} in it",
        accept_payment.amount
    );

    // Before continuing further, assert all bid monies have been pushed to the main escrow
    // account so that we have a complete (less the unredeemed participation nft bids) accounting
    // to work with
    for i in 0..auction.num_winners() {
        if !auction_manager.state.winning_config_states[i as usize].money_pushed_to_accept_payment {
            return Err(MetaplexError::NotAllBidsClaimed.into());
        }
    }

    if *token_program_info.key != store.token_program {
        return Err(MetaplexError::AuctionManagerTokenProgramMismatch.into());
    }

    assert_owned_by(auction_manager_info, program_id)?;
    if !payout_ticket_info.data_is_empty() {
        assert_owned_by(payout_ticket_info, program_id)?;
    }
    assert_owned_by(destination_info, token_program_info.key)?;
    assert_owned_by(accept_payment_info, token_program_info.key)?;
    assert_owned_by(metadata_info, &store.token_metadata_program)?;
    if *master_edition_info.key != solana_program::system_program::id() {
        assert_owned_by(master_edition_info, &store.token_metadata_program)?;
    }
    assert_owned_by(safety_deposit_info, &store.token_vault_program)?;
    assert_owned_by(store_info, program_id)?;
    assert_owned_by(vault_info, &store.token_vault_program)?;
    assert_owned_by(auction_info, &store.auction_program)?;
    assert_rent_exempt(rent, destination_info)?;

    // Assert the winning config points to the safety deposit you sent up
    assert_winning_config_safety_deposit_validity(
        &auction_manager,
        &safety_deposit,
        args.winning_config_index,
        args.winning_config_item_index,
    )?;

    // assert the destination account matches the ownership expected to creator or auction manager authority
    // given in the argument's creator index
    assert_destination_ownership_validity(
        &auction_manager,
        &metadata,
        destination_info,
        &destination,
        &store,
        args.creator_index,
    )?;

    // further assert that the vault and safety deposit are correctly matched to the auction manager
    if auction_manager.vault != *vault_info.key {
        return Err(MetaplexError::AuctionManagerVaultMismatch.into());
    }

    if auction_manager.auction != *auction_info.key {
        return Err(MetaplexError::AuctionManagerAuctionMismatch.into());
    }

    if safety_deposit.vault != *vault_info.key {
        return Err(MetaplexError::SafetyDepositBoxVaultMismatch.into());
    }

    // assert that the metadata sent up is the metadata in the safety deposit
    if metadata.mint != safety_deposit.token_mint {
        if master_edition_info.data.borrow()[0]
            == spl_token_metadata::state::Key::MasterEditionV1 as u8
        {
            // Could be a limited edition, in which case printing tokens or auth tokens were offered, not the original.
            let master_edition: MasterEditionV1 =
                MasterEditionV1::from_account_info(master_edition_info)?;
            if master_edition.printing_mint != safety_deposit.token_mint
                && master_edition.one_time_printing_authorization_mint != safety_deposit.token_mint
            {
                return Err(MetaplexError::SafetyDepositBoxMetadataMismatch.into());
            }
        } else {
            return Err(MetaplexError::SafetyDepositBoxMetadataMismatch.into());
        }
    }

    // make sure the accept payment account is right
    if auction_manager.accept_payment != *accept_payment_info.key {
        return Err(MetaplexError::AcceptPaymentMismatch.into());
    }

    if destination.mint != accept_payment.mint {
        return Err(MetaplexError::AcceptPaymentMintMismatch.into());
    }

    let winning_config_index_key: String = match args.winning_config_index {
        Some(val) => val.to_string(),
        None => "participation".to_owned(),
    };

    let winning_config_item_index_key: String = match args.winning_config_item_index {
        Some(val) => val.to_string(),
        None => "0".to_owned(),
    };

    let creator_index_key: String = match args.creator_index {
        Some(val) => val.to_string(),
        None => "auctioneer".to_owned(),
    };

    let payout_bump = assert_derivation(
        program_id,
        payout_ticket_info,
        &[
            PREFIX.as_bytes(),
            auction_manager_info.key.as_ref(),
            winning_config_index_key.as_bytes(),
            winning_config_item_index_key.as_bytes(),
            creator_index_key.as_bytes(),
            &safety_deposit_info.key.as_ref(),
            &destination.owner.as_ref(),
        ],
    )?;

    let payout_seeds = &[
        PREFIX.as_bytes(),
        auction_manager_info.key.as_ref(),
        winning_config_index_key.as_bytes(),
        winning_config_item_index_key.as_bytes(),
        creator_index_key.as_bytes(),
        &safety_deposit_info.key.as_ref(),
        &destination.owner.as_ref(),
        &[payout_bump],
    ];

    if payout_ticket_info.data_is_empty() {
        create_or_allocate_account_raw(
            *program_id,
            payout_ticket_info,
            rent_info,
            system_info,
            payer_info,
            MAX_PAYOUT_TICKET_SIZE,
            payout_seeds,
        )?;
    }

    let mut payout_ticket = PayoutTicket::from_account_info(payout_ticket_info)?;
    payout_ticket.recipient = destination.owner;
    payout_ticket.key = Key::PayoutTicketV1;

    let amount = calculate_owed_amount(
        &auction_manager,
        &auction,
        &metadata,
        &args.winning_config_index,
        &args.winning_config_item_index,
        &args.creator_index,
    )?;

    let final_amount = amount
        .checked_sub(payout_ticket.amount_paid)
        .ok_or(MetaplexError::NumericalOverflowError)?;

    if final_amount > 0 {
        payout_ticket.amount_paid = payout_ticket
            .amount_paid
            .checked_add(final_amount)
            .ok_or(MetaplexError::NumericalOverflowError)?;

        let bump_seed = assert_derivation(
            program_id,
            auction_manager_info,
            &[PREFIX.as_bytes(), &auction_manager.auction.as_ref()],
        )?;

        let authority_seeds = &[
            PREFIX.as_bytes(),
            &auction_manager.auction.as_ref(),
            &[bump_seed],
        ];

        spl_token_transfer(
            accept_payment_info.clone(),
            destination_info.clone(),
            final_amount,
            auction_manager_info.clone(),
            authority_seeds,
            token_program_info.clone(),
        )?;
    }

    payout_ticket.serialize(&mut *payout_ticket_info.data.borrow_mut())?;

    Ok(())
}
