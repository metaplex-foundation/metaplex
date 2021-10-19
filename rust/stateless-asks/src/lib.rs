pub mod validation_utils;

use {
    crate::validation_utils::*,
    anchor_lang::{
        prelude::*,
        solana_program::{
            program::{invoke, invoke_signed},
            program_option::COption,
            program_pack::Pack,
            system_instruction, system_program,
        },
        AnchorDeserialize, AnchorSerialize,
    },
};

anchor_lang::declare_id!("noneAnrLdpjq1Ssp1z8xxDsB8dxe7u4HL5Nxi2K5WXZ");

const PREFIX: &str = "stateless_asks";
#[program]
pub mod stateless_asks {
    use super::*;
    pub fn accept_offer<'info>(
        ctx: Context<'_, '_, '_, 'info, AcceptOffer<'info>>,
        has_metadata: bool,
        maker_size: u64,
        taker_size: u64,
        bump_seed: u8,
    ) -> ProgramResult {
        let maker_wallet = &ctx.accounts.maker_wallet;
        let taker_wallet = &ctx.accounts.taker_wallet;
        let maker_src_account = &ctx.accounts.maker_src_account;
        let maker_dst_account = &ctx.accounts.maker_dst_account;
        let taker_src_account = &ctx.accounts.taker_src_account;
        let taker_dst_account = &ctx.accounts.taker_dst_account;
        let maker_src_mint = &ctx.accounts.maker_src_mint;
        let taker_src_mint = &ctx.accounts.taker_src_mint;
        let transfer_authority = &ctx.accounts.transfer_authority;
        let token_program_info = &ctx.accounts.token_program;
        let mut system_program_info: Option<&AccountInfo> = None;
        let mut remaining_account_incr = 0;
        let is_native = *taker_src_mint.key == spl_token::native_mint::id();
        if is_native {
            assert_keys_equal(*taker_wallet.key, *taker_src_account.key)?;
            assert_keys_equal(*maker_wallet.key, *maker_dst_account.key)?;
            system_program_info = Some(&ctx.remaining_accounts[remaining_account_incr]);
            remaining_account_incr += 1;
        }
        let seeds = &[
            b"stateless_offer",
            maker_wallet.key.as_ref(),
            maker_src_mint.key.as_ref(),
            taker_src_mint.key.as_ref(),
            &maker_size.to_le_bytes(),
            &taker_size.to_le_bytes(),
            &[bump_seed],
        ];
        let (maker_pay_size, taker_pay_size) = if has_metadata {
            let metadata_info = &ctx.remaining_accounts[remaining_account_incr];
            remaining_account_incr += 1;
            let (maker_metadata_key, _) = Pubkey::find_program_address(
                &[
                    b"metadata",
                    metaplex_token_metadata::id().as_ref(),
                    maker_src_mint.key.as_ref(),
                ],
                &metaplex_token_metadata::id(),
            );
            let (taker_metadata_key, _) = Pubkey::find_program_address(
                &[
                    b"metadata",
                    metaplex_token_metadata::id().as_ref(),
                    taker_src_mint.key.as_ref(),
                ],
                &metaplex_token_metadata::id(),
            );
            if *metadata_info.key == maker_metadata_key {
                msg!("Taker pays for fees");
                let taker_remaining_size = pay_creator_fees(
                    &ctx,
                    &mut remaining_account_incr,
                    metadata_info,
                    taker_src_account,
                    taker_wallet,
                    token_program_info,
                    system_program_info,
                    taker_src_mint,
                    taker_size,
                    is_native,
                    &[],
                )?;
                (maker_size, taker_remaining_size)
            } else if *metadata_info.key == taker_metadata_key {
                msg!("Maker pays for fees");
                let maker_remaining_size = pay_creator_fees(
                    &ctx,
                    &mut remaining_account_incr,
                    metadata_info,
                    maker_src_account,
                    transfer_authority, // Delegate signs for transfer
                    token_program_info,
                    system_program_info,
                    maker_src_mint,
                    maker_size,
                    is_native,
                    seeds,
                )?;
                (maker_remaining_size, taker_size)
            } else {
                msg!("Neither maker nor taker metadata keys match");
                return Err(ProgramError::InvalidAccountData);
            }
        } else {
            (maker_size, taker_size)
        };

        let maker_src_token_account: spl_token::state::Account =
            spl_token::state::Account::unpack(&maker_src_account.data.borrow())?;
        // Ensure that the delegated amount is exactly equal to the maker_size
        msg!(
            "Delegate {}",
            maker_src_token_account
                .delegate
                .unwrap_or(*maker_wallet.key)
        );
        msg!(
            "Delegated Amount {}",
            maker_src_token_account.delegated_amount
        );
        if maker_src_token_account.delegated_amount != maker_pay_size {
            return Err(ProgramError::InvalidAccountData);
        }
        let authority_key = Pubkey::create_program_address(seeds, ctx.program_id)?;
        assert_keys_equal(authority_key, *transfer_authority.key)?;
        // Ensure that authority is the delegate of this token account
        msg!("Authority key matches");
        if maker_src_token_account.delegate != COption::Some(authority_key) {
            return Err(ProgramError::InvalidAccountData);
        }
        msg!("Delegate matches");
        assert_keys_equal(spl_token::id(), *token_program_info.key)?;
        // Both of these transfers will fail if the `transfer_authority` is the delegate of these ATA's
        // One consideration is that the taker can get tricked in the case that the maker size is greater than
        // the token amount in the maker's ATA, but these stateless offers should just be invalidated in
        // the client.
        assert_is_ata(maker_src_account, maker_wallet.key, maker_src_mint.key)?;
        assert_is_ata(taker_dst_account, taker_wallet.key, maker_src_mint.key)?;
        invoke_signed(
            &spl_token::instruction::transfer(
                token_program_info.key,
                maker_src_account.key,
                taker_dst_account.key,
                transfer_authority.key,
                &[],
                maker_pay_size,
            )?,
            &[
                maker_src_account.clone(),
                taker_dst_account.clone(),
                transfer_authority.clone(),
                token_program_info.clone(),
            ],
            &[seeds],
        )?;
        msg!("done tx from maker to taker {}", maker_pay_size);
        if *taker_src_mint.key == spl_token::native_mint::id() {
            match system_program_info {
                Some(sys_program_info) => {
                    assert_keys_equal(system_program::id(), *sys_program_info.key)?;
                    invoke(
                        &system_instruction::transfer(
                            taker_src_account.key,
                            maker_dst_account.key,
                            taker_pay_size,
                        ),
                        &[
                            taker_src_account.clone(),
                            maker_dst_account.clone(),
                            sys_program_info.clone(),
                        ],
                    )?;
                }
                _ => return Err(ProgramError::InvalidAccountData),
            }
        } else {
            assert_is_ata(maker_dst_account, maker_wallet.key, taker_src_mint.key)?;
            assert_is_ata(taker_src_account, taker_wallet.key, taker_src_mint.key)?;
            invoke(
                &spl_token::instruction::transfer(
                    token_program_info.key,
                    taker_src_account.key,
                    maker_dst_account.key,
                    taker_wallet.key,
                    &[],
                    taker_pay_size,
                )?,
                &[
                    taker_src_account.clone(),
                    maker_dst_account.clone(),
                    taker_wallet.clone(),
                    token_program_info.clone(),
                ],
            )?;
        }
        msg!("done tx from taker to maker {}", taker_pay_size);
        msg!("done!");
        Ok(())
    }
}
#[derive(Accounts)]
pub struct AcceptOffer<'info> {
    maker_wallet: AccountInfo<'info>,
    taker_wallet: AccountInfo<'info>,
    maker_src_account: AccountInfo<'info>,
    maker_dst_account: AccountInfo<'info>,
    taker_src_account: AccountInfo<'info>,
    taker_dst_account: AccountInfo<'info>,
    maker_src_mint: AccountInfo<'info>,
    taker_src_mint: AccountInfo<'info>,
    transfer_authority: AccountInfo<'info>,
    #[account(address = spl_token::id())]
    token_program: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    system_program: AccountInfo<'info>,
}

#[error]
pub enum ErrorCode {
    #[msg("PublicKeyMismatch")]
    PublicKeyMismatch,
    #[msg("InvalidMintAuthority")]
    InvalidMintAuthority,
    #[msg("UninitializedAccount")]
    UninitializedAccount,
    #[msg("IncorrectOwner")]
    IncorrectOwner,
    #[msg("PublicKeysShouldBeUnique")]
    PublicKeysShouldBeUnique,
    #[msg("StatementFalse")]
    StatementFalse,
    #[msg("NotRentExempt")]
    NotRentExempt,
    #[msg("NumericalOverflow")]
    NumericalOverflow,
}
