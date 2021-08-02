use {
    super::make_account_with_data,
    clap::ArgMatches,
    solana_clap_utils::input_parsers::pubkey_of,
    solana_client::rpc_client::RpcClient,
    solana_program::{borsh::try_from_slice_unchecked, pubkey::Pubkey},
    solana_sdk::signature::Keypair,
    spl_auction::processor::{AuctionData, AuctionDataExtended},
    spl_metaplex::{
        deprecated_state::AuctionManagerV1,
        state::{AuctionManagerV2, AuctionWinnerTokenTypeTracker, Key},
    },
};

pub fn send_show(app_matches: &ArgMatches, _payer: Keypair, client: RpcClient) {
    let auction_manager_key = pubkey_of(app_matches, "auction_manager").unwrap();

    let account = client.get_account(&auction_manager_key).unwrap();
    let mut managerv1: Option<AuctionManagerV1> = None;
    let mut managerv2: Option<AuctionManagerV2> = None;
    let auction_key: Pubkey;
    let vault_key: Pubkey;
    if account.data[0] == Key::AuctionManagerV1 as u8 {
        managerv1 = Some(try_from_slice_unchecked(&account.data).unwrap());
        if let Some(manager) = &managerv1 {
            auction_key = manager.auction;
            vault_key = manager.vault;
        } else {
            println!("This should never happen, manager was not loaded.");
            return;
        }
    } else {
        managerv2 = Some(try_from_slice_unchecked(&account.data).unwrap());
        if let Some(manager) = &managerv2 {
            auction_key = manager.auction;
            vault_key = manager.vault;
        } else {
            println!("This should never happen, manager was not loaded.");
            return;
        }
    }

    let auction_data = client.get_account(&auction_key).unwrap();
    let auction: AuctionData = try_from_slice_unchecked(&auction_data.data).unwrap();
    let auction_program = spl_auction::id();
    let seeds = &[
        spl_auction::PREFIX.as_bytes(),
        &auction_program.as_ref(),
        vault_key.as_ref(),
        spl_auction::EXTENDED.as_bytes(),
    ];
    let (extended, _) = Pubkey::find_program_address(seeds, &auction_program);
    let auction_data = client.get_account(&extended).unwrap();
    let auction_ext: AuctionDataExtended = try_from_slice_unchecked(&auction_data.data).unwrap();

    let curr_slot = client.get_slot();
    if let Some(manager) = managerv1 {
        println!("Auction Manager: {:#?}", manager);
    } else if let Some(manager) = managerv2 {
        let (token_tracker, _) = Pubkey::find_program_address(
            &[
                spl_metaplex::state::PREFIX.as_bytes(),
                spl_metaplex::id().as_ref(),
                auction_manager_key.as_ref(),
                spl_metaplex::state::TOTALS.as_bytes(),
            ],
            &spl_metaplex::id(),
        );
        let token_tracker_data = client.get_account(&token_tracker);

        println!("Auction Manager: {:#?}", manager);
        match token_tracker_data {
            Ok(mut data) => {
                let mut lamports: u64 = 0;
                let token_tracker_obj: AuctionWinnerTokenTypeTracker =
                    AuctionWinnerTokenTypeTracker::from_account_info(&make_account_with_data(
                        &token_tracker,
                        &mut data,
                        &mut lamports,
                    ))
                    .unwrap();

                println!("Token tracker: {:#?}", token_tracker_obj);
            }
            Err(_) => println!("No token tracker found"),
        }
    }
    println!("Auction: #{:#?}", auction);
    println!("Extended data: {:#?}", auction_ext);
    println!(
        "Current slot: {:?}, Auction ends at: {:?}",
        curr_slot, auction.ended_at
    )
}
