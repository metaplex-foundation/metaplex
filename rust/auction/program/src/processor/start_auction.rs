use crate::{
    errors::AuctionError,
    processor::{AuctionData, AuctionState, Bid, BidState, WinnerLimit},
    utils::{assert_derivation, assert_owned_by, assert_signer, create_or_allocate_account_raw},
    PREFIX,
};

use {
    borsh::{BorshDeserialize, BorshSerialize},
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        clock::Clock,
        entrypoint::ProgramResult,
        msg,
        program_error::ProgramError,
        pubkey::Pubkey,
        sysvar::Sysvar,
    },
    std::mem,
};

struct Accounts<'a, 'b: 'a> {
    authority: &'a AccountInfo<'b>,
    auction: &'a AccountInfo<'b>,
    clock_sysvar: &'a AccountInfo<'b>,
}

fn parse_accounts<'a, 'b: 'a>(
    program_id: &Pubkey,
    accounts: &'a [AccountInfo<'b>],
) -> Result<Accounts<'a, 'b>, ProgramError> {
    let account_iter = &mut accounts.iter();
    let accounts = Accounts {
        authority: next_account_info(account_iter)?,
        auction: next_account_info(account_iter)?,
        clock_sysvar: next_account_info(account_iter)?,
    };
    assert_owned_by(accounts.auction, program_id)?;
    assert_signer(accounts.authority)?;
    Ok(accounts)
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq)]
pub struct StartAuctionArgs {
    /// The resource being auctioned. See AuctionData.
    pub resource: Pubkey,
}

pub fn start_auction<'a, 'b: 'a>(
    program_id: &Pubkey,
    accounts: &'a [AccountInfo<'b>],
    args: StartAuctionArgs,
) -> ProgramResult {
    msg!("+ Processing StartAuction");
    let accounts = parse_accounts(program_id, accounts)?;
    let clock = Clock::from_account_info(accounts.clock_sysvar)?;

    // Derive auction address so we can make the modifications necessary to start it.
    assert_derivation(
        program_id,
        accounts.auction,
        &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            &args.resource.as_ref(),
        ],
    )?;

    // Initialise a new auction. The end time is calculated relative to now.
    let mut auction = AuctionData::from_account_info(accounts.auction)?;

    // Check authority is correct.
    if auction.authority != *accounts.authority.key {
        return Err(AuctionError::InvalidAuthority.into());
    }

    // Calculate the relative end time.
    let ended_at = if let Some(end_auction_at) = auction.end_auction_at {
        match clock.unix_timestamp.checked_add(end_auction_at) {
            Some(val) => Some(val),
            None => return Err(AuctionError::NumericalOverflowError.into()),
        }
    } else {
        None
    };

    AuctionData {
        ended_at,
        state: auction.state.start()?,
        ..auction
    }
    .serialize(&mut *accounts.auction.data.borrow_mut())?;

    Ok(())
}
