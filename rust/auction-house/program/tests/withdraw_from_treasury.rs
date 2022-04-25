// mod utils;

// #[cfg(test)]
// mod withdraw_from_treasury {

//     use super::utils::{
//         clone_keypair,
//         setup_functions::{setup_auction_house, setup_client, setup_program},
//         transfer_lamports,
//     };
//     use anchor_client::{
//         solana_sdk::{signature::Keypair, signer::Signer, system_program},
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
//         let authority_keypair = Keypair::new();

//         // Treasury mint key
//         let t_mint_key = spl_token::native_mint::id();

//         let auction_house_key =
//             setup_auction_house(&program, &authority_keypair.pubkey(), &t_mint_key).unwrap();
//         let auction_house_account: AuctionHouse = program.account(auction_house_key)?;

//         let amount: u64 = 500_000_000;

//         transfer_lamports(
//             &program.rpc(),
//             &payer_wallet,
//             &auction_house_account.auction_house_treasury,
//             amount * 2,
//         )?;

//         let treasury_balance_before_withdraw = program
//             .rpc()
//             .get_balance(&auction_house_account.auction_house_treasury)?;

//         program
//             .request()
//             .signer(&authority_keypair)
//             .accounts(mpl_auction_house_accounts::WithdrawFromTreasury {
//                 treasury_mint: t_mint_key,
//                 authority: authority_keypair.pubkey(),
//                 treasury_withdrawal_destination: auction_house_account
//                     .treasury_withdrawal_destination,
//                 auction_house_treasury: auction_house_account.auction_house_treasury,
//                 auction_house: auction_house_key,
//                 token_program: spl_token::id(),
//                 system_program: system_program::id(),
//             })
//             .args(mpl_auction_house_instruction::WithdrawFromTreasury { amount })
//             .send()?;

//         let treasury_balance_after_withdraw = program
//             .rpc()
//             .get_balance(&auction_house_account.auction_house_treasury)?;

//         assert_eq!(
//             amount,
//             treasury_balance_before_withdraw - treasury_balance_after_withdraw
//         );

//         Ok(())
//     }
// }
