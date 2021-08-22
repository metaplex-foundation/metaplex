pub mod utils;

use {
    crate::utils::{assert_initialized, assert_owned_by},
    anchor_lang::{prelude::*, solana_program::system_program},
    spl_token::state::Mint,
};

const PREFIX: &str = "candy_machine";
#[program]
pub mod nft_candy_machine {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>, price: u64, items_available: u64) -> ProgramResult {
        let candy_machine = &mut ctx.accounts.candy_machine;
        candy_machine.price = price;
        candy_machine.items_available = items_available;
        if ctx.remaining_accounts.len() > 0 {
            let token_mint_info = &ctx.remaining_accounts[0];
            let _token_mint: Mint = assert_initialized(&token_mint_info)?;
            assert_owned_by(&token_mint_info, &spl_token::id())?;
            candy_machine.token_mint = Some(*token_mint_info.key);
        }
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, seeds=[PREFIX.as_bytes(), config.key.as_ref()], has_one = authority, has_one = wallet, has_one = config, payer=payer)]
    candy_machine: ProgramAccount<'info, CandyMachine>,
    wallet: AccountInfo<'info>,
    config: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    #[account(mut, signer)]
    payer: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    system_program: AccountInfo<'info>,
    rent: Sysvar<'info, Rent>,
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
}

#[error]
pub enum ErrorCode {
    #[msg("Account does not have correct owner!")]
    IncorrectOwner,
    #[msg("Account is not initialized!")]
    Uninitialized,
}
