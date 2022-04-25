use crate::{error::ErrorCode, state::MarketState, utils::*, ClaimResource};
use anchor_lang::{prelude::*, solana_program::program_pack::Pack, System};
use anchor_spl::token;

impl<'info> ClaimResource<'info> {
    pub fn process(&mut self, vault_owner_bump: u8) -> Result<()> {
        let market = &self.market;
        let selling_resource = &self.selling_resource;
        let vault = &self.vault;
        let metadata = &self.metadata;
        let vault_owner = &self.owner;
        let destination = &self.destination;
        let clock = &self.clock;
        let treasury_holder = &self.treasury_holder;
        let token_program = &self.token_program;

        // Check, that `Market` is `Ended`
        if let Some(end_date) = market.end_date {
            if clock.unix_timestamp as u64 <= end_date {
                return Err(ErrorCode::MarketInInvalidState.into());
            }
        } else {
            if market.state != MarketState::Ended {
                return Err(ErrorCode::MarketInInvalidState.into());
            }
        }

        let is_native = market.treasury_mint == System::id();

        let treasury_holder_amount = if is_native {
            treasury_holder.lamports()
        } else {
            let token_account = spl_token::state::Account::unpack(&treasury_holder.data.borrow())?;
            if token_account.owner != market.treasury_owner {
                return Err(ErrorCode::DerivedKeyInvalid.into());
            }

            token_account.amount
        };

        // Check, that treasury balance is zero
        if treasury_holder_amount != 0 {
            return Err(ErrorCode::TreasuryIsNotEmpty.into());
        }

        // Check, that provided metadata is correct
        assert_derivation(
            &mpl_token_metadata::id(),
            metadata,
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
            ],
        )?;

        let signer_seeds: &[&[&[u8]]] = &[&[
            VAULT_OWNER_PREFIX.as_bytes(),
            selling_resource.resource.as_ref(),
            selling_resource.store.as_ref(),
            &[vault_owner_bump],
        ]];

        // Update primary sale flag
        let metadata_state = mpl_token_metadata::state::Metadata::from_account_info(&metadata)?;
        if !metadata_state.primary_sale_happened {
            mpl_update_primary_sale_happened_via_token(
                &metadata.to_account_info(),
                &vault_owner.to_account_info(),
                &vault.to_account_info(),
                signer_seeds[0],
            )?;
        }

        // Transfer token(ownership)
        let cpi_program = token_program.to_account_info();
        let cpi_accounts = token::Transfer {
            from: vault.to_account_info(),
            to: destination.to_account_info(),
            authority: vault_owner.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        token::transfer(cpi_ctx, 1)?;

        Ok(())
    }
}
