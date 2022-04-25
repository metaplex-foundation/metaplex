use crate::{
    error::MetadataError,
    state::{Data, DataV2, Metadata},
    utils::{
        assert_data_valid, assert_owned_by, assert_update_authority_is_correct,
        process_create_metadata_accounts_logic, puff_out_data_fields,
        CreateMetadataAccountsLogicArgs,
    },
};
use borsh::BorshSerialize;
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    pubkey::Pubkey,
};

pub fn process_deprecated_create_metadata_accounts<'a>(
    program_id: &'a Pubkey,
    accounts: &'a [AccountInfo<'a>],
    data: Data,
    allow_direct_creator_writes: bool,
    is_mutable: bool,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let metadata_account_info = next_account_info(account_info_iter)?;
    let mint_info = next_account_info(account_info_iter)?;
    let mint_authority_info = next_account_info(account_info_iter)?;
    let payer_account_info = next_account_info(account_info_iter)?;
    let update_authority_info = next_account_info(account_info_iter)?;
    let system_account_info = next_account_info(account_info_iter)?;
    let rent_info = next_account_info(account_info_iter)?;

    process_create_metadata_accounts_logic(
        &program_id,
        CreateMetadataAccountsLogicArgs {
            metadata_account_info,
            mint_info,
            mint_authority_info,
            payer_account_info,
            update_authority_info,
            system_account_info,
            rent_info,
        },
        DataV2 {
            name: data.name,
            uri: data.uri,
            symbol: data.symbol,
            creators: data.creators,
            seller_fee_basis_points: data.seller_fee_basis_points,
            collection: None,
            uses: None,
        },
        allow_direct_creator_writes,
        is_mutable,
        false,
        false,
    )
}

/// Update existing account instruction
pub fn process_deprecated_update_metadata_accounts(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    optional_data: Option<Data>,
    update_authority: Option<Pubkey>,
    primary_sale_happened: Option<bool>,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let metadata_account_info = next_account_info(account_info_iter)?;
    let update_authority_info = next_account_info(account_info_iter)?;
    let mut metadata = Metadata::from_account_info(metadata_account_info)?;

    assert_owned_by(metadata_account_info, program_id)?;
    assert_update_authority_is_correct(&metadata, update_authority_info)?;

    if let Some(data) = optional_data {
        if metadata.is_mutable {
            assert_data_valid(
                &data,
                update_authority_info.key,
                &metadata,
                false,
                update_authority_info.is_signer,
                true,
            )?;
            metadata.data = data;
        } else {
            return Err(MetadataError::DataIsImmutable.into());
        }
    }

    if let Some(val) = update_authority {
        metadata.update_authority = val;
    }

    if let Some(val) = primary_sale_happened {
        if val {
            metadata.primary_sale_happened = val
        } else {
            return Err(MetadataError::PrimarySaleCanOnlyBeFlippedToTrue.into());
        }
    }

    puff_out_data_fields(&mut metadata);

    metadata.serialize(&mut *metadata_account_info.data.borrow_mut())?;
    Ok(())
}
