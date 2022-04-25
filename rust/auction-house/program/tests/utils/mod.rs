// //! Module provide utilities for testing.

// #![allow(unused)]

pub mod setup_functions;

// use std::{env, str::FromStr};

// use anchor_client::{
//     solana_client::{client_error::ClientError, rpc_client::RpcClient},
//     solana_sdk::{
//         program_pack::Pack, pubkey::Pubkey, signature::Keypair, signer::Signer, system_instruction,
//         system_program, sysvar, transaction::Transaction,
//     },
//     Program,
// };
// use constants::{AUCTION_HOUSE, FEE_PAYER, SIGNER, TREASURY};

// use solana_program_test::*;

// /// Return `spl_token` token account.
// pub fn get_token_account(
//     connection: &RpcClient,
//     token_account: &Pubkey,
// ) -> Result<spl_token::state::Account, ClientError> {
//     let data = connection.get_account_data(token_account)?;
//     Ok(spl_token::state::Account::unpack(&data).unwrap())
// }

// /// Perform native lamports transfer.
// pub fn transfer_lamports(
//     connection: &RpcClient,
//     wallet: &Keypair,
//     to: &Pubkey,
//     amount: u64,
// ) -> Result<(), ClientError> {
//     let (recent_blockhash, _) = connection.get_recent_blockhash()?;

//     let tx = Transaction::new_signed_with_payer(
//         &[system_instruction::transfer(&wallet.pubkey(), to, amount)],
//         Some(&wallet.pubkey()),
//         &[wallet],
//         recent_blockhash,
//     );

//     connection.send_and_confirm_transaction(&tx)?;

//     Ok(())
// }

// /// Perform native lamports transfer.
// pub fn transfer_lamports_v2(
//     context: &mut ProgramTestContext,
//     wallet: &Keypair,
//     to: &Pubkey,
//     amount: u64,
// ) -> Result<(), ClientError> {
//     // let (recent_blockhash, _) = connection.get_recent_blockhash()?;
//     let recent_blockhash = context.last_blockhash;

//     let tx = Transaction::new_signed_with_payer(
//         &[system_instruction::transfer(&wallet.pubkey(), to, amount)],
//         Some(&wallet.pubkey()),
//         &[wallet],
//         recent_blockhash,
//     );

//     // connection.send_and_confirm_transaction(&tx)?;
//     context.banks_client.process_transaction(tx);

//     Ok(())
// }

// /// Create new `TokenMetadata` using `RpcClient`.
// pub fn create_token_metadata(
//     connection: &RpcClient,
//     wallet: &Keypair,
//     mint: &Pubkey,
//     name: String,
//     symbol: String,
//     uri: String,
//     seller_fee_basis_points: u16,
// ) -> Result<Pubkey, ClientError> {
//     let pid = match env::var("TOKEN_METADATA_PID") {
//         Ok(val) => val,
//         Err(_) => mpl_token_metadata::id().to_string(),
//     };

//     let program_id = Pubkey::from_str(&pid).unwrap();

//     let (recent_blockhash, _) = connection.get_recent_blockhash()?;

//     let (metadata_account, _) = Pubkey::find_program_address(
//         &[
//             mpl_token_metadata::state::PREFIX.as_bytes(),
//             program_id.as_ref(),
//             mint.as_ref(),
//         ],
//         &program_id,
//     );

//     let tx = Transaction::new_signed_with_payer(
//         &[mpl_token_metadata::instruction::create_metadata_accounts(
//             program_id,
//             metadata_account,
//             *mint,
//             wallet.pubkey(),
//             wallet.pubkey(),
//             wallet.pubkey(),
//             name,
//             symbol,
//             uri,
//             None,
//             seller_fee_basis_points,
//             false,
//             false,
//         )],
//         Some(&wallet.pubkey()),
//         &[wallet],
//         recent_blockhash,
//     );

//     connection.send_and_confirm_transaction(&tx)?;
//     Ok(metadata_account)
// }

// pub fn create_token_metadata_v2(
//     context: &mut ProgramTestContext,
//     wallet: &Keypair,
//     mint: &Pubkey,
//     name: String,
//     symbol: String,
//     uri: String,
//     seller_fee_basis_points: u16,
// ) -> Result<Pubkey, ClientError> {
//     let pid = match env::var("TOKEN_METADATA_PID") {
//         Ok(val) => val,
//         Err(_) => mpl_token_metadata::id().to_string(),
//     };

//     let program_id = Pubkey::from_str(&pid).unwrap();
//     // let (recent_blockhash, _) = connection.get_recent_blockhash()?;
//     let recent_blockhash = context.last_blockhash;
//     let (metadata_account, _) = Pubkey::find_program_address(
//         &[
//             mpl_token_metadata::state::PREFIX.as_bytes(),
//             program_id.as_ref(),
//             mint.as_ref(),
//         ],
//         &program_id,
//     );

//     let tx = Transaction::new_signed_with_payer(
//         &[mpl_token_metadata::instruction::create_metadata_accounts(
//             program_id,
//             metadata_account,
//             *mint,
//             wallet.pubkey(),
//             wallet.pubkey(),
//             wallet.pubkey(),
//             name,
//             symbol,
//             uri,
//             None,
//             seller_fee_basis_points,
//             false,
//             false,
//         )],
//         Some(&wallet.pubkey()),
//         &[wallet],
//         recent_blockhash,
//     );

//     // connection.send_and_confirm_transaction(&tx)?;
//     context.banks_client.process_transaction(tx);
//     Ok(metadata_account)
// }

// /// Mint tokens.
// pub fn mint_to(
//     connection: &RpcClient,
//     wallet: &Keypair,
//     mint: &Pubkey,
//     to: &Pubkey,
//     amount: u64,
// ) -> Result<(), ClientError> {
//     let (recent_blockhash, _) = connection.get_recent_blockhash()?;

//     let tx = Transaction::new_signed_with_payer(
//         &[spl_token::instruction::mint_to(
//             &spl_token::id(),
//             mint,
//             to,
//             &wallet.pubkey(),
//             &[&wallet.pubkey()],
//             amount,
//         )
//         .unwrap()],
//         Some(&wallet.pubkey()),
//         &[wallet],
//         recent_blockhash,
//     );

//     connection.send_and_confirm_transaction(&tx)?;

//     Ok(())
// }

// pub fn mint_to_v2(
//     context: &mut ProgramTestContext,
//     wallet: &Keypair,
//     mint: &Pubkey,
//     to: &Pubkey,
//     amount: u64,
// ) -> Result<(), ClientError> {
//     // let (recent_blockhash, _) = connection.get_recent_blockhash()?;
//     let recent_blockhash = context.last_blockhash;
//     let tx = Transaction::new_signed_with_payer(
//         &[spl_token::instruction::mint_to(
//             &spl_token::id(),
//             mint,
//             to,
//             &wallet.pubkey(),
//             &[&wallet.pubkey()],
//             amount,
//         )
//         .unwrap()],
//         Some(&wallet.pubkey()),
//         &[wallet],
//         recent_blockhash,
//     );

//     // connection.send_and_confirm_transaction(&tx)?;
//     context.banks_client.process_transaction(tx);
//     // context.banks_client.process_transaction(tx);
//     Ok(())
// }

// /// Create new `AuctionHouse` using `Program`.
// pub fn create_auction_house(
//     program: &Program,
//     treasury_mint: &Pubkey,
//     wallet: &Pubkey,
//     fee_withdrawal_destination: &Pubkey,
//     treasury_withdrawal_destination: &Pubkey,
//     can_change_sale_price: bool,
//     requires_sign_off: bool,
//     seller_fee_basis_points: u16,
// ) -> Result<(), ClientError> {
//     let (auction_house, bump) = find_auction_house_address(wallet, treasury_mint);
//     let (auction_house_fee_account, fee_payer_bump) =
//         find_auction_house_fee_account_address(&auction_house);
//     let (auction_house_treasury, treasury_bump) =
//         find_auction_house_treasury_address(&auction_house);

//     program
//         .request()
//         .accounts(mpl_auction_house::accounts::CreateAuctionHouse {
//             treasury_mint: *treasury_mint,
//             payer: *wallet,
//             authority: *wallet,
//             fee_withdrawal_destination: *fee_withdrawal_destination,
//             treasury_withdrawal_destination: *treasury_withdrawal_destination,
//             treasury_withdrawal_destination_owner: *wallet,
//             auction_house,
//             auction_house_fee_account,
//             auction_house_treasury,
//             token_program: spl_token::id(),
//             ata_program: spl_associated_token_account::id(),
//             rent: sysvar::rent::id(),
//             system_program: system_program::id(),
//         })
//         .args(mpl_auction_house::instruction::CreateAuctionHouse {
//             bump,
//             can_change_sale_price,
//             fee_payer_bump,
//             requires_sign_off,
//             seller_fee_basis_points,
//             treasury_bump,
//         })
//         .send()
//         .unwrap();

//     Ok(())
// }

// /// Return `Clone` of provided `Keypair`.

// /// Create and return new mint.

// /// Create and return new associated token account.

// /// Create new token account.
// pub fn create_token_account(
//     connection: &RpcClient,
//     wallet: &Keypair,
//     token_account: &Keypair,
//     token_mint: &Pubkey,
//     owner: &Pubkey,
// ) -> Result<(), ClientError> {
//     let (recent_blockhash, _) = connection.get_recent_blockhash()?;

//     let tx = Transaction::new_signed_with_payer(
//         &[
//             system_instruction::create_account(
//                 &wallet.pubkey(),
//                 &token_account.pubkey(),
//                 spl_token::state::Account::LEN as u64,
//                 connection
//                     .get_minimum_balance_for_rent_exemption(spl_token::state::Account::LEN)?,
//                 &spl_token::id(),
//             ),
//             spl_token::instruction::initialize_account(
//                 &spl_token::id(),
//                 &token_account.pubkey(),
//                 token_mint,
//                 owner,
//             )
//             .unwrap(),
//         ],
//         Some(&wallet.pubkey()),
//         &[wallet, token_account],
//         recent_blockhash,
//     );

//     connection.send_and_confirm_transaction(&tx)?;

//     Ok(())
// }
