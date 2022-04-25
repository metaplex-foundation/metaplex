use crate::{
    error::ErrorCode,
    id,
    state::{MarketState, PrimaryMetadataCreators},
    utils::*,
    Withdraw,
};
use anchor_lang::{prelude::*, solana_program::borsh::try_from_slice_unchecked};
use anchor_spl::{
    associated_token::{self, get_associated_token_address},
    token,
};

impl<'info> Withdraw<'info> {
    pub fn process(
        &mut self,
        treasury_owner_bump: u8,
        payout_ticket_bump: u8,
        remaining_accounts: &[AccountInfo<'info>],
    ) -> Result<()> {
        let market = &self.market;
        let token_program = &self.token_program;
        let associated_token_program = &self.associated_token_program;
        let system_program = &self.system_program;
        let treasury_holder = Box::new(&self.treasury_holder);
        let treasury_mint = Box::new(&self.treasury_mint);
        let treasury_owner = &self.owner;
        let destination = &self.destination;
        let selling_resource = &self.selling_resource;
        let funder = &self.funder;
        let payer = &self.payer;
        let payout_ticket = &self.payout_ticket;
        let rent = &self.rent;
        let clock = &self.clock;
        let metadata = &self.metadata.to_account_info();

        let selling_resource_key = selling_resource.key().clone();
        let treasury_mint_key = market.treasury_mint.clone();
        let funder_key = funder.key();

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

        // Obtain right creators according to sale type
        let metadata = mpl_token_metadata::state::Metadata::from_account_info(&metadata)?;
        let actual_creators = if !metadata.primary_sale_happened {
            if remaining_accounts.len() == 0 {
                return Err(ErrorCode::PrimaryMetadataCreatorsNotProvided.into());
            }

            let primary_metadata_creators_data = remaining_accounts[0].data.borrow()[8..].to_vec();
            let primary_metadata_creators = try_from_slice_unchecked::<PrimaryMetadataCreators>(
                &primary_metadata_creators_data,
            )?;
            Box::new(Some(primary_metadata_creators.creators))
        } else {
            Box::new(metadata.data.creators)
        };

        // Check, that funder is `Creator` or `Market` owner
        // `Some` mean funder is `Creator`
        // `None` mean funder is `Market` owner
        let funder_creator = if let Some(creators) = *actual_creators {
            let funder_creator = creators.iter().find(|&c| c.address == funder_key).cloned();
            if funder_creator.is_none() && funder_key != market.owner {
                return Err(ErrorCode::FunderIsInvalid.into());
            }

            funder_creator
        } else if funder_key != market.owner {
            return Err(ErrorCode::FunderIsInvalid.into());
        } else {
            None
        };

        // Check, that user can withdraw funds(first time)
        if payout_ticket.lamports() > 0 && !payout_ticket.data_is_empty() {
            return Err(ErrorCode::PayoutTicketExists.into());
        }

        let is_native = market.treasury_mint == System::id();

        let amount = if metadata.primary_sale_happened {
            if funder_creator.is_some() && funder_key == market.owner {
                // if funder is NFT creator and market owner at the same time
                // he will receive both shares
                let funder_creator = funder_creator.as_ref().unwrap();

                let funder_as_creator_share = calculate_secondary_shares_for_creator(
                    market.funds_collected,
                    metadata.data.seller_fee_basis_points as u64,
                    funder_creator.share as u64,
                )?;

                let funder_as_market_owner_share = calculate_secondary_shares_for_market_owner(
                    market.funds_collected,
                    metadata.data.seller_fee_basis_points as u64,
                )?;

                funder_as_creator_share
                    .checked_add(funder_as_market_owner_share)
                    .ok_or(ErrorCode::MathOverflow)?
            } else if let Some(funder_creator) = &funder_creator {
                calculate_secondary_shares_for_creator(
                    market.funds_collected,
                    metadata.data.seller_fee_basis_points as u64,
                    funder_creator.share as u64,
                )?
            } else {
                calculate_secondary_shares_for_market_owner(
                    market.funds_collected,
                    metadata.data.seller_fee_basis_points as u64,
                )?
            }
        } else {
            if let Some(funder_creator) = funder_creator {
                calculate_primary_shares_for_creator(
                    market.funds_collected,
                    funder_creator.share as u64,
                )?
            } else {
                return Err(ErrorCode::MarketOwnerDoesntHaveShares.into());
            }
        };

        // Transfer royalties
        let signer_seeds: &[&[&[u8]]] = &[&[
            HOLDER_PREFIX.as_bytes(),
            treasury_mint_key.as_ref(),
            selling_resource_key.as_ref(),
            &[treasury_owner_bump],
        ]];

        if is_native {
            if funder_key != destination.key() {
                return Err(ErrorCode::InvalidFunderDestination.into());
            }

            sys_transfer(
                &treasury_holder.to_account_info(),
                &destination.to_account_info(),
                amount,
                signer_seeds[0],
            )?;
        } else {
            if *treasury_mint.owner != spl_token::id() {
                return Err(ProgramError::InvalidArgument.into());
            }

            if *treasury_holder.owner != spl_token::id() {
                return Err(ProgramError::InvalidArgument.into());
            }

            let associated_token_account =
                get_associated_token_address(&funder_key, &market.treasury_mint);

            // Check, that provided destination is associated token account
            if associated_token_account != destination.key() {
                return Err(ErrorCode::InvalidFunderDestination.into());
            }

            // Check, that provided destination is exists
            if destination.lamports() == 0 && destination.data_is_empty() {
                let cpi_program = associated_token_program.to_account_info();
                let cpi_accounts = associated_token::Create {
                    payer: payer.to_account_info(),
                    associated_token: destination.to_account_info(),
                    authority: funder.to_account_info(),
                    mint: treasury_mint.to_account_info(),
                    rent: rent.to_account_info(),
                    token_program: token_program.to_account_info(),
                    system_program: system_program.to_account_info(),
                };
                let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
                associated_token::create(cpi_ctx)?;
            }

            let cpi_program = token_program.to_account_info();
            let cpi_accounts = token::Transfer {
                from: treasury_holder.to_account_info(),
                to: destination.to_account_info(),
                authority: treasury_owner.to_account_info(),
            };
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
            token::transfer(cpi_ctx, amount)?;
        }

        // Create ticket account to prevent twice withdrawal
        sys_create_account(
            &payer.to_account_info(),
            &payout_ticket.to_account_info(),
            rent.minimum_balance(FLAG_ACCOUNT_SIZE),
            FLAG_ACCOUNT_SIZE,
            &id(),
            &[
                PAYOUT_TICKET_PREFIX.as_bytes(),
                market.key().as_ref(),
                funder_key.as_ref(),
                &[payout_ticket_bump],
            ],
        )?;

        Ok(())
    }
}
