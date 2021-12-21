pub mod utils;

use {
    crate::utils::{
        assert_initialized, assert_is_ata, assert_keys_equal, assert_owned_by,
        assert_valid_go_live, spl_token_burn, spl_token_transfer, TokenBurnParams,
        TokenTransferParams,
    },
    anchor_lang::{
        prelude::*,
        solana_program::{
            log::sol_log_compute_units,
            program::{invoke, invoke_signed},
            serialize_utils::{read_pubkey, read_u16},
            system_instruction, sysvar,
        },
        AnchorDeserialize, AnchorSerialize, Discriminator, Key,
    },
    anchor_spl::token::Token,
    arrayref::array_ref,
    metaplex_token_metadata::{
        instruction::{create_master_edition, create_metadata_accounts, update_metadata_accounts},
        state::{
            MAX_CREATOR_LEN, MAX_CREATOR_LIMIT, MAX_NAME_LENGTH, MAX_SYMBOL_LENGTH, MAX_URI_LENGTH,
        },
    },
    spl_token::state::Mint,
    std::{cell::RefMut, ops::Deref, str::FromStr},
};
anchor_lang::declare_id!("cndy3Z4yapfJBmL3ShUp5exZKqR3z33thTzeNMm2gRZ");

const PREFIX: &str = "candy_machine";
#[program]
pub mod nft_candy_machine_v2 {

    use super::*;

    pub fn mint_nft<'info>(
        ctx: Context<'_, '_, '_, 'info, MintNFT<'info>>,
        creator_bump: u8,
    ) -> ProgramResult {
        let candy_machine = &mut ctx.accounts.candy_machine;
        let candy_machine_creator = &ctx.accounts.candy_machine_creator;
        let clock = &ctx.accounts.clock;
        // Note this is the wallet of the Candy machine
        let wallet = &ctx.accounts.wallet;
        let payer = &ctx.accounts.payer;
        let token_program = &ctx.accounts.token_program;
        let recent_blockhashes = &ctx.accounts.recent_blockhashes;
        let instruction_sysvar_account = &ctx.accounts.instruction_sysvar_account;
        let mut price = candy_machine.data.price;
        if let Some(es) = &candy_machine.data.end_settings {
            match es.end_setting_type {
                EndSettingType::Date => {
                    if clock.unix_timestamp > es.number as i64 {
                        if *ctx.accounts.payer.key != candy_machine.authority {
                            return Err(ErrorCode::CandyMachineNotLive.into());
                        }
                    }
                }
                EndSettingType::Amount => {
                    if candy_machine.items_redeemed >= es.number {
                        return Err(ErrorCode::CandyMachineNotLive.into());
                    }
                }
            }
        }

        let mut remaining_accounts_counter: usize = 0;
        if let Some(gatekeeper) = &candy_machine.data.gatekeeper {
            if ctx.remaining_accounts.len() <= remaining_accounts_counter {
                return Err(ErrorCode::GatewayTokenMissing.into());
            }
            let gateway_token = &ctx.remaining_accounts[remaining_accounts_counter];
            remaining_accounts_counter += 1;
            if gatekeeper.expire_on_use {
                if ctx.remaining_accounts.len() <= remaining_accounts_counter {
                    return Err(ErrorCode::GatewayAppMissing.into());
                }
                let gateway_app = &ctx.remaining_accounts[remaining_accounts_counter];
                remaining_accounts_counter += 1;
                if ctx.remaining_accounts.len() <= remaining_accounts_counter {
                    return Err(ErrorCode::NetworkExpireFeatureMissing.into());
                }
                let network_expire_feature = &ctx.remaining_accounts[remaining_accounts_counter];
                remaining_accounts_counter += 1;
                ::solana_gateway::Gateway::verify_and_expire_token(
                    gateway_app.clone(),
                    gateway_token.clone(),
                    payer.deref().clone(),
                    &gatekeeper.gatekeeper_network,
                    network_expire_feature.clone(),
                )?;
            } else {
                ::solana_gateway::Gateway::verify_gateway_token_account_info(
                    gateway_token,
                    &payer.key(),
                    &gatekeeper.gatekeeper_network,
                )?;
            }
        }

        if let Some(ws) = &candy_machine.data.whitelist_mint_settings {
            let whitelist_token_account = &ctx.remaining_accounts[remaining_accounts_counter];
            remaining_accounts_counter += 1;
            // If the user has not actually made this account,
            // this explodes and wej ust check normal dates.
            // If they have, we check amount, if it's > 0 we let them use the lkogic
            // if 0, check normal dates.
            match assert_is_ata(whitelist_token_account, &payer.key(), &ws.mint) {
                Ok(wta) => {
                    if wta.amount > 0 {
                        if ws.mode == WhitelistMintMode::BurnEveryTime {
                            let whitelist_token_mint =
                                &ctx.remaining_accounts[remaining_accounts_counter];
                            remaining_accounts_counter += 1;

                            let whitelist_burn_authority =
                                &ctx.remaining_accounts[remaining_accounts_counter];
                            remaining_accounts_counter += 1;

                            assert_keys_equal(*whitelist_token_mint.key, ws.mint)?;

                            spl_token_burn(TokenBurnParams {
                                mint: whitelist_token_mint.clone(),
                                source: whitelist_token_account.clone(),
                                amount: 1,
                                authority: whitelist_burn_authority.clone(),
                                authority_signer_seeds: None,
                                token_program: token_program.to_account_info(),
                            })?;
                        }

                        match candy_machine.data.go_live_date {
                            None => {
                                if *ctx.accounts.payer.key != candy_machine.authority && !ws.presale
                                {
                                    return Err(ErrorCode::CandyMachineNotLive.into());
                                }
                            }
                            Some(val) => {
                                if clock.unix_timestamp < val
                                    && *ctx.accounts.payer.key != candy_machine.authority
                                    && !ws.presale
                                {
                                    return Err(ErrorCode::CandyMachineNotLive.into());
                                }
                            }
                        }

                        if let Some(dp) = ws.discount_price {
                            price = dp;
                        }
                    } else {
                        if wta.amount == 0 && ws.discount_price.is_none() && !ws.presale {
                            // A non-presale whitelist with no discount price is a forced whitelist
                            // If a pre-sale has no discount, its no issue, because the "discount"
                            // is minting first - a presale whitelist always has an open post sale.
                            return Err(ErrorCode::NoWhitelistToken.into());
                        }
                        assert_valid_go_live(payer, clock, candy_machine)?;
                    }
                }
                Err(_) => {
                    if ws.discount_price.is_none() && !ws.presale {
                        // A non-presale whitelist with no discount price is a forced whitelist
                        // If a pre-sale has no discount, its no issue, because the "discount"
                        // is minting first - a presale whitelist always has an open post sale.
                        return Err(ErrorCode::NoWhitelistToken.into());
                    }
                    assert_valid_go_live(payer, clock, candy_machine)?
                }
            }
        } else {
            // no whitelist means normal datecheck
            assert_valid_go_live(payer, clock, candy_machine)?;
        }

        if candy_machine.items_redeemed >= candy_machine.data.items_available {
            return Err(ErrorCode::CandyMachineEmpty.into());
        }

        if let Some(mint) = candy_machine.token_mint {
            let token_account_info = &ctx.remaining_accounts[remaining_accounts_counter];
            remaining_accounts_counter += 1;
            let transfer_authority_info = &ctx.remaining_accounts[remaining_accounts_counter];
            let token_account = assert_is_ata(token_account_info, &payer.key(), &mint)?;

            if token_account.amount < price {
                return Err(ErrorCode::NotEnoughTokens.into());
            }

            spl_token_transfer(TokenTransferParams {
                source: token_account_info.clone(),
                destination: wallet.to_account_info(),
                authority: transfer_authority_info.clone(),
                authority_signer_seeds: &[],
                token_program: token_program.to_account_info(),
                amount: price,
            })?;
        } else {
            if ctx.accounts.payer.lamports() < price {
                return Err(ErrorCode::NotEnoughSOL.into());
            }

            invoke(
                &system_instruction::transfer(&ctx.accounts.payer.key, wallet.key, price),
                &[
                    ctx.accounts.payer.to_account_info(),
                    wallet.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
            )?;
        }
        let data = recent_blockhashes.data.borrow();
        let most_recent = array_ref![data, 8, 8];

        let index = u64::from_le_bytes(*most_recent);
        let modded: usize = index
            .checked_rem(candy_machine.data.items_available)
            .ok_or(ErrorCode::NumericalOverflowError)? as usize;

        let config_line = get_config_line(&candy_machine, modded, candy_machine.items_redeemed)?;

        candy_machine.items_redeemed = candy_machine
            .items_redeemed
            .checked_add(1)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        let cm_key = candy_machine.key();
        let authority_seeds = [PREFIX.as_bytes(), cm_key.as_ref(), &[creator_bump]];

        let mut creators: Vec<metaplex_token_metadata::state::Creator> =
            vec![metaplex_token_metadata::state::Creator {
                address: candy_machine_creator.key(),
                verified: true,
                share: 0,
            }];

        for c in &candy_machine.data.creators {
            creators.push(metaplex_token_metadata::state::Creator {
                address: c.address,
                verified: false,
                share: c.share,
            });
        }

        let metadata_infos = vec![
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.mint_authority.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.token_metadata_program.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
            candy_machine_creator.to_account_info(),
        ];

        let master_edition_infos = vec![
            ctx.accounts.master_edition.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.mint_authority.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.token_metadata_program.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
            candy_machine_creator.to_account_info(),
        ];
        msg!("Before metadata");
        sol_log_compute_units();

        invoke_signed(
            &create_metadata_accounts(
                *ctx.accounts.token_metadata_program.key,
                *ctx.accounts.metadata.key,
                *ctx.accounts.mint.key,
                *ctx.accounts.mint_authority.key,
                *ctx.accounts.payer.key,
                candy_machine_creator.key(),
                config_line.name,
                candy_machine.data.symbol.clone(),
                config_line.uri,
                Some(creators),
                candy_machine.data.seller_fee_basis_points,
                true,
                candy_machine.data.is_mutable,
            ),
            metadata_infos.as_slice(),
            &[&authority_seeds],
        )?;

        msg!("Before master");
        sol_log_compute_units();
        invoke_signed(
            &create_master_edition(
                *ctx.accounts.token_metadata_program.key,
                *ctx.accounts.master_edition.key,
                *ctx.accounts.mint.key,
                candy_machine_creator.key(),
                *ctx.accounts.mint_authority.key,
                *ctx.accounts.metadata.key,
                *ctx.accounts.payer.key,
                Some(candy_machine.data.max_supply),
            ),
            master_edition_infos.as_slice(),
            &[&authority_seeds],
        )?;

        let mut new_update_authority = Some(candy_machine.authority);

        if !candy_machine.data.retain_authority {
            new_update_authority = Some(ctx.accounts.update_authority.key());
        }

        msg!("Before update");
        sol_log_compute_units();
        invoke_signed(
            &update_metadata_accounts(
                *ctx.accounts.token_metadata_program.key,
                *ctx.accounts.metadata.key,
                candy_machine_creator.key(),
                new_update_authority,
                None,
                Some(true),
            ),
            &[
                ctx.accounts.token_metadata_program.to_account_info(),
                ctx.accounts.metadata.to_account_info(),
                candy_machine_creator.to_account_info(),
            ],
            &[&authority_seeds],
        )?;

        msg!("Before instr check");
        sol_log_compute_units();

        let instruction_sysvar_account_info = instruction_sysvar_account.to_account_info();

        let instruction_sysvar = instruction_sysvar_account_info.data.borrow();

        let mut idx = 0;
        let num_instructions = read_u16(&mut idx, &instruction_sysvar)
            .map_err(|_| ProgramError::InvalidAccountData)?;

        let associated_token =
            Pubkey::from_str("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL").unwrap();

        for index in 0..num_instructions {
            let mut current = 2 + (index * 2) as usize;
            let start = read_u16(&mut current, &instruction_sysvar).unwrap();

            current = start as usize;
            let num_accounts = read_u16(&mut current, &instruction_sysvar).unwrap();
            current += (num_accounts as usize) * (1 + 32);
            let program_id = read_pubkey(&mut current, &instruction_sysvar).unwrap();

            if program_id != nft_candy_machine_v2::id()
                && program_id != spl_token::id()
                && program_id != anchor_lang::solana_program::system_program::ID
                && program_id != associated_token
            {
                msg!("Transaction had ix with program id {}", program_id);
                return Err(ErrorCode::SuspiciousTransaction.into());
            }
        }

        msg!("At the end");
        sol_log_compute_units();
        Ok(())
    }

    pub fn update_candy_machine(
        ctx: Context<UpdateCandyMachine>,
        data: CandyMachineData,
    ) -> ProgramResult {
        let candy_machine = &mut ctx.accounts.candy_machine;

        if data.items_available != candy_machine.data.items_available
            && data.hidden_settings.is_none()
        {
            return Err(ErrorCode::CannotChangeNumberOfLines.into());
        }

        candy_machine.wallet = ctx.accounts.wallet.key();
        candy_machine.data = data;

        if ctx.remaining_accounts.len() > 0 {
            candy_machine.token_mint = Some(ctx.remaining_accounts[0].key())
        } else {
            candy_machine.token_mint = None;
        }
        Ok(())
    }

    pub fn add_config_lines(
        ctx: Context<AddConfigLines>,
        index: u32,
        config_lines: Vec<ConfigLine>,
    ) -> ProgramResult {
        let candy_machine = &mut ctx.accounts.candy_machine;
        let account = candy_machine.to_account_info();
        let current_count = get_config_count(&account.data.borrow_mut())?;
        let mut data = account.data.borrow_mut();

        let mut fixed_config_lines = vec![];

        // No risk overflow because you literally cant store this many in an account
        // going beyond u32 only happens with the hidden store candies, which dont use this.
        if index > (candy_machine.data.items_available as u32) - 1 {
            return Err(ErrorCode::IndexGreaterThanLength.into());
        }

        if candy_machine.data.hidden_settings.is_some() {
            return Err(ErrorCode::HiddenSettingsConfigsDoNotHaveConfigLines.into());
        }

        for line in &config_lines {
            let mut array_of_zeroes = vec![];
            while array_of_zeroes.len() < MAX_NAME_LENGTH - line.name.len() {
                array_of_zeroes.push(0u8);
            }
            let name = line.name.clone() + std::str::from_utf8(&array_of_zeroes).unwrap();

            let mut array_of_zeroes = vec![];
            while array_of_zeroes.len() < MAX_URI_LENGTH - line.uri.len() {
                array_of_zeroes.push(0u8);
            }
            let uri = line.uri.clone() + std::str::from_utf8(&array_of_zeroes).unwrap();
            fixed_config_lines.push(ConfigLine { name, uri })
        }

        let as_vec = fixed_config_lines.try_to_vec()?;
        // remove unneeded u32 because we're just gonna edit the u32 at the front
        let serialized: &[u8] = &as_vec.as_slice()[4..];

        let position = CONFIG_ARRAY_START + 4 + (index as usize) * CONFIG_LINE_SIZE;

        let array_slice: &mut [u8] =
            &mut data[position..position + fixed_config_lines.len() * CONFIG_LINE_SIZE];

        array_slice.copy_from_slice(serialized);

        let bit_mask_vec_start = CONFIG_ARRAY_START
            + 4
            + (candy_machine.data.items_available as usize) * CONFIG_LINE_SIZE
            + 4;

        let mut new_count = current_count;
        for i in 0..fixed_config_lines.len() {
            let position = (index as usize)
                .checked_add(i)
                .ok_or(ErrorCode::NumericalOverflowError)?;
            let my_position_in_vec = bit_mask_vec_start
                + position
                    .checked_div(8)
                    .ok_or(ErrorCode::NumericalOverflowError)?;
            let position_from_right = 7 - position
                .checked_rem(8)
                .ok_or(ErrorCode::NumericalOverflowError)?;
            let mask = u8::pow(2, position_from_right as u32);

            let old_value_in_vec = data[my_position_in_vec];
            data[my_position_in_vec] = data[my_position_in_vec] | mask;
            msg!(
                "My position in vec is {} my mask is going to be {}, the old value is {}",
                position,
                mask,
                old_value_in_vec
            );
            msg!(
                "My new value is {} and my position from right is {}",
                data[my_position_in_vec],
                position_from_right
            );
            if old_value_in_vec != data[my_position_in_vec] {
                msg!("Increasing count");
                new_count = new_count
                    .checked_add(1)
                    .ok_or(ErrorCode::NumericalOverflowError)?;
            }
        }

        // plug in new count.
        data[CONFIG_ARRAY_START..CONFIG_ARRAY_START + 4]
            .copy_from_slice(&(new_count as u32).to_le_bytes());

        Ok(())
    }

    pub fn initialize_candy_machine(
        ctx: Context<InitializeCandyMachine>,
        data: CandyMachineData,
    ) -> ProgramResult {
        let candy_machine_account = &mut ctx.accounts.candy_machine;

        if data.uuid.len() != 6 {
            return Err(ErrorCode::UuidMustBeExactly6Length.into());
        }

        let mut candy_machine = CandyMachine {
            data,
            authority: *ctx.accounts.authority.key,
            wallet: *ctx.accounts.wallet.key,
            token_mint: None,
            items_redeemed: 0,
        };

        if ctx.remaining_accounts.len() > 0 {
            let token_mint_info = &ctx.remaining_accounts[0];
            let _token_mint: Mint = assert_initialized(&token_mint_info)?;
            let token_account: spl_token::state::Account =
                assert_initialized(&ctx.accounts.wallet)?;

            assert_owned_by(&token_mint_info, &spl_token::id())?;
            assert_owned_by(&ctx.accounts.wallet, &spl_token::id())?;

            if token_account.mint != *token_mint_info.key {
                return Err(ErrorCode::MintMismatch.into());
            }

            candy_machine.token_mint = Some(*token_mint_info.key);
        }

        let mut array_of_zeroes = vec![];
        while array_of_zeroes.len() < MAX_SYMBOL_LENGTH - candy_machine.data.symbol.len() {
            array_of_zeroes.push(0u8);
        }
        let new_symbol =
            candy_machine.data.symbol.clone() + std::str::from_utf8(&array_of_zeroes).unwrap();
        candy_machine.data.symbol = new_symbol;

        // - 1 because we are going to be a creator
        if candy_machine.data.creators.len() > MAX_CREATOR_LIMIT - 1 {
            return Err(ErrorCode::TooManyCreators.into());
        }

        let mut new_data = CandyMachine::discriminator().try_to_vec().unwrap();
        new_data.append(&mut candy_machine.try_to_vec().unwrap());
        let mut data = candy_machine_account.data.borrow_mut();
        // god forgive me couldnt think of better way to deal with this
        for i in 0..new_data.len() {
            data[i] = new_data[i];
        }

        let vec_start = CONFIG_ARRAY_START
            + 4
            + (candy_machine.data.items_available as usize) * CONFIG_LINE_SIZE;
        let as_bytes = (candy_machine
            .data
            .items_available
            .checked_div(8)
            .ok_or(ErrorCode::NumericalOverflowError)? as u32)
            .to_le_bytes();
        for i in 0..4 {
            data[vec_start + i] = as_bytes[i]
        }

        Ok(())
    }

    pub fn update_authority(
        ctx: Context<UpdateCandyMachine>,
        new_authority: Option<Pubkey>,
    ) -> ProgramResult {
        let candy_machine = &mut ctx.accounts.candy_machine;

        if let Some(new_auth) = new_authority {
            candy_machine.authority = new_auth;
        }

        Ok(())
    }

    pub fn withdraw_funds<'info>(ctx: Context<WithdrawFunds<'info>>) -> ProgramResult {
        let authority = &ctx.accounts.authority;
        let pay = &ctx.accounts.candy_machine.to_account_info();
        let snapshot: u64 = pay.lamports();

        **pay.lamports.borrow_mut() = 0;

        **authority.lamports.borrow_mut() = authority
            .lamports()
            .checked_add(snapshot)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        Ok(())
    }
}

fn get_space_for_candy(data: CandyMachineData) -> core::result::Result<usize, ProgramError> {
    let num = if data.hidden_settings.is_some() {
        CONFIG_ARRAY_START
    } else {
        CONFIG_ARRAY_START
            + 4
            + (data.items_available as usize) * CONFIG_LINE_SIZE
            + 8
            + 2 * ((data
                .items_available
                .checked_div(8)
                .ok_or(ErrorCode::NumericalOverflowError)?
                + 1) as usize)
    };

    Ok(num)
}

#[derive(Accounts)]
#[instruction(data: CandyMachineData)]
pub struct InitializeCandyMachine<'info> {
    #[account(mut, constraint= candy_machine.to_account_info().owner == program_id && candy_machine.to_account_info().data_len() >= get_space_for_candy(data)?)]
    candy_machine: UncheckedAccount<'info>,
    wallet: UncheckedAccount<'info>,
    authority: UncheckedAccount<'info>,
    payer: Signer<'info>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct AddConfigLines<'info> {
    #[account(mut, has_one = authority)]
    candy_machine: Account<'info, CandyMachine>,
    authority: Signer<'info>,
}
#[derive(Accounts)]
pub struct WithdrawFunds<'info> {
    #[account(mut, has_one = authority)]
    candy_machine: Account<'info, CandyMachine>,
    #[account(address = candy_machine.authority)]
    authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(creator_bump: u8)]
pub struct MintNFT<'info> {
    #[account(
        mut,
        has_one = wallet
    )]
    candy_machine: Account<'info, CandyMachine>,
    #[account(seeds=[PREFIX.as_bytes(), candy_machine.key().as_ref()], bump=creator_bump)]
    candy_machine_creator: UncheckedAccount<'info>,
    payer: Signer<'info>,
    #[account(mut)]
    wallet: UncheckedAccount<'info>,
    // With the following accounts we aren't using anchor macros because they are CPI'd
    // through to token-metadata which will do all the validations we need on them.
    #[account(mut)]
    metadata: UncheckedAccount<'info>,
    #[account(mut)]
    mint: UncheckedAccount<'info>,
    mint_authority: Signer<'info>,
    update_authority: Signer<'info>,
    #[account(mut)]
    master_edition: UncheckedAccount<'info>,
    #[account(address = metaplex_token_metadata::id())]
    token_metadata_program: UncheckedAccount<'info>,
    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
    clock: Sysvar<'info, Clock>,
    #[account(address = sysvar::recent_blockhashes::id())]
    recent_blockhashes: UncheckedAccount<'info>,
    #[account(address = sysvar::instructions::id())]
    instruction_sysvar_account: UncheckedAccount<'info>,
    // > Only needed if candy machine has a gatekeeper
    // gateway_token
    // > Only needed if candy machine has a gatekeeper and it has expire_on_use set to true:
    // gateway program
    // network_expire_feature
    // > Only needed if candy machine has whitelist_mint_settings
    // whitelist_token_account
    // > Only needed if candy machine has whitelist_mint_settings and mode is BurnEveryTime
    // whitelist_token_mint
    // whitelist_burn_authority
    // > Only needed if candy machine has token mint
    // token_account_info
    // transfer_authority_info
}

#[derive(Accounts)]
pub struct UpdateCandyMachine<'info> {
    #[account(
        mut,
        has_one = authority
    )]
    candy_machine: Account<'info, CandyMachine>,
    authority: Signer<'info>,
    wallet: UncheckedAccount<'info>,
}

#[account]
#[derive(Default)]
pub struct CandyMachine {
    pub authority: Pubkey,
    pub wallet: Pubkey,
    pub token_mint: Option<Pubkey>,
    pub items_redeemed: u64,
    pub data: CandyMachineData,
    // there's a borsh vec u32 denoting how many actual lines of data there are currently (eventually equals items available)
    // There is actually lines and lines of data after this but we explicitly never want them deserialized.
    // here there is a borsh vec u32 indicating number of bytes in bitmask array.
    // here there is a number of bytes equal to ceil(max_number_of_lines/8) and it is a bit mask used to figure out when to increment borsh vec u32
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct WhitelistMintSettings {
    mode: WhitelistMintMode,
    mint: Pubkey,
    presale: bool,
    discount_price: Option<u64>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum WhitelistMintMode {
    // Only captcha uses the bytes, the others just need to have same length
    // for front end borsh to not crap itself
    // Holds the validation window
    BurnEveryTime,
    NeverBurn,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct CandyMachineData {
    pub uuid: String,
    pub price: u64,
    /// The symbol for the asset
    pub symbol: String,
    /// Royalty basis points that goes to creators in secondary sales (0-10000)
    pub seller_fee_basis_points: u16,
    pub max_supply: u64,
    pub is_mutable: bool,
    pub retain_authority: bool,
    pub go_live_date: Option<i64>,
    pub end_settings: Option<EndSettings>,
    pub creators: Vec<Creator>,
    pub hidden_settings: Option<HiddenSettings>,
    pub whitelist_mint_settings: Option<WhitelistMintSettings>,
    pub items_available: u64,
    /// If [`Some`] requires gateway tokens on mint
    pub gatekeeper: Option<GatekeeperConfig>,
}

/// Configurations options for the gatekeeper
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct GatekeeperConfig {
    /// The network for the gateway token required
    gatekeeper_network: Pubkey,
    /// Whether or not the token should expire after minting.
    /// The gatekeeper network must support this if true.
    expire_on_use: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum EndSettingType {
    Date,
    Amount,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct EndSettings {
    end_setting_type: EndSettingType,
    number: u64,
}

pub const CONFIG_ARRAY_START: usize = 8 + // key
32 + // authority
32 + //wallet
33 + // token mint
4 + 6 + // uuid
8 + // price
8 + // items available
9 + // go live
10 + // end settings
4 + MAX_SYMBOL_LENGTH + // u32 len + symbol
2 + // seller fee basis points
4 + MAX_CREATOR_LIMIT*MAX_CREATOR_LEN + // optional + u32 len + actual vec
8 + //max supply
1 + // is mutable
1 + // retain authority
1 + // option for hidden setting
4 + MAX_NAME_LENGTH + // name length,
4 + MAX_URI_LENGTH + // uri length,
32 + // hash
4 +  // max number of lines;
8 + // items redeemed
1 + // whitelist option
1 + // whitelist mint mode
1 + // allow presale
9 + // discount price
32 + // mint key for whitelist
1 + 32 + 1 // gatekeeper
;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct HiddenSettings {
    name: String,
    uri: String,
    hash: [u8; 32],
}

pub fn get_config_count(data: &RefMut<&mut [u8]>) -> core::result::Result<usize, ProgramError> {
    return Ok(u32::from_le_bytes(*array_ref![data, CONFIG_ARRAY_START, 4]) as usize);
}

pub fn get_good_index(
    arr: &mut RefMut<&mut [u8]>,
    items_available: usize,
    index: usize,
    pos: bool,
) -> core::result::Result<(usize, bool), ProgramError> {
    let mut index_to_use = index;
    let mut taken = 1;
    let mut found = false;
    let bit_mask_vec_start = CONFIG_ARRAY_START
        + 4
        + (items_available) * CONFIG_LINE_SIZE
        + 4
        + items_available
            .checked_div(8)
            .ok_or(ErrorCode::NumericalOverflowError)?
        + 4;

    while taken > 0 && index_to_use < items_available {
        let my_position_in_vec = bit_mask_vec_start
            + index_to_use
                .checked_div(8)
                .ok_or(ErrorCode::NumericalOverflowError)?;
        /*msg!(
            "My position is {} and value there is {}",
            my_position_in_vec,
            arr[my_position_in_vec]
        );*/
        if arr[my_position_in_vec] == 255 {
            //msg!("We are screwed here, move on");
            let eight_remainder = 8 - index_to_use
                .checked_rem(8)
                .ok_or(ErrorCode::NumericalOverflowError)?;
            let reversed = 8 - eight_remainder + 1;
            if (eight_remainder != 0 && pos) || (reversed != 0 && !pos)  {
                //msg!("Moving by {}", eight_remainder);
                if pos {
                    index_to_use += eight_remainder;
                } else {
                    if index_to_use < 8 {
                        break;
                    }
                    index_to_use -= reversed;
                }
            } else {
                //msg!("Moving by 8");
                if pos {
                    index_to_use += 8;
                } else {
                    index_to_use -= 8;
                }
            }
        } else {
            let position_from_right = 7 - index_to_use
                .checked_rem(8)
                .ok_or(ErrorCode::NumericalOverflowError)?;
            let mask = u8::pow(2, position_from_right as u32);

            taken = mask & arr[my_position_in_vec];
            if taken > 0 {
                //msg!("Index to use {} is taken", index_to_use);
                if pos {
                    index_to_use += 1;
                } else {
                    if index_to_use == 0 {
                        break;
                    }
                    index_to_use -= 1;
                }
            } else if taken == 0 {
                //msg!("Index to use {} is not taken, exiting", index_to_use);
                found = true;
                arr[my_position_in_vec] = arr[my_position_in_vec] | mask;
            }
        }
    }

    Ok((index_to_use, found))
}

pub fn get_config_line<'info>(
    a: &Account<'info, CandyMachine>,
    index: usize,
    mint_number: u64,
) -> core::result::Result<ConfigLine, ProgramError> {
    if let Some(hs) = &a.data.hidden_settings {
        return Ok(ConfigLine {
            name: hs.name.clone() + "#" + &(mint_number + 1).to_string(),
            uri: hs.uri.clone(),
        });
    }
    msg!("Index is set to {:?}", index);
    let a_info = a.to_account_info();

    let mut arr = a_info.data.borrow_mut();

    let (mut index_to_use, good) =
        get_good_index(&mut arr, a.data.items_available as usize, index, true)?;
    if !good {
        let (index_to_use_new, good_new) =
            get_good_index(&mut arr, a.data.items_available as usize, index, false)?;
        index_to_use = index_to_use_new;
        if !good_new {
            return Err(ErrorCode::CannotFindUsableConfigLine.into());
        }
    }

    msg!(
        "Index actually ends up due to used bools {:?}",
        index_to_use
    );
    if arr[CONFIG_ARRAY_START + 4 + index_to_use * (CONFIG_LINE_SIZE)] == 1 {
        return Err(ErrorCode::CannotFindUsableConfigLine.into());
    }

    let data_array = &mut arr[CONFIG_ARRAY_START + 4 + index_to_use * (CONFIG_LINE_SIZE)
        ..CONFIG_ARRAY_START + 4 + (index_to_use + 1) * (CONFIG_LINE_SIZE)];

    let mut name_vec = vec![];
    let mut uri_vec = vec![];
    for i in 4..4 + MAX_NAME_LENGTH {
        if data_array[i] == 0 {
            break;
        }
        name_vec.push(data_array[i])
    }
    for i in 8 + MAX_NAME_LENGTH..8 + MAX_NAME_LENGTH + MAX_URI_LENGTH {
        if data_array[i] == 0 {
            break;
        }
        uri_vec.push(data_array[i])
    }
    let config_line: ConfigLine = ConfigLine {
        name: match String::from_utf8(name_vec) {
            Ok(val) => val,
            Err(_) => return Err(ErrorCode::InvalidString.into()),
        },
        uri: match String::from_utf8(uri_vec) {
            Ok(val) => val,
            Err(_) => return Err(ErrorCode::InvalidString.into()),
        },
    };

    Ok(config_line)
}

pub const CONFIG_LINE_SIZE: usize = 4 + MAX_NAME_LENGTH + 4 + MAX_URI_LENGTH;
#[derive(AnchorSerialize, AnchorDeserialize, Debug)]
pub struct ConfigLine {
    pub name: String,
    /// URI pointing to JSON representing the asset
    pub uri: String,
}

// Unfortunate duplication of token metadata so that IDL picks it up.

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Creator {
    pub address: Pubkey,
    pub verified: bool,
    // In percentages, NOT basis points ;) Watch out!
    pub share: u8,
}

#[error]
pub enum ErrorCode {
    #[msg("Account does not have correct owner!")]
    IncorrectOwner,
    #[msg("Account is not initialized!")]
    Uninitialized,
    #[msg("Mint Mismatch!")]
    MintMismatch,
    #[msg("Index greater than length!")]
    IndexGreaterThanLength,
    #[msg("Numerical overflow error!")]
    NumericalOverflowError,
    #[msg("Can only provide up to 4 creators to candy machine (because candy machine is one)!")]
    TooManyCreators,
    #[msg("Uuid must be exactly of 6 length")]
    UuidMustBeExactly6Length,
    #[msg("Not enough tokens to pay for this minting")]
    NotEnoughTokens,
    #[msg("Not enough SOL to pay for this minting")]
    NotEnoughSOL,
    #[msg("Token transfer failed")]
    TokenTransferFailed,
    #[msg("Candy machine is empty!")]
    CandyMachineEmpty,
    #[msg("Candy machine is not live!")]
    CandyMachineNotLive,
    #[msg("Configs that are using hidden uris do not have config lines, they have a single hash representing hashed order")]
    HiddenSettingsConfigsDoNotHaveConfigLines,
    #[msg("Cannot change number of lines unless is a hidden config")]
    CannotChangeNumberOfLines,
    #[msg("Derived key invalid")]
    DerivedKeyInvalid,
    #[msg("Public key mismatch")]
    PublicKeyMismatch,
    #[msg("No whitelist token present")]
    NoWhitelistToken,
    #[msg("Token burn failed")]
    TokenBurnFailed,
    #[msg("Missing gateway app when required")]
    GatewayAppMissing,
    #[msg("Missing gateway token when required")]
    GatewayTokenMissing,
    #[msg("Missing gateway network expire feature when required")]
    NetworkExpireFeatureMissing,
    #[msg("Unable to find an unused config line near your random number index")]
    CannotFindUsableConfigLine,
    #[msg("Invalid string")]
    InvalidString,
    #[msg("Suspicious transaction detected")]
    SuspiciousTransaction,
}
