// mod utils;

// #[cfg(test)]
// mod withdraw {

//     use super::utils::{
//         clone_keypair,
//         helpers::derive_auction_house_buyer_escrow_account_key,
//         setup_functions::{setup_auction_house, setup_client, setup_program},
//         transfer_lamports,
//     };
//     use anchor_client::{
//         solana_sdk::{signature::Keypair, signer::Signer, system_program, sysvar},
//         ClientError,
//     };
//     use mpl_auction_house::{
//         accounts as mpl_auction_house_accounts, instruction as mpl_auction_house_instruction,
//         AuctionHouse,
//     };

//     #[test]
//     fn success() -> Result<(), ClientError> {
//         // Payer Wallet
//         let payer_wallet = Keypair::new();

//         // Client
//         let client = setup_client(clone_keypair(&payer_wallet));

//         // Program
//         let program = setup_program(client);

//         // Airdrop the payer wallet
//         let signature = program
//             .rpc()
//             .request_airdrop(&program.payer(), 10_000_000_000)?;
//         program.rpc().poll_for_signature(&signature)?;

//         // Auction house authority
//         let authority = Keypair::new().pubkey();

//         // Treasury mint key
//         let t_mint_key = spl_token::native_mint::id();

//         let auction_house_key = setup_auction_house(&program, &authority, &t_mint_key).unwrap();
//         let auction_house_account: AuctionHouse = program.account(auction_house_key)?;
//         let wallet_pubkey = program.payer();

//         let (escrow_payment_account, escrow_payment_bump) =
//             derive_auction_house_buyer_escrow_account_key(
//                 &auction_house_key,
//                 &wallet_pubkey,
//                 &program.id(),
//             );

//         let amount: u64 = 500_000_000;

//         transfer_lamports(
//             &program.rpc(),
//             &payer_wallet,
//             &escrow_payment_account,
//             amount * 2,
//         )?;

//         let escrow_balance_before_withdraw = program.rpc().get_balance(&escrow_payment_account)?;

//         program
//             .request()
//             .accounts(mpl_auction_house_accounts::Withdraw {
//                 wallet: wallet_pubkey,
//                 escrow_payment_account,
//                 receipt_account: wallet_pubkey,
//                 treasury_mint: t_mint_key,
//                 authority,
//                 auction_house: auction_house_key,
//                 auction_house_fee_account: auction_house_account.auction_house_fee_account,
//                 token_program: spl_token::id(),
//                 system_program: system_program::id(),
//                 ata_program: spl_associated_token_account::id(),
//                 rent: sysvar::rent::id(),
//             })
//             .args(mpl_auction_house_instruction::Withdraw {
//                 escrow_payment_bump,
//                 amount,
//             })
//             .send()?;

//         let escrow_balance_after_withdraw = program.rpc().get_balance(&escrow_payment_account)?;

//         assert_eq!(
//             amount,
//             escrow_balance_before_withdraw - escrow_balance_after_withdraw
//         );

//         Ok(())
//     }
// }
