use {
    crate::{
        error::MetaplexError,
        instruction::EndAuctionArgs as MetaplexEndAuctionArgs,
        state::{get_auction_manager, AuctionManagerStatus, Store, PREFIX},
        utils::{assert_authority_correct, assert_owned_by},
    },
    metaplex_auction::{
        instruction::{end_auction_instruction, EndAuctionArgs},
        processor::{AuctionData, AuctionDataExtended, BidState, BidStateData},
    },
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        borsh::try_from_slice_unchecked,
        entrypoint::ProgramResult,
        program::invoke_signed,
        program_error::ProgramError,
        pubkey::Pubkey,
    },
};

pub fn issue_end_auction<'a>(
    auction_program: AccountInfo<'a>,
    authority: AccountInfo<'a>,
    auction: AccountInfo<'a>,
    clock: AccountInfo<'a>,
    vault: Pubkey,
    reveal: Option<(u64, u64)>,
    signer_seeds: &[&[u8]],
) -> ProgramResult {
    invoke_signed(
        &end_auction_instruction(
            *auction_program.key,
            *authority.key,
            EndAuctionArgs {
                resource: vault,
                reveal,
            },
        ),
        &[auction_program, authority, auction, clock],
        &[&signer_seeds],
    )?;

    Ok(())
}

pub fn process_end_auction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    args: MetaplexEndAuctionArgs,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let mut auction_manager_info = next_account_info(account_info_iter)?;
    let auction_info = next_account_info(account_info_iter)?;
    let auction_data_extended_info = next_account_info(account_info_iter)?;
    let authority_info = next_account_info(account_info_iter)?;
    let store_info = next_account_info(account_info_iter)?;
    let auction_program_info = next_account_info(account_info_iter)?;
    let clock_info = next_account_info(account_info_iter)?;
    let bid_state_data = next_account_info(account_info_iter).ok();

    let mut auction_manager = get_auction_manager(auction_manager_info)?;
    let auction = AuctionData::from_account_info(auction_info)?;
    let auction_data_extended = AuctionDataExtended::from_account_info(auction_data_extended_info)?;
    let store = Store::from_account_info(store_info)?;

    if auction.authority != *auction_manager_info.key {
        return Err(MetaplexError::AuctionAuthorityMismatch.into());
    }

    assert_authority_correct(&auction_manager.authority(), authority_info)?;
    assert_owned_by(auction_info, &store.auction_program)?;
    assert_owned_by(auction_manager_info, program_id)?;
    assert_owned_by(store_info, program_id)?;

    if auction_manager.store() != *store_info.key {
        return Err(MetaplexError::AuctionManagerStoreMismatch.into());
    }

    if auction_manager.auction() != *auction_info.key {
        return Err(MetaplexError::AuctionManagerAuctionMismatch.into());
    }

    if store.auction_program != *auction_program_info.key {
        return Err(MetaplexError::AuctionManagerAuctionProgramMismatch.into());
    }

    if auction_manager.status() == AuctionManagerStatus::Finished {
        return Err(MetaplexError::AuctionManagerInFishedState.into());
    }

    // Obtain `BidStateData` if provided to instruction
    let bid_state_data_acc: Option<(BidStateData, Pubkey)> =
        if let Some(bid_state_data_key) = auction_data_extended.bid_state_data {
            let bid_state_data = bid_state_data.ok_or(ProgramError::InvalidArgument)?;

            if *bid_state_data.key != bid_state_data_key {
                return Err(ProgramError::InvalidArgument);
            }

            Some((
                try_from_slice_unchecked(&bid_state_data.data.borrow_mut())?,
                *bid_state_data.key,
            ))
        } else {
            None
        };

    // Obtain `BidState` instance
    let bid_state = if let Some((bid_state_data, _)) = &bid_state_data_acc {
        &bid_state_data.state
    } else {
        &auction.bid_state
    };

    let auction_key = auction_manager.auction();
    let seeds = &[PREFIX.as_bytes(), &auction_key.as_ref()];
    let (_, bump_seed) = Pubkey::find_program_address(seeds, &program_id);
    let authority_seeds = &[PREFIX.as_bytes(), &auction_key.as_ref(), &[bump_seed]];

    issue_end_auction(
        auction_program_info.clone(),
        auction_manager_info.clone(),
        auction_info.clone(),
        clock_info.clone(),
        auction_manager.vault(),
        args.reveal,
        authority_seeds,
    )?;

    if auction_data_extended.instant_sale_price.is_some() {
        match bid_state {
            BidState::EnglishAuction { .. } => {
                auction_manager.set_status(AuctionManagerStatus::Disbursing);
            }
            BidState::OpenEdition { .. } => {
                auction_manager.set_status(AuctionManagerStatus::Finished);
            }
        }
    } else {
        auction_manager.set_status(AuctionManagerStatus::Disbursing);
    }

    auction_manager.save(&mut auction_manager_info)?;

    Ok(())
}
