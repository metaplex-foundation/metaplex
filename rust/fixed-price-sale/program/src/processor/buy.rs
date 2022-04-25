use crate::{
    error::ErrorCode,
    state::{GatingConfig, MarketState, SellingResourceState},
    utils::*,
    Buy,
};
use anchor_lang::prelude::*;
use anchor_lang::{
    solana_program::{program::invoke, program_pack::Pack, system_instruction},
    System,
};
use anchor_spl::token;
use mpl_token_metadata::{state::Metadata, utils::get_supply_off_master_edition};

impl<'info> Buy<'info> {
    pub fn process(
        &mut self,
        _trade_history_bump: u8,
        vault_owner_bump: u8,
        remaining_accounts: &[AccountInfo<'info>],
    ) -> Result<()> {
        let market = &mut self.market;
        let selling_resource = &mut self.selling_resource;
        let user_token_account = Box::new(&self.user_token_account);
        let user_wallet = &mut self.user_wallet;
        let trade_history = &mut self.trade_history;
        let treasury_holder = Box::new(&self.treasury_holder);
        let new_metadata = Box::new(&self.new_metadata);
        let new_edition = Box::new(&self.new_edition);
        let master_edition = Box::new(&self.master_edition);
        let new_mint = &mut self.new_mint;
        let edition_marker_info = &mut self.edition_marker.to_account_info();
        let vault = &mut self.vault;
        let owner = Box::new(&self.owner);
        let new_token_account = &self.new_token_account;
        let master_edition_metadata = Box::new(&self.master_edition_metadata);
        let clock = &self.clock;
        let rent = &self.rent;
        let token_program = &self.token_program;
        let system_program = &self.system_program;

        let metadata_mint = selling_resource.resource.clone();
        // do supply +1 to increase master edition supply
        let edition = get_supply_off_master_edition(&master_edition.to_account_info())?
            .checked_add(1)
            .ok_or(ErrorCode::MathOverflow)?;

        // Check, that `Market` is not in `Suspended` state
        if market.state == MarketState::Suspended {
            return Err(ErrorCode::MarketIsSuspended.into());
        }

        // Check, that `Market` is started
        if market.start_date > clock.unix_timestamp as u64 {
            return Err(ErrorCode::MarketIsNotStarted.into());
        }

        // Check, that `Market` is ended
        if let Some(end_date) = market.end_date {
            if clock.unix_timestamp as u64 > end_date {
                return Err(ErrorCode::MarketIsEnded.into());
            }
        } else if market.state == MarketState::Ended {
            return Err(ErrorCode::MarketIsEnded.into());
        }

        if trade_history.market != market.key() {
            trade_history.market = market.key();
        }

        if trade_history.wallet != user_wallet.key() {
            trade_history.wallet = user_wallet.key();
        }

        // Check, that user not reach buy limit
        if let Some(pieces_in_one_wallet) = market.pieces_in_one_wallet {
            if trade_history.already_bought == pieces_in_one_wallet {
                return Err(ErrorCode::UserReachBuyLimit.into());
            }
        }

        if market.state != MarketState::Active {
            market.state = MarketState::Active;
        }

        Self::verify_gating_token(
            &market.gatekeeper,
            &user_wallet,
            remaining_accounts,
            clock.unix_timestamp as u64,
        )?;

        // Buy new edition
        let is_native = market.treasury_mint == System::id();

        if !is_native {
            let cpi_program = token_program.to_account_info();
            let cpi_accounts = token::Transfer {
                from: user_token_account.to_account_info(),
                to: treasury_holder.to_account_info(),
                authority: user_wallet.to_account_info(),
            };
            let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
            token::transfer(cpi_ctx, market.price)?;
        } else {
            if user_token_account.key() != user_wallet.key() {
                return Err(ErrorCode::UserWalletMustMatchUserTokenAccount.into());
            }

            invoke(
                // for native SOL transfer user_wallet key == user_token_account key
                &system_instruction::transfer(
                    &user_token_account.key(),
                    &treasury_holder.key(),
                    market.price,
                ),
                &[
                    user_token_account.to_account_info(),
                    treasury_holder.to_account_info(),
                ],
            )?;
        }

        market.funds_collected = market
            .funds_collected
            .checked_add(market.price)
            .ok_or(ErrorCode::MathOverflow)?;

        mpl_mint_new_edition_from_master_edition_via_token(
            &new_metadata.to_account_info(),
            &new_edition.to_account_info(),
            &new_mint.to_account_info(),
            &user_wallet.to_account_info(),
            &user_wallet.to_account_info(),
            &owner.to_account_info(),
            &vault.to_account_info(),
            &master_edition_metadata.to_account_info(),
            &master_edition.to_account_info(),
            &metadata_mint,
            &edition_marker_info,
            &token_program.to_account_info(),
            &system_program.to_account_info(),
            &rent.to_account_info(),
            edition,
            &[
                VAULT_OWNER_PREFIX.as_bytes(),
                selling_resource.resource.as_ref(),
                selling_resource.store.as_ref(),
                &[vault_owner_bump],
            ],
        )?;

        mpl_update_primary_sale_happened_via_token(
            &new_metadata.to_account_info(),
            &user_wallet.to_account_info(),
            &new_token_account.to_account_info(),
            &[],
        )?;

        trade_history.already_bought = trade_history
            .already_bought
            .checked_add(1)
            .ok_or(ErrorCode::MathOverflow)?;

        selling_resource.supply = selling_resource
            .supply
            .checked_add(1)
            .ok_or(ErrorCode::MathOverflow)?;

        // Check, that `SellingResource::max_supply` is not overflowed by `supply`
        if let Some(max_supply) = selling_resource.max_supply {
            if selling_resource.supply > max_supply {
                return Err(ErrorCode::SupplyIsGtThanMaxSupply.into());
            } else if selling_resource.supply == max_supply {
                selling_resource.state = SellingResourceState::Exhausted;
                market.state = MarketState::Ended;
            }
        }

        Ok(())
    }

    fn verify_gating_token(
        gate: &Option<GatingConfig>,
        user_wallet: &AccountInfo<'info>,
        remaining_accounts: &[AccountInfo<'info>],
        current_time: u64,
    ) -> Result<()> {
        if let Some(gatekeeper) = gate {
            if let Some(gating_time) = gatekeeper.gating_time {
                if current_time > gating_time {
                    return Ok(());
                }
            }

            if remaining_accounts.len() != 3 {
                return Err(ErrorCode::GatingTokenMissing.into());
            }

            let user_token_acc = &remaining_accounts[0];
            let token_acc_mint = &remaining_accounts[1];

            if user_token_acc.owner != &spl_token::id() {
                return Err(ErrorCode::InvalidOwnerForGatingToken.into());
            }
            let user_token_acc_data = spl_token::state::Account::unpack_from_slice(
                user_token_acc.try_borrow_data()?.as_ref(),
            )?;

            let metadata = &remaining_accounts[2];
            let metadata_data = Metadata::from_account_info(metadata)?;

            let token_metadata_program_key = mpl_token_metadata::id();
            let metadata_seeds = &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                token_metadata_program_key.as_ref(),
                user_token_acc_data.mint.as_ref(),
            ];
            let (metadata_key, _metadata_bump_seed) =
                Pubkey::find_program_address(metadata_seeds, &mpl_token_metadata::id());

            if metadata.key() != metadata_key {
                return Err(ErrorCode::WrongGatingMetadataAccount.into());
            }

            if user_token_acc_data.owner != user_wallet.key() {
                return Err(ErrorCode::WrongOwnerInTokenGatingAcc.into());
            }

            if let Some(collection) = metadata_data.collection {
                if !collection.verified {
                    return Err(ErrorCode::WrongGatingMetadataAccount.into());
                }
                if collection.key != gatekeeper.collection {
                    return Err(ErrorCode::WrongGatingMetadataAccount.into());
                }
            } else {
                return Err(ErrorCode::WrongGatingMetadataAccount.into());
            }

            if gatekeeper.expire_on_use {
                invoke(
                    &spl_token::instruction::burn(
                        &spl_token::id(),
                        &user_token_acc.key(),
                        &token_acc_mint.key(),
                        &user_wallet.key(),
                        &[&user_wallet.key()],
                        1,
                    )?,
                    &[
                        user_token_acc.clone(),
                        token_acc_mint.clone(),
                        user_wallet.clone(),
                    ],
                )?;
            }
            Ok(())
        } else {
            Ok(())
        }
    }
}
