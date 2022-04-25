//! Module define application utils.

#![allow(unused)]

use crate::error;
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    program_pack::Pack,
    pubkey::Pubkey,
    signer::{keypair::Keypair, Signer},
    system_instruction,
    transaction::Transaction,
};
use spl_token::state::Mint;

/// Return `Mint` account state from `spl_token` program.
pub fn get_mint(client: &RpcClient, mint: &Pubkey) -> Result<Mint, error::Error> {
    let data = client.get_account_data(mint)?;
    Ok(Mint::unpack(&data)?)
}

/// Create token `Account` from `spl_token` program.
pub fn create_token_account(
    client: &RpcClient,
    payer: &Keypair,
    account: &Keypair,
    mint: &Pubkey,
    owner: &Pubkey,
) -> Result<(), error::Error> {
    let recent_blockhash = client.get_latest_blockhash()?;
    let lamports = client.get_minimum_balance_for_rent_exemption(spl_token::state::Account::LEN)?;

    let tx = Transaction::new_signed_with_payer(
        &[
            system_instruction::create_account(
                &payer.pubkey(),
                &account.pubkey(),
                lamports,
                spl_token::state::Account::LEN as u64,
                &spl_token::id(),
            ),
            spl_token::instruction::initialize_account(
                &spl_token::id(),
                &account.pubkey(),
                mint,
                owner,
            )
            .unwrap(),
        ],
        Some(&payer.pubkey()),
        &[payer, &account],
        recent_blockhash,
    );

    client.send_and_confirm_transaction(&tx)?;

    Ok(())
}

/// Create token `Mint` from `spl_token` program.
pub fn create_mint(
    client: &RpcClient,
    payer: &Keypair,
    mint: &Keypair,
    decimals: u8,
) -> Result<(), error::Error> {
    let recent_blockhash = client.get_latest_blockhash()?;
    let lamports = client.get_minimum_balance_for_rent_exemption(spl_token::state::Mint::LEN)?;

    let tx = Transaction::new_signed_with_payer(
        &[
            system_instruction::create_account(
                &payer.pubkey(),
                &mint.pubkey(),
                lamports,
                spl_token::state::Mint::LEN as u64,
                &spl_token::id(),
            ),
            spl_token::instruction::initialize_mint(
                &spl_token::id(),
                &mint.pubkey(),
                &payer.pubkey(),
                None,
                decimals,
            )
            .unwrap(),
        ],
        Some(&payer.pubkey()),
        &[payer, &mint],
        recent_blockhash,
    );

    client.send_and_confirm_transaction(&tx)?;

    Ok(())
}

/// Check if `account` is empty.
pub fn is_account_empty(client: &RpcClient, account: &Pubkey) -> Result<bool, error::Error> {
    let account = client.get_account(account)?;

    Ok(account.data.is_empty())
}

/// Mint new tokens.
pub fn mint_to(
    client: &RpcClient,
    payer: &Keypair,
    mint: &Pubkey,
    to: &Pubkey,
    amount: u64,
) -> Result<(), error::Error> {
    let recent_blockhash = client.get_latest_blockhash()?;

    let tx = Transaction::new_signed_with_payer(
        &[spl_token::instruction::mint_to(
            &spl_token::id(),
            mint,
            to,
            &payer.pubkey(),
            &[],
            amount,
        )
        .unwrap()],
        Some(&payer.pubkey()),
        &[payer],
        recent_blockhash,
    );

    client.send_and_confirm_transaction(&tx)?;

    Ok(())
}

/// Return `Clone`'d `Keypair`.
pub fn clone_keypair(keypair: &Keypair) -> Keypair {
    Keypair::from_bytes(&keypair.to_bytes()).unwrap()
}
