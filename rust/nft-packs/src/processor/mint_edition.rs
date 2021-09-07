//! MintEditionWithCard and MintEditionWithVoucher instructions processing

use crate::{
    error::NFTPacksError,
    find_program_authority,
    math::SafeMath,
    state::{MasterEditionHolder, PackCard, PackSet, PackSetState, PackVoucher},
    utils::*,
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    program_error::ProgramError,
    program_pack::Pack,
    pubkey::Pubkey,
};
use spl_token_metadata::state::{Edition, MasterEditionV2};

///
pub struct MintEditionAccountsArgs<'a> {
    ///
    pub pack_set_account: &'a AccountInfo<'a>,
    ///
    pub minting_authority_account: &'a AccountInfo<'a>,
    ///
    pub master_edition_holder_account: &'a AccountInfo<'a>,
    ///
    pub new_metadata_account: &'a AccountInfo<'a>,
    ///
    pub new_edition_account: &'a AccountInfo<'a>,
    ///
    pub master_edition_account: &'a AccountInfo<'a>,
    ///
    pub new_mint_account: &'a AccountInfo<'a>,
    ///
    pub new_mint_authority_account: &'a AccountInfo<'a>,
    ///
    pub payer_account: &'a AccountInfo<'a>,
    ///
    pub owner_account: &'a AccountInfo<'a>,
    ///
    pub token_account: &'a AccountInfo<'a>,
    ///
    pub update_authority_account: &'a AccountInfo<'a>,
    ///
    pub master_metadata_account: &'a AccountInfo<'a>,
    ///
    pub master_mint_account: &'a AccountInfo<'a>,
}

/// Process MintEditionWithCard instruction
pub fn mint_edition_with_card<'a>(
    program_id: &Pubkey,
    accounts: &'a [AccountInfo<'a>],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let accounts_args = MintEditionAccountsArgs {
        pack_set_account: next_account_info(account_info_iter)?,
        minting_authority_account: next_account_info(account_info_iter)?,
        master_edition_holder_account: next_account_info(account_info_iter)?,
        new_metadata_account: next_account_info(account_info_iter)?,
        new_edition_account: next_account_info(account_info_iter)?,
        master_edition_account: next_account_info(account_info_iter)?,
        new_mint_account: next_account_info(account_info_iter)?,
        new_mint_authority_account: next_account_info(account_info_iter)?,
        payer_account: next_account_info(account_info_iter)?,
        owner_account: next_account_info(account_info_iter)?,
        token_account: next_account_info(account_info_iter)?,
        update_authority_account: next_account_info(account_info_iter)?,
        master_metadata_account: next_account_info(account_info_iter)?,
        master_mint_account: next_account_info(account_info_iter)?,
    };

    let mut pack_card: PackCard = PackCard::unpack(
        &accounts_args
            .master_edition_holder_account
            .data
            .borrow_mut(),
    )?;

    mint_edition(program_id, &pack_card, &accounts_args)?;

    pack_card.increment_supply()?;

    PackCard::pack(
        pack_card,
        *accounts_args
            .master_edition_holder_account
            .data
            .borrow_mut(),
    )?;

    Ok(())
}

/// Process MintEditionWithVoucher instruction
pub fn mint_edition_with_voucher<'a>(
    program_id: &Pubkey,
    accounts: &'a [AccountInfo<'a>],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let accounts_args = MintEditionAccountsArgs {
        pack_set_account: next_account_info(account_info_iter)?,
        minting_authority_account: next_account_info(account_info_iter)?,
        master_edition_holder_account: next_account_info(account_info_iter)?,
        new_metadata_account: next_account_info(account_info_iter)?,
        new_edition_account: next_account_info(account_info_iter)?,
        master_edition_account: next_account_info(account_info_iter)?,
        new_mint_account: next_account_info(account_info_iter)?,
        new_mint_authority_account: next_account_info(account_info_iter)?,
        payer_account: next_account_info(account_info_iter)?,
        owner_account: next_account_info(account_info_iter)?,
        token_account: next_account_info(account_info_iter)?,
        update_authority_account: next_account_info(account_info_iter)?,
        master_metadata_account: next_account_info(account_info_iter)?,
        master_mint_account: next_account_info(account_info_iter)?,
    };

    let mut pack_voucher = PackVoucher::unpack(
        &accounts_args
            .master_edition_holder_account
            .data
            .borrow_mut(),
    )?;

    mint_edition(program_id, &pack_voucher, &accounts_args)?;

    pack_voucher.increment_supply()?;

    PackVoucher::pack(
        pack_voucher,
        *accounts_args
            .master_edition_holder_account
            .data
            .borrow_mut(),
    )?;

    Ok(())
}

/// Process minting itself
pub fn mint_edition<T: MasterEditionHolder>(
    program_id: &Pubkey,
    master_edition_holder: &T,
    accounts: &MintEditionAccountsArgs,
) -> ProgramResult {
    let pack_set = PackSet::unpack(&accounts.pack_set_account.data.borrow_mut())?;

    assert_owned_by(accounts.pack_set_account, program_id)?;

    assert_signer(accounts.minting_authority_account)?;

    assert_account_key(
        accounts.minting_authority_account,
        &pack_set.minting_authority,
    )?;

    assert_account_key(
        accounts.pack_set_account,
        &master_edition_holder.get_pack_set(),
    )?;

    assert_account_key(
        accounts.token_account,
        &master_edition_holder.get_token_account(),
    )?;

    assert_account_key(
        accounts.master_edition_account,
        &master_edition_holder.get_master_edition(),
    )?;

    let (program_authority, bump_seed) = find_program_authority(program_id);
    assert_account_key(accounts.owner_account, &program_authority)?;

    let master_edition = MasterEditionV2::from_account_info(accounts.master_edition_account)?;

    spl_token_metadata_mint_new_edition_from_master_edition_via_token(
        accounts.new_metadata_account,
        accounts.new_edition_account,
        accounts.new_mint_account,
        accounts.new_mint_authority_account,
        accounts.payer_account,
        accounts.owner_account,
        accounts.token_account,
        accounts.master_metadata_account,
        accounts.master_edition_account,
        accounts.master_mint_account,
        master_edition.supply.error_increment()?,
        &[program_id.as_ref(), &[bump_seed]],
    )?;

    Ok(())
}
