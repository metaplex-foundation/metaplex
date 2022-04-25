use crate::{
    error::ErrorCode,
    state::{GatingConfig, MarketState, SellingResourceState},
    utils::*,
    CreateMarket,
};
use anchor_lang::prelude::*;
use anchor_spl::token::accessor;

impl<'info> CreateMarket<'info> {
    pub fn process(
        &mut self,
        _treasury_owner_bump: u8,
        name: String,
        description: String,
        mutable: bool,
        price: u64,
        pieces_in_one_wallet: Option<u64>,
        start_date: u64,
        end_date: Option<u64>,
        gating_config: Option<GatingConfig>,
        remaining_accounts: &[AccountInfo<'info>],
    ) -> Result<()> {
        let market = &mut self.market;
        let store = &self.store;
        let selling_resource_owner = &self.selling_resource_owner;
        let selling_resource = &mut self.selling_resource;
        let mint = self.mint.to_account_info();
        let treasury_holder = self.treasury_holder.to_account_info();
        let owner = &self.owner;

        if name.len() > NAME_MAX_LEN {
            return Err(ErrorCode::NameIsTooLong.into());
        }

        if description.len() > DESCRIPTION_MAX_LEN {
            return Err(ErrorCode::DescriptionIsTooLong.into());
        }

        // Pieces in one wallet cannot be greater than Max Supply value
        if pieces_in_one_wallet.is_some()
            && selling_resource.max_supply.is_some()
            && pieces_in_one_wallet.unwrap() > selling_resource.max_supply.unwrap()
        {
            return Err(ErrorCode::PiecesInOneWalletIsTooMuch.into());
        }

        // start_date cannot be in the past
        if start_date < Clock::get().unwrap().unix_timestamp as u64 {
            return Err(ErrorCode::StartDateIsInPast.into());
        }

        // end_date should not be greater than start_date
        if end_date.is_some() && start_date > end_date.unwrap() {
            return Err(ErrorCode::EndDateIsEarlierThanBeginDate.into());
        }

        if let Some(gating_data) = &gating_config {
            if let Some(gating_time) = gating_data.gating_time {
                if gating_time < start_date {
                    return Err(ErrorCode::WrongGatingDate.into());
                }
                if let Some(end_date) = end_date {
                    if gating_time > end_date {
                        return Err(ErrorCode::WrongGatingDate.into());
                    }
                }
            }

            if remaining_accounts.len() != 1 {
                return Err(ErrorCode::CollectionMintMissing.into());
            }

            let collection_mint = &remaining_accounts[0];

            if collection_mint.key != &gating_data.collection || collection_mint.owner != &spl_token::id() {
                return Err(ErrorCode::WrongCollectionMintKey.into());
            }
        }

        let is_native = mint.key() == System::id();

        if !is_native {
            if mint.owner != &anchor_spl::token::ID
                || treasury_holder.owner != &anchor_spl::token::ID
            {
                return Err(ProgramError::IllegalOwner.into());
            }

            if accessor::mint(&treasury_holder)? != *mint.key {
                return Err(ProgramError::InvalidAccountData.into());
            }

            if accessor::authority(&treasury_holder)? != owner.key() {
                return Err(ProgramError::InvalidAccountData.into());
            }
        } else {
            // for native SOL we use PDA as a treasury holder
            // because of security reasons(only program can spend this SOL)
            if treasury_holder.key != owner.key {
                return Err(ProgramError::InvalidAccountData.into());
            }
        }

        // Check selling resource ownership
        assert_keys_equal(selling_resource.owner, selling_resource_owner.key())?;

        market.store = store.key();
        market.selling_resource = selling_resource.key();
        market.treasury_mint = mint.key();
        market.treasury_holder = treasury_holder.key();
        market.treasury_owner = owner.key();
        market.owner = selling_resource_owner.key();
        market.name = puffed_out_string(name, NAME_MAX_LEN);
        market.description = puffed_out_string(description, DESCRIPTION_MAX_LEN);
        market.mutable = mutable;
        market.price = price;
        market.pieces_in_one_wallet = pieces_in_one_wallet;
        market.start_date = start_date;
        market.end_date = end_date;
        market.state = MarketState::Created;
        market.gatekeeper = gating_config;
        selling_resource.state = SellingResourceState::InUse;

        Ok(())
    }
}
