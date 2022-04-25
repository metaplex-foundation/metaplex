//! Init pack instruction processing

use crate::{
    error::NFTPacksError,
    instruction::InitPackSetArgs,
    state::{InitPackSetParams, PackSet, MAX_DESCRIPTION_LEN, MAX_URI_LENGTH},
    utils::*,
};
use mpl_metaplex::state::{Store, WhitelistedCreator, PREFIX};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack},
    pubkey::Pubkey,
    sysvar::{clock::Clock, rent::Rent, Sysvar},
};

/// Process InitPack instruction
pub fn init_pack(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    args: InitPackSetArgs,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let pack_set_account = next_account_info(account_info_iter)?;
    let authority_account = next_account_info(account_info_iter)?;
    let store_account = next_account_info(account_info_iter)?;
    let rent_info = next_account_info(account_info_iter)?;
    let rent = &Rent::from_account_info(rent_info)?;
    let clock_info = next_account_info(account_info_iter)?;
    let clock = &Clock::from_account_info(clock_info)?;
    let whitelisted_creator_account = next_account_info(account_info_iter).ok();

    assert_rent_exempt(rent, pack_set_account)?;
    assert_signer(authority_account)?;
    assert_owned_by(store_account, &mpl_metaplex::id())?;
    assert_admin_whitelisted(
        store_account,
        whitelisted_creator_account,
        authority_account,
    )?;

    let mut pack_set = PackSet::unpack_unchecked(&pack_set_account.data.borrow_mut())?;

    if pack_set.is_initialized() {
        return Err(ProgramError::AccountAlreadyInitialized);
    }

    if args.uri.len() > MAX_URI_LENGTH {
        return Err(NFTPacksError::UriTooLong.into());
    }

    if args.description.len() > MAX_DESCRIPTION_LEN {
        return Err(NFTPacksError::DescriptionTooLong.into());
    }

    if args.allowed_amount_to_redeem == 0 {
        return Err(NFTPacksError::WrongAllowedAmountToRedeem.into());
    }

    let current_timestamp = clock.unix_timestamp as u64;

    let redeem_start_date = args.redeem_start_date.unwrap_or(current_timestamp);

    if redeem_start_date < current_timestamp {
        return Err(NFTPacksError::WrongRedeemDate.into());
    }

    if let Some(redeem_end_date) = args.redeem_end_date {
        if redeem_end_date <= redeem_start_date {
            return Err(NFTPacksError::WrongRedeemDate.into());
        }
    }

    pack_set.init(InitPackSetParams {
        name: args.name,
        description: args.description,
        uri: args.uri,
        authority: *authority_account.key,
        store: *store_account.key,
        mutable: args.mutable,
        distribution_type: args.distribution_type,
        allowed_amount_to_redeem: args.allowed_amount_to_redeem,
        redeem_start_date: redeem_start_date,
        redeem_end_date: args.redeem_end_date,
    });

    pack_set.puff_out_data_fields();

    PackSet::pack(pack_set, *pack_set_account.data.borrow_mut())?;

    Ok(())
}

fn assert_admin_whitelisted(
    store_account: &AccountInfo,
    whitelisted_creator_account: Option<&AccountInfo>,
    authority_account: &AccountInfo,
) -> Result<(), ProgramError> {
    let store = Store::from_account_info(store_account)?;
    if store.public {
        return Ok(());
    }

    if whitelisted_creator_account.is_none() {
        return Err(NFTPacksError::WrongWhitelistedCreator.into());
    }

    let whitelisted_creator_account = whitelisted_creator_account.unwrap();

    assert_owned_by(whitelisted_creator_account, &mpl_metaplex::id())?;

    let whitelisted_creator = WhitelistedCreator::from_account_info(whitelisted_creator_account)?;
    if !whitelisted_creator.activated {
        return Err(NFTPacksError::WhitelistedCreatorInactive.into());
    }

    let (key, _) = Pubkey::find_program_address(
        &[
            PREFIX.as_bytes(),
            mpl_metaplex::id().as_ref(),
            store_account.key.as_ref(),
            authority_account.key.as_ref(),
        ],
        &mpl_metaplex::id(),
    );

    if key != *whitelisted_creator_account.key
        || whitelisted_creator.address != *authority_account.key
    {
        return Err(NFTPacksError::WrongWhitelistedCreator.into());
    }

    Ok(())
}
