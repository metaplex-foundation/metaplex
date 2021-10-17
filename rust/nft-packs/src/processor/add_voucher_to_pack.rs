//! Add voucher to pack instruction processing

use crate::{
    error::NFTPacksError,
    find_pack_voucher_program_address, find_program_authority,
    instruction::AddVoucherToPackArgs,
    math::SafeMath,
    state::{InitPackVoucherParams, PackSet, PackSetState, PackVoucher},
    utils::*,
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program_pack::Pack,
    pubkey::Pubkey,
    sysvar::{rent::Rent, Sysvar},
};
use spl_token::state::Account;
use spl_token_metadata::{
    error::MetadataError,
    state::{MasterEdition, MasterEditionV2, Metadata, EDITION, PREFIX},
    utils::{assert_derivation, assert_initialized},
};

/// Process AddVoucherToPack instruction
pub fn add_voucher_to_pack(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    args: AddVoucherToPackArgs,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let pack_set_info = next_account_info(account_info_iter)?;
    let pack_voucher_info = next_account_info(account_info_iter)?;
    let authority_info = next_account_info(account_info_iter)?;
    let master_edition_info = next_account_info(account_info_iter)?;
    let master_metadata_info = next_account_info(account_info_iter)?;
    let mint_info = next_account_info(account_info_iter)?;
    let source_info = next_account_info(account_info_iter)?;
    let token_account_info = next_account_info(account_info_iter)?;
    let program_authority_info = next_account_info(account_info_iter)?;
    let rent_info = next_account_info(account_info_iter)?;
    let rent = &Rent::from_account_info(rent_info)?;

    assert_signer(authority_info)?;
    assert_owned_by(pack_set_info, program_id)?;
    assert_owned_by(master_edition_info, &spl_token_metadata::id())?;
    assert_owned_by(master_metadata_info, &spl_token_metadata::id())?;

    let AddVoucherToPackArgs {
        number_to_open,
        action_on_prove,
    } = args;

    let mut pack_set = PackSet::unpack(&pack_set_info.data.borrow_mut())?;
    assert_account_key(authority_info, &pack_set.authority)?;

    if pack_set.pack_state != PackSetState::NotActivated {
        return Err(NFTPacksError::WrongPackState.into());
    }

    // new pack voucher index
    let index = pack_set.pack_vouchers.error_increment()?;

    let (pack_voucher_pubkey, bump_seed) =
        find_pack_voucher_program_address(program_id, pack_set_info.key, index);
    assert_account_key(pack_voucher_info, &pack_voucher_pubkey)?;

    let signers_seeds = &[
        PackVoucher::PREFIX.as_bytes(),
        &pack_set_info.key.to_bytes()[..32],
        &index.to_be_bytes(),
        &[bump_seed],
    ];

    msg!("Creating pack voucher account...");
    create_account::<PackVoucher>(
        program_id,
        authority_info.clone(),
        pack_voucher_info.clone(),
        &[signers_seeds],
        rent,
    )?;

    let mut pack_voucher = PackVoucher::unpack_unchecked(&pack_voucher_info.data.borrow_mut())?;
    assert_uninitialized(&pack_voucher)?;

    let token_metadata_program_id = spl_token_metadata::id();

    // Check for v2
    let master_edition = MasterEditionV2::from_account_info(master_edition_info)?;

    if let Some(m_e_max_supply) = master_edition.max_supply() {
        if (number_to_open as u64) > m_e_max_supply {
            return Err(NFTPacksError::WrongNumberToOpen.into());
        }
    }

    let master_metadata = Metadata::from_account_info(master_metadata_info)?;
    assert_account_key(mint_info, &master_metadata.mint)?;
    assert_derivation(
        &token_metadata_program_id,
        master_edition_info,
        &[
            PREFIX.as_bytes(),
            token_metadata_program_id.as_ref(),
            master_metadata.mint.as_ref(),
            EDITION.as_bytes(),
        ],
    )?;

    let source: Account = assert_initialized(source_info)?;
    if source.mint != master_metadata.mint {
        return Err(MetadataError::MintMismatch.into());
    }

    let (program_authority, _) = find_program_authority(program_id);
    assert_account_key(program_authority_info, &program_authority)?;

    // Initialize token account
    spl_initialize_account(
        token_account_info.clone(),
        mint_info.clone(),
        program_authority_info.clone(),
        rent_info.clone(),
    )?;

    // Transfer from source to token account
    spl_token_transfer(
        source_info.clone(),
        token_account_info.clone(),
        authority_info.clone(),
        1, // transfer master edition
        &[],
    )?;

    pack_voucher.init(InitPackVoucherParams {
        pack_set: *pack_set_info.key,
        master: *master_edition_info.key,
        metadata: *master_metadata_info.key,
        token_account: *token_account_info.key,
        number_to_open,
        action_on_prove,
    });

    pack_set.add_pack_voucher();

    PackVoucher::pack(pack_voucher, *pack_voucher_info.data.borrow_mut())?;
    PackSet::pack(pack_set, *pack_set_info.data.borrow_mut())?;

    Ok(())
}
