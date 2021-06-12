use {
    crate::{
        error::MetaplexError,
        state::{AuctionManager, AuctionManagerStatus, Store, PREFIX},
        utils::{assert_authority_correct, assert_owned_by},
    },
    borsh::BorshSerialize,
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        entrypoint::ProgramResult,
        program::invoke_signed,
        pubkey::Pubkey,
    },
    spl_auction::instruction::{start_auction_instruction, StartAuctionArgs},
};

pub fn issue_start_auction<'a>(
    auction_program: AccountInfo<'a>,
    authority: AccountInfo<'a>,
    auction: AccountInfo<'a>,
    clock: AccountInfo<'a>,
    vault: Pubkey,
    signer_seeds: &[&[u8]],
) -> ProgramResult {
    invoke_signed(
        &start_auction_instruction(
            *auction_program.key,
            *authority.key,
            StartAuctionArgs { resource: vault },
        ),
        &[auction_program, authority, auction, clock],
        &[&signer_seeds],
    )?;

    Ok(())
}

pub fn process_start_auction(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let auction_manager_info = next_account_info(account_info_iter)?;
    let auction_info = next_account_info(account_info_iter)?;
    let authority_info = next_account_info(account_info_iter)?;
    let store_info = next_account_info(account_info_iter)?;
    let auction_program_info = next_account_info(account_info_iter)?;
    let clock_info = next_account_info(account_info_iter)?;

    let mut auction_manager = AuctionManager::from_account_info(auction_manager_info)?;
    let store = Store::from_account_info(store_info)?;

    assert_authority_correct(&auction_manager, authority_info)?;
    assert_owned_by(auction_info, &store.auction_program)?;
    assert_owned_by(auction_manager_info, program_id)?;
    assert_owned_by(store_info, program_id)?;

    if auction_manager.store != *store_info.key {
        return Err(MetaplexError::AuctionManagerStoreMismatch.into());
    }

    if auction_manager.auction != *auction_info.key {
        return Err(MetaplexError::AuctionManagerAuctionMismatch.into());
    }

    if store.auction_program != *auction_program_info.key {
        return Err(MetaplexError::AuctionManagerAuctionProgramMismatch.into());
    }

    if auction_manager.state.status != AuctionManagerStatus::Validated {
        return Err(MetaplexError::AuctionManagerMustBeValidated.into());
    }

    let seeds = &[PREFIX.as_bytes(), &auction_manager.auction.as_ref()];
    let (_, bump_seed) = Pubkey::find_program_address(seeds, &program_id);
    let authority_seeds = &[
        PREFIX.as_bytes(),
        &auction_manager.auction.as_ref(),
        &[bump_seed],
    ];

    issue_start_auction(
        auction_program_info.clone(),
        auction_manager_info.clone(),
        auction_info.clone(),
        clock_info.clone(),
        auction_manager.vault,
        authority_seeds,
    )?;

    auction_manager.state.status = AuctionManagerStatus::Running;

    auction_manager.serialize(&mut *auction_manager_info.data.borrow_mut())?;

    Ok(())
}
