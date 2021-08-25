pub mod utils;

use {
    crate::utils::{assert_initialized, assert_owned_by},
    anchor_lang::{
        prelude::*, solana_program::system_program, AnchorDeserialize, AnchorSerialize, Key,
    },
    arrayref::array_ref,
    spl_token::state::{Account, Mint},
    spl_token_metadata::state::{
        MAX_CREATOR_LEN, MAX_CREATOR_LIMIT, MAX_NAME_LENGTH, MAX_SYMBOL_LENGTH, MAX_URI_LENGTH,
    },
    std::cell::Ref,
};

const PREFIX: &str = "candy_machine";
#[program]
pub mod nft_candy_machine {
    use super::*;

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        bump: u8,
        uuid: String,
        max_number_of_lines: u32,
        symbol: String,
        seller_fee_basis_points: u16,
        creators: Option<Vec<Creator>>,
    ) -> ProgramResult {
        let config = &mut ctx.accounts.config;
        config.bump = bump;
        if uuid.len() != 6 {
            return Err(ErrorCode::ConfigUuidMustBeExactly6Length.into());
        }
        config.uuid = uuid;
        config.authority = *ctx.accounts.authority.key;
        config.max_number_of_lines = max_number_of_lines;

        let mut array_of_zeroes = vec![];
        while array_of_zeroes.len() < MAX_SYMBOL_LENGTH - symbol.len() {
            array_of_zeroes.push(0u8);
        }
        let new_symbol = symbol.clone() + std::str::from_utf8(&array_of_zeroes).unwrap();
        config.symbol = new_symbol;

        config.seller_fee_basis_points = seller_fee_basis_points;
        if let Some(creat) = &creators {
            // - 1 because we are going to be a creator
            if creat.len() > MAX_CREATOR_LIMIT - 1 {
                return Err(ErrorCode::TooManyCreators.into());
            }
        }
        config.creators = creators;
        Ok(())
    }

    pub fn add_config_lines(
        ctx: Context<AddConfigLines>,
        index: u32,
        config_lines: Vec<ConfigLine>,
    ) -> ProgramResult {
        let config = &mut ctx.accounts.config;
        let account = config.to_account_info();
        let current_count = get_config_count(&account.data.borrow())?;
        let mut data = account.data.borrow_mut();

        let mut fixed_config_lines = vec![];

        if index > config.max_number_of_lines - 1 {
            return Err(ErrorCode::IndexGreaterThanLength.into());
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
            fixed_config_lines.push(ConfigLine {
                name,
                uri,
                is_mutable: line.is_mutable,
            })
        }

        let as_vec = fixed_config_lines.try_to_vec()?;
        // remove unneeded u32 because we're just gonna edit the u32 at the front
        let serialized: &[u8] = &as_vec.as_slice()[4..];

        let position = CONFIG_ARRAY_START + 4 + (index as usize) * CONFIG_LINE_SIZE;

        let array_slice: &mut [u8] =
            &mut data[position..position + fixed_config_lines.len() * CONFIG_LINE_SIZE];
        array_slice.copy_from_slice(serialized);
        let new_count = current_count
            .checked_add(fixed_config_lines.len())
            .ok_or(ErrorCode::NumericalOverflowError)?;
        // plug in new count.
        data[CONFIG_ARRAY_START..CONFIG_ARRAY_START + 4]
            .copy_from_slice(&(new_count as u32).to_le_bytes());

        Ok(())
    }

    pub fn initialize_candy_machine(
        ctx: Context<InitializeCandyMachine>,
        bump: u8,
        price: u64,
        items_available: u64,
        go_live_date: Option<i64>,
    ) -> ProgramResult {
        let candy_machine = &mut ctx.accounts.candy_machine;
        candy_machine.price = price;
        candy_machine.items_available = items_available;
        candy_machine.wallet = *ctx.accounts.wallet.key;
        candy_machine.authority = *ctx.accounts.authority.key;
        candy_machine.config = ctx.accounts.config.key();
        candy_machine.bump = bump;
        candy_machine.go_live_date = go_live_date;
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
    #[account(seeds=[PREFIX.as_bytes(), authority.key.as_ref(), &config.uuid.as_bytes(), &[config.bump]])]
    config: ProgramAccount<'info, Config>,
    #[account(signer, constraint= !authority.data_is_empty() || authority.lamports() > 0)]
    authority: AccountInfo<'info>,
    #[account(mut, signer)]
    payer: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    system_program: AccountInfo<'info>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(bump: u8, uuid: String, max_number_of_lines: u32)]
pub struct InitializeConfig<'info> {
    #[account(init, seeds=[PREFIX.as_bytes(), authority.key.as_ref(), uuid.as_bytes()], payer=payer, bump=bump, space=CONFIG_ARRAY_START+4+(max_number_of_lines as usize)*CONFIG_LINE_SIZE)]
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
    #[account(mut, seeds=[PREFIX.as_bytes(), authority.key.as_ref(), &config.uuid.as_bytes(), &[config.bump]])]
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
    pub go_live_date: Option<i64>,
    pub bump: u8,
}

pub const CONFIG_ARRAY_START: usize = 1 + // bump
32 + // authority
4 + 6 + // uuid + u32 len
4 + MAX_SYMBOL_LENGTH + // u32 len + symbol
2 + // seller fee basis points
1 + 4 + MAX_CREATOR_LIMIT*MAX_CREATOR_LEN + // optional + u32 len + actual vec
4; // max number of lines;

#[account]
#[derive(Default)]
pub struct Config {
    pub bump: u8,
    pub authority: Pubkey,
    pub uuid: String,
    /// The symbol for the asset
    pub symbol: String,
    /// Royalty basis points that goes to creators in secondary sales (0-10000)
    pub seller_fee_basis_points: u16,
    /// Array of creators, optional
    pub creators: Option<Vec<Creator>>,
    pub max_number_of_lines: u32,
    // there's a borsh vec u32 denoting how many actual lines of data there are currently (eventually equals max number of lines)
    // There is actually lines and lines of data after this but we explicitly never want them deserialized.
}

pub fn get_config_count(data: &Ref<&mut [u8]>) -> core::result::Result<usize, ProgramError> {
    return Ok(u32::from_le_bytes(*array_ref![data, CONFIG_ARRAY_START, 4]) as usize);
}

pub fn get_config_line(
    a: &AccountInfo,
    index: usize,
) -> core::result::Result<ConfigLine, ProgramError> {
    let arr = a.data.borrow();

    let total = get_config_count(&arr)?;
    if index > total {
        return Err(ErrorCode::IndexGreaterThanLength.into());
    }
    let data_array = &arr[CONFIG_ARRAY_START + 4 + index * (CONFIG_LINE_SIZE)
        ..CONFIG_ARRAY_START + 4 + (index + 1) * (CONFIG_LINE_SIZE)];

    let config_line: ConfigLine = ConfigLine::try_from_slice(data_array)?;

    Ok(config_line)
}

pub const CONFIG_LINE_SIZE: usize = 4 + MAX_NAME_LENGTH + 4 + MAX_URI_LENGTH + 1;
#[derive(AnchorSerialize, AnchorDeserialize, Debug)]
pub struct ConfigLine {
    /// The name of the asset
    pub name: String,
    /// URI pointing to JSON representing the asset
    pub uri: String,
    pub is_mutable: bool,
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
    #[msg("Config must have atleast one entry!")]
    ConfigMustHaveAtleastOneEntry,
    #[msg("Numerical overflow error!")]
    NumericalOverflowError,
    #[msg("Can only provide up to 4 creators to candy machine (because candy machine is one)!")]
    TooManyCreators,
    #[msg("Config uuid must be exactly of 6 length")]
    ConfigUuidMustBeExactly6Length,
}
