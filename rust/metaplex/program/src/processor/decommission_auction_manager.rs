use {
    crate::{
        error::MetaplexError,
        state::{get_auction_manager, AuctionManagerStatus, Store, PREFIX},
        utils::{
            assert_authority_correct, assert_derivation, assert_owned_by, assert_signer,
            end_auction,
        },
    },
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        entrypoint::ProgramResult,
        pubkey::Pubkey,
    },
    spl_auction::processor::AuctionData,
    spl_token_vault::state::Vault,
};

pub fn process_decommission_auction_manager<'a>(
    program_id: &'a Pubkey,
    accounts: &'a [AccountInfo<'a>],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let mut auction_manager_info = next_account_info(account_info_iter)?;
    let auction_info = next_account_info(account_info_iter)?;
    let authority_info = next_account_info(account_info_iter)?;
    let vault_info = next_account_info(account_info_iter)?;
    let store_info = next_account_info(account_info_iter)?;
    let auction_program_info = next_account_info(account_info_iter)?;
    let clock_info = next_account_info(account_info_iter)?;
    assert_owned_by(auction_manager_info, program_id)?;
    assert_owned_by(store_info, program_id)?;
    assert_signer(authority_info)?;

    let mut auction_manager = get_auction_manager(auction_manager_info)?;
    let vault = Vault::from_account_info(vault_info)?;
    let auction = AuctionData::from_account_info(auction_info)?;

    let store = Store::from_account_info(store_info)?;
    assert_authority_correct(&auction_manager.authority(), authority_info)?;

    if auction.authority != *auction_manager_info.key {
        return Err(MetaplexError::AuctionAuthorityMismatch.into());
    }

    if vault.authority != *auction_manager_info.key {
        return Err(MetaplexError::VaultAuthorityMismatch.into());
    }

    if auction_manager.status() != AuctionManagerStatus::Initialized {
        return Err(MetaplexError::InvalidStatus.into());
    }

    if auction_manager.store() != *store_info.key {
        return Err(MetaplexError::AuctionManagerStoreMismatch.into());
    }

    if *auction_program_info.key != store.auction_program {
        return Err(MetaplexError::AuctionManagerAuctionProgramMismatch.into());
    }

    if auction_manager.auction() != *auction_info.key {
        return Err(MetaplexError::AuctionManagerAuctionMismatch.into());
    }

    let bump_seed = assert_derivation(
        program_id,
        auction_manager_info,
        &[PREFIX.as_bytes(), &auction_info.key.as_ref()],
    )?;

    let authority_seeds = &[PREFIX.as_bytes(), &auction_info.key.as_ref(), &[bump_seed]];

    end_auction(
        auction_manager.vault(),
        auction_info.clone(),
        auction_manager_info.clone(),
        auction_program_info.clone(),
        clock_info.clone(),
        authority_seeds,
    )?;

    auction_manager.set_status(AuctionManagerStatus::Disbursing);

    auction_manager.save(&mut auction_manager_info)?;

    Ok(())
}
