use crate::{error::ErrorCode, state::SellingResourceState, utils::*, InitSellingResource};
use anchor_lang::prelude::*;
use anchor_spl::token;

impl<'info> InitSellingResource<'info> {
    pub fn process(
        &mut self,
        _master_edition_bump: u8,
        _vault_owner_bump: u8,
        max_supply: Option<u64>,
    ) -> Result<()> {
        let store = &self.store;
        let admin = &self.admin;
        let selling_resource = &mut self.selling_resource;
        let selling_resource_owner = &self.selling_resource_owner;
        let resource_mint = &self.resource_mint;
        let master_edition_info = &self.master_edition.to_account_info();
        let metadata = &self.metadata;
        let vault = &self.vault;
        let owner = &self.owner;
        let resource_token = &self.resource_token;
        let token_program = &self.token_program;

        // Check `MasterEdition` derivation
        assert_derivation(
            &mpl_token_metadata::id(),
            master_edition_info,
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                resource_mint.key().as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
            ],
        )?;

        // Check, that provided metadata is correct
        assert_derivation(
            &mpl_token_metadata::id(),
            metadata,
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                resource_mint.key().as_ref(),
            ],
        )?;

        let metadata =
            mpl_token_metadata::state::Metadata::from_account_info(&metadata.to_account_info())?;

        // Check, that at least one creator exists in primary sale
        if !metadata.primary_sale_happened {
            if let Some(creators) = metadata.data.creators {
                if creators.len() == 0 {
                    return Err(ErrorCode::MetadataCreatorsIsEmpty.into());
                }
            } else {
                return Err(ErrorCode::MetadataCreatorsIsEmpty.into());
            }
        }

        let master_edition =
            mpl_token_metadata::state::MasterEditionV2::from_account_info(master_edition_info)?;

        let mut actual_max_supply = max_supply;

        // Ensure, that provided `max_supply` is under `MasterEditionV2::max_supply` bounds
        if let Some(me_max_supply) = master_edition.max_supply {
            let x = if let Some(max_supply) = max_supply {
                let available_supply = me_max_supply - master_edition.supply;
                if max_supply > available_supply {
                    return Err(ErrorCode::SupplyIsGtThanAvailable.into());
                } else {
                    max_supply
                }
            } else {
                return Err(ErrorCode::SupplyIsNotProvided.into());
            };

            actual_max_supply = Some(x);
        }

        // Transfer `MasterEdition` ownership
        let cpi_program = token_program.to_account_info();
        let cpi_accounts = token::Transfer {
            from: resource_token.to_account_info(),
            to: vault.to_account_info(),
            authority: admin.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, 1)?;

        selling_resource.store = store.key();
        selling_resource.owner = selling_resource_owner.key();
        selling_resource.resource = resource_mint.key();
        selling_resource.vault = vault.key();
        selling_resource.vault_owner = owner.key();
        selling_resource.supply = 0;
        selling_resource.max_supply = actual_max_supply;
        selling_resource.state = SellingResourceState::Created;

        Ok(())
    }
}
