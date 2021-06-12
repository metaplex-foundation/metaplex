use {
    crate::{AUCTION_PROGRAM_PUBKEY, TOKEN_PROGRAM_PUBKEY},
    clap::ArgMatches,
    solana_clap_utils::input_parsers::pubkey_of,
    solana_client::rpc_client::RpcClient,
    solana_program::{
        borsh::try_from_slice_unchecked, program_pack::Pack, system_instruction::create_account,
    },
    solana_sdk::{
        pubkey::Pubkey,
        signature::write_keypair_file,
        signature::{read_keypair_file, Keypair, Signer},
        transaction::Transaction,
    },
    spl_auction::{
        instruction::place_bid_instruction,
        processor::{place_bid::PlaceBidArgs, AuctionData, BidderMetadata, BidderPot},
    },
    spl_metaplex::state::{AuctionManager, Store},
    spl_token::{
        instruction::{approve, initialize_account, mint_to},
        state::Account,
    },
    std::str::FromStr,
};

pub fn make_bid(app_matches: &ArgMatches, payer: Keypair, client: RpcClient) {
    let auction_program_key = Pubkey::from_str(AUCTION_PROGRAM_PUBKEY).unwrap();
    let token_key = Pubkey::from_str(TOKEN_PROGRAM_PUBKEY).unwrap();

    let wallet: Keypair;
    if !app_matches.is_present("wallet") {
        wallet = Keypair::new();
    } else {
        wallet = read_keypair_file(app_matches.value_of("wallet").unwrap()).unwrap();
    }

    let amount = app_matches
        .value_of("price")
        .unwrap()
        .parse::<u64>()
        .unwrap();

    let auction_manager_key = pubkey_of(app_matches, "auction_manager").unwrap();

    let account = client.get_account(&auction_manager_key).unwrap();
    let manager: AuctionManager = try_from_slice_unchecked(&account.data).unwrap();

    let store_account = client.get_account(&manager.store).unwrap();
    let store: Store = try_from_slice_unchecked(&store_account.data).unwrap();

    let auction_account = client.get_account(&manager.auction).unwrap();
    let auction: AuctionData = try_from_slice_unchecked(&auction_account.data).unwrap();
    let wallet_key = wallet.pubkey();
    let bidder_pot_seeds = &[
        spl_auction::PREFIX.as_bytes(),
        &auction_program_key.as_ref(),
        manager.auction.as_ref(),
        wallet_key.as_ref(),
    ];
    let (bidder_pot_pubkey, _) =
        Pubkey::find_program_address(bidder_pot_seeds, &auction_program_key);
    let bidder_pot_account = client.get_account(&bidder_pot_pubkey);

    let transfer_authority = Keypair::new();
    let mut signers = vec![&wallet, &transfer_authority, &payer];
    let mut instructions = vec![];

    let bidder_pot_token: Pubkey;
    let new_bidder_pot = Keypair::new();
    match bidder_pot_account {
        Ok(val) => {
            let bidder_pot: BidderPot = try_from_slice_unchecked(&val.data).unwrap();
            bidder_pot_token = bidder_pot.bidder_pot;
        }
        Err(_) => {
            bidder_pot_token = new_bidder_pot.pubkey();
            signers.push(&new_bidder_pot);
            instructions.push(create_account(
                &payer.pubkey(),
                &new_bidder_pot.pubkey(),
                client
                    .get_minimum_balance_for_rent_exemption(Account::LEN)
                    .unwrap(),
                Account::LEN as u64,
                &token_key,
            ));

            instructions.push(
                initialize_account(
                    &token_key,
                    &new_bidder_pot.pubkey(),
                    &auction.token_mint,
                    &manager.auction,
                )
                .unwrap(),
            );
        }
    }

    // Make sure you can afford the bid.

    if app_matches.is_present("mint_it") {
        if !app_matches.is_present("wallet") {
            instructions.push(create_account(
                &payer.pubkey(),
                &wallet.pubkey(),
                client
                    .get_minimum_balance_for_rent_exemption(Account::LEN)
                    .unwrap(),
                Account::LEN as u64,
                &token_key,
            ));

            instructions.push(
                initialize_account(
                    &token_key,
                    &wallet.pubkey(),
                    &auction.token_mint,
                    &payer.pubkey(),
                )
                .unwrap(),
            );
        }
        instructions.push(
            mint_to(
                &token_key,
                &auction.token_mint,
                &wallet.pubkey(),
                &payer.pubkey(),
                &[&payer.pubkey()],
                amount + 2,
            )
            .unwrap(),
        );
    }

    instructions.push(
        approve(
            &token_key,
            &wallet.pubkey(),
            &transfer_authority.pubkey(),
            &payer.pubkey(),
            &[&payer.pubkey()],
            amount,
        )
        .unwrap(),
    );

    instructions.push(place_bid_instruction(
        auction_program_key,
        // Can use any account as bidder key, so we just reuse spl token account as bidder. Traditionally
        // this would be your sol wallet.
        wallet.pubkey(),
        wallet.pubkey(),
        bidder_pot_token,
        auction.token_mint,
        transfer_authority.pubkey(),
        payer.pubkey(),
        PlaceBidArgs {
            amount,
            resource: manager.vault,
        },
    ));

    let mut transaction = Transaction::new_with_payer(&instructions, Some(&payer.pubkey()));
    let recent_blockhash = client.get_recent_blockhash().unwrap().0;

    transaction.sign(&signers, recent_blockhash);
    client.send_and_confirm_transaction(&transaction).unwrap();

    let wallet_key = wallet.pubkey();
    let meta_path = [
        spl_auction::PREFIX.as_bytes(),
        store.auction_program.as_ref(),
        manager.auction.as_ref(),
        wallet_key.as_ref(),
        "metadata".as_bytes(),
    ];
    let (meta_key, _) = Pubkey::find_program_address(&meta_path, &store.auction_program);
    let bidding_metadata = client.get_account(&meta_key).unwrap();
    let _bid: BidderMetadata = try_from_slice_unchecked(&bidding_metadata.data).unwrap();
    write_keypair_file(&wallet, wallet.pubkey().to_string() + ".json").unwrap();
    println!(
        "Because no wallet provided, created new one at {:?}.json, it was used to place the bid. Please use it for redemption as a signer.",
        wallet.pubkey()
    );
    println!("Created bid {:?}", meta_key);
}
