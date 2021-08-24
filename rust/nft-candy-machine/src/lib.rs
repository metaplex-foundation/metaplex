pub mod utils;

use {
    crate::utils::{assert_initialized, assert_owned_by},
    anchor_lang::{
        prelude::*,
        solana_program::{borsh::try_from_slice_unchecked, system_program},
        AnchorDeserialize, AnchorSerialize, Key,
    },
    arrayref::array_ref,
    spl_token::state::{Account, Mint},
    spl_token_metadata::state::MAX_DATA_SIZE,
};

const PREFIX: &str = "candy_machine";
#[program]
pub mod nft_candy_machine {
    use super::*;

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        bump: u8,
        name: [u8; 32],
        max_number_of_lines: u32,
    ) -> ProgramResult {
        let config = &mut ctx.accounts.config;
        config.bump = bump;
        config.name = name;
        config.authority = *ctx.accounts.authority.key;
        config.max_number_of_lines = max_number_of_lines;
        Ok(())
    }

    pub fn add_config_lines(
        ctx: Context<AddConfigLines>,
        config_lines: Vec<ConfigLine>,
    ) -> ProgramResult {
        let config = &mut ctx.accounts.config;
        let account = config.to_account_info();
        let mut data = account.data.borrow_mut();
        let current_count = get_config_count(&account)?;
        let as_vec = config_lines.try_to_vec()?;
        // remove unneeded u32 because we're just gonna edit the u32 at the front
        let serialized: &[u8] = &as_vec.as_slice()[4..];
        let position = CONFIG_ARRAY_START + 4 + (current_count + 1) * CONFIG_LINE_SIZE;
        let array_slice: &mut [u8] =
            &mut data[position..position + config_lines.len() * CONFIG_LINE_SIZE];
        array_slice.copy_from_slice(serialized);
        let new_count = current_count
            .checked_add(config_lines.len())
            .ok_or(ErrorCode::NumericalOverflowError)?;
        // plug in new count.
        data[CONFIG_ARRAY_START..4].copy_from_slice(&new_count.to_le_bytes());

        Ok(())
    }

    pub fn initialize_candy_machine(
        ctx: Context<InitializeCandyMachine>,
        bump: u8,
        price: u64,
        items_available: u64,
    ) -> ProgramResult {
        let candy_machine = &mut ctx.accounts.candy_machine;
        candy_machine.price = price;
        candy_machine.items_available = items_available;
        candy_machine.wallet = *ctx.accounts.wallet.key;
        candy_machine.authority = *ctx.accounts.authority.key;
        candy_machine.config = ctx.accounts.config.key();
        candy_machine.bump = bump;
        if ctx.remaining_accounts.len() > 0 {
            let token_mint_info = &ctx.remaining_accounts[0];
            let _token_mint: Mint = assert_initialized(&token_mint_info)?;
            let token_account: Account = assert_initialized(&ctx.accounts.wallet)?;

            assert_owned_by(&token_mint_info, &spl_token::id())?;
            assert_owned_by(&ctx.accounts.wallet, &spl_token::id())?;

            if token_account.mint != *token_mint_info.key {
                return Err(ErrorCode::MintMismatch.into());
            }

            candy_machine.token_mint = Some(*token_mint_info.key);
        }

        let _config_line = match get_config_line(&ctx.accounts.config.to_account_info(), 0) {
            Ok(val) => val,
            Err(_) => return Err(ErrorCode::ConfigMustHaveAtleastOneEntry.into()),
        };

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct InitializeCandyMachine<'info> {
    #[account(init, seeds=[PREFIX.as_bytes(), config.key().as_ref()], payer=payer, bump=bump, space=8+32+32+33+32+64+64+64+200)]
    candy_machine: ProgramAccount<'info, CandyMachine>,
    #[account(constraint= !wallet.data_is_empty() || wallet.lamports() > 0 )]
    wallet: AccountInfo<'info>,
    #[account(seeds=[PREFIX.as_bytes(), authority.key.as_ref(), &config.name, &[config.bump]])]
    config: ProgramAccount<'info, Config>,
    #[account(constraint= !authority.data_is_empty() || authority.lamports() > 0 )]
    authority: AccountInfo<'info>,
    #[account(mut, signer)]
    payer: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    system_program: AccountInfo<'info>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(bump: u8, name: [u8; 32], max_number_of_lines: u32)]
pub struct InitializeConfig<'info> {
    #[account(init, seeds=[PREFIX.as_bytes(), authority.key.as_ref(), &name], payer=payer, bump=bump, space=8+1+4+(max_number_of_lines as usize)*CONFIG_LINE_SIZE)]
    config: ProgramAccount<'info, Config>,
    #[account(constraint= !authority.data_is_empty() || authority.lamports() > 0 )]
    authority: AccountInfo<'info>,
    #[account(mut, signer)]
    payer: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    system_program: AccountInfo<'info>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct AddConfigLines<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), authority.key.as_ref(), &config.name])]
    config: ProgramAccount<'info, Config>,
    #[account(signer)]
    authority: AccountInfo<'info>,
}

#[account]
#[derive(Default)]
pub struct CandyMachine {
    pub authority: Pubkey,
    pub wallet: Pubkey,
    pub token_mint: Option<Pubkey>,
    pub config: Pubkey,
    pub price: u64,
    pub items_available: u64,
    pub items_redeemed: u64,
    pub bump: u8,
}

pub const CONFIG_ARRAY_START: usize = 77;
#[account]
#[derive(Default)]
pub struct Config {
    bump: u8,
    authority: Pubkey,
    name: [u8; 32],
    max_number_of_lines: u32,
    // there's a borsh vec u32 denoting how many actual lines of data there are currently (eventually equals max number of lines)
    // There is actually lines and lines of data after this but we explicitly never want them deserialized.
}

pub fn get_config_count(a: &AccountInfo) -> core::result::Result<usize, ProgramError> {
    let data = a.data.borrow();
    return Ok(u32::from_le_bytes(*array_ref![data, CONFIG_ARRAY_START, 4]) as usize);
}

pub fn get_config_line(
    a: &AccountInfo,
    index: usize,
) -> core::result::Result<ConfigLine, ProgramError> {
    let total = get_config_count(a)?;
    if index > total {
        return Err(ErrorCode::IndexGreaterThanLength.into());
    }
    let arr = a.data.borrow();
    let data_array = array_ref![
        arr,
        CONFIG_ARRAY_START + 4 + index * (CONFIG_LINE_SIZE),
        MAX_DATA_SIZE
    ];

    let data: Data = try_from_slice_unchecked(data_array)?;
    let is_mutable = arr[CONFIG_ARRAY_START + 4 + (index + 1) * (CONFIG_LINE_SIZE) - 1] != 0;

    Ok(ConfigLine { data, is_mutable })
}

pub const CONFIG_LINE_SIZE: usize = MAX_DATA_SIZE + 1;
#[account]
pub struct ConfigLine {
    pub data: Data,
    pub is_mutable: bool,
}

// Unfortunate duplication of token metadata so that IDL picks it up.

#[account]
pub struct Creator {
    pub address: Pubkey,
    pub verified: bool,
    // In percentages, NOT basis points ;) Watch out!
    pub share: u8,
}

#[account]
pub struct Data {
    /// The name of the asset
    pub name: String,
    /// The symbol for the asset
    pub symbol: String,
    /// URI pointing to JSON representing the asset
    pub uri: String,
    /// Royalty basis points that goes to creators in secondary sales (0-10000)
    pub seller_fee_basis_points: u16,
    /// Array of creators, optional
    pub creators: Option<Vec<Creator>>,
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
    #[msg("Config must have atleast one entry!")]
    ConfigMustHaveAtleastOneEntry,
    #[msg("Numerical overflow error!")]
    NumericalOverflowError,
}
