//! Resets authority on an auction account.

use crate::{
    errors::AuctionError,
    processor::{AuctionData, BASE_AUCTION_DATA_SIZE},
    utils::assert_owned_by,
    PREFIX,
};

use {
    borsh::{BorshDeserialize, BorshSerialize},
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        entrypoint::ProgramResult,
        msg,
        pubkey::Pubkey,
    },
};

pub fn set_authority(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    msg!("+ Processing SetAuthority");
    let account_iter = &mut accounts.iter();
    let auction_act = next_account_info(account_iter)?;
    let current_authority = next_account_info(account_iter)?;
    let new_authority = next_account_info(account_iter)?;

    let mut auction = AuctionData::from_account_info(auction_act)?;
    assert_owned_by(auction_act, program_id)?;

    if auction.authority != *current_authority.key {
        return Err(AuctionError::InvalidAuthority.into());
    }

    if !current_authority.is_signer {
        return Err(AuctionError::InvalidAuthority.into());
    }

    // Make sure new authority actually exists in some form.
    if new_authority.data_is_empty() || new_authority.lamports() == 0 {
        msg!("Disallowing new authority because it does not exist.");
        return Err(AuctionError::InvalidAuthority.into());
    }

    auction.authority = *new_authority.key;
    auction.serialize(&mut *auction_act.data.borrow_mut())?;
    Ok(())
}
