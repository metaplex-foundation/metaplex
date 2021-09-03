pub mod utils;

use {
    crate::utils::{assert_initialized, assert_owned_by, spl_token_transfer, TokenTransferParams},
    anchor_lang::{
        prelude::*,
        solana_program::{clock::UnixTimestamp, program_pack::Pack, system_program},
        AnchorDeserialize, AnchorSerialize,
    },
    spl_token::state::{Account, Mint},
};

pub const PREFIX: &str = "fair_launch";
pub const TREASURY: &str = "treasury";
pub const MINT: &str = "mint";

#[program]
pub mod fair_launch {
    use super::*;
    pub fn initialize(ctx: Context<InitializeFairLaunch>) -> ProgramResult {
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(bump: u8, treasury_bump: u8, token_mint_bump: u8, data: FairLaunchData)]
pub struct InitializeFairLaunch<'info> {
    #[account(init, seeds=[PREFIX.as_bytes(), token_mint.key.as_ref()], payer=payer, bump=bump, space=FAIR_LAUNCH_SPACE_VEC_START+16*(((data.price_range_end - data.price_range_start).checked_div(data.tick_size).ok_or(ErrorCode::NumericalOverflowError)? + 1)) as usize)]
    fair_launch: ProgramAccount<'info, FairLaunch>,
    #[account(init, seeds=[PREFIX.as_bytes(), authority.key.as_ref(), MINT.as_bytes(), data.uuid.as_bytes()], payer=payer, bump=token_mint_bump, space=Mint::LEN)]
    token_mint: AccountInfo<'info>,
    #[account(init, seeds=[PREFIX.as_bytes(), token_mint.key.as_ref(), TREASURY.as_bytes()], payer=payer, bump=treasury_bump, space=Account::LEN)]
    treasury: AccountInfo<'info>,
    #[account(constraint= authority.data_is_empty() && authority.lamports() > 0)]
    authority: AccountInfo<'info>,
    #[account(mut, signer)]
    payer: AccountInfo<'info>,
    #[account(address = spl_token::id())]
    token_program: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    system_program: AccountInfo<'info>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct UpdateFairLaunch<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref(), &[fair_launch.bump]], has_one=authority)]
    fair_launch: ProgramAccount<'info, FairLaunch>,
    #[account(signer)]
    authority: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(bump: u8, amount: u64)]
pub struct PurchaseTicket<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref(), &[fair_launch.bump]], has_one=treasury)]
    fair_launch: ProgramAccount<'info, FairLaunch>,
    #[account(mut)]
    treasury: AccountInfo<'info>,
    #[account(init, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref(), buyer.key.as_ref()],  payer=payer, bump=bump, space=FAIR_LAUNCH_TICKET_SIZE)]
    fair_launch_ticket: ProgramAccount<'info, FairLaunchTicket>,
    #[account(mut, signer, constraint= (treasury.owner == &spl_token::id() && buyer.owner == &spl_token::id()) || (treasury.owner != &spl_token::id() && buyer.data_is_empty() && buyer.lamports() > 0) )]
    buyer: AccountInfo<'info>,
    #[account(mut, signer)]
    payer: AccountInfo<'info>,
    #[account(address = spl_token::id())]
    token_program: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    system_program: AccountInfo<'info>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct AdjustTicket<'info> {
    #[account(mut, seeds=[PREFIX.as_bytes(), fair_launch.token_mint.as_ref(), buyer.key.as_ref(), &[fair_launch_ticket.bump]], has_one=buyer, has_one=fair_launch)]
    fair_launch_ticket: ProgramAccount<'info, FairLaunchTicket>,
    fair_launch: ProgramAccount<'info, FairLaunch>,
    #[account(mut)]
    treasury: AccountInfo<'info>,
    #[account(mut, signer)]
    buyer: AccountInfo<'info>,
    #[account(address = spl_token::id())]
    token_program: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    system_program: AccountInfo<'info>,
}

pub const FAIR_LAUNCH_SPACE_VEC_START: usize = 8 + // discriminator
32 + // token_mint
32 + // treasury
32 + // authority
1 + // bump
1 + // treasury_bump
1 + // token_mint_bump
4 + 6 + // uuid 
8 + //range start
8 + // range end
8 + // phase one start
8 + // phase one end
8 + // phase two end
8 + // phase three end
8 + // tick size
8 + // number of tokens provided
8 + // number of tickets sold
4; // u32 representing number of amounts in vec so far

pub const FAIR_LAUNCH_TICKET_SIZE: usize = 8 + // discriminator
32 + // fair launch reverse lookup
32 + // buyer
8 + // amount paid in so far
1 + // state
1; // bump

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct FairLaunchData {
    pub uuid: String,
    pub price_range_start: u64,
    pub price_range_end: u64,
    pub phase_one_start: UnixTimestamp,
    pub phase_one_end: UnixTimestamp,
    pub phase_two_end: UnixTimestamp,
    pub phase_three_end: UnixTimestamp,
    pub tick_size: u64,
    pub number_of_tokens_provided: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct MedianTuple(pub u64, pub u64);

#[account]
pub struct FairLaunch {
    pub token_mint: Pubkey,
    pub treasury: Pubkey,
    pub authority: Pubkey,
    pub bump: u8,
    pub treasury_bump: u8,
    pub token_mint_bump: u8,
    pub data: FairLaunchData,
    pub number_tickets_sold: u64,
    pub median: Vec<MedianTuple>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum FairLaunchTicketState {
    Unpunched,
    Punched,
    Withdrawn,
}

#[account]
pub struct FairLaunchTicket {
    pub fair_launch: Pubkey,
    pub buyer: Pubkey,
    pub amount: u64,
    pub state: FairLaunchTicketState,
    pub bump: u8,
}

#[error]
pub enum ErrorCode {
    #[msg("Account does not have correct owner!")]
    IncorrectOwner,
    #[msg("Account is not initialized!")]
    Uninitialized,
    #[msg("Mint Mismatch!")]
    MintMismatch,
    #[msg("Token transfer failed")]
    TokenTransferFailed,
    #[msg("Numerical overflow error")]
    NumericalOverflowError,
}
