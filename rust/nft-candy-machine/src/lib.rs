pub mod utils;

use {
    crate::utils::{assert_initialized, assert_owned_by},
    anchor_lang::{prelude::*, solana_program::system_program},
    spl_token::state::{Account, Mint},
};

const PREFIX: &str = "candy_machine";
#[program]
pub mod nft_candy_machine {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>, price: u64, items_available: u64) -> ProgramResult {
        /*   let candy_machine = &mut ctx.accounts.candy_machine;
        candy_machine.price = price;
        candy_machine.items_available = items_available;
        candy_machine.wallet = *ctx.accounts.wallet.key;
        candy_machine.authority = *ctx.accounts.authority.key;
        candy_machine.config = *ctx.accounts.config.key;
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
        }*/
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, seeds=[PREFIX.as_bytes(), config.key.as_ref()], payer=payer, space=8+32+32+33+32+64+64+64+200)]
    candy_machine: ProgramAccount<'info, CandyMachine>,
    #[account(constraint= !wallet.data_is_empty() || wallet.lamports() > 0 )]
    wallet: AccountInfo<'info>,
    config: AccountInfo<'info>,
    #[account(constraint= !authority.data_is_empty() || authority.lamports() > 0 )]
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
    #[msg("Mint Mismatch!")]
    MintMismatch,
}
