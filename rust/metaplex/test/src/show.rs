use {
    clap::ArgMatches,
    solana_clap_utils::input_parsers::pubkey_of,
    solana_client::rpc_client::RpcClient,
    solana_program::{borsh::try_from_slice_unchecked, pubkey::Pubkey},
    solana_sdk::signature::Keypair,
    spl_auction::processor::{AuctionData, AuctionDataExtended},
    spl_metaplex::state::AuctionManager,
};

pub fn send_show(app_matches: &ArgMatches, _payer: Keypair, client: RpcClient) {
    let auction_manager_key = pubkey_of(app_matches, "auction_manager").unwrap();

    let account = client.get_account(&auction_manager_key).unwrap();
    let manager: AuctionManager = try_from_slice_unchecked(&account.data).unwrap();
    let auction_data = client.get_account(&manager.auction).unwrap();
    let auction: AuctionData = try_from_slice_unchecked(&auction_data.data).unwrap();
    let auction_program = spl_auction::id();
    let seeds = &[
        spl_auction::PREFIX.as_bytes(),
        &auction_program.as_ref(),
        manager.vault.as_ref(),
        spl_auction::EXTENDED.as_bytes(),
    ];
    let (extended, _) = Pubkey::find_program_address(seeds, &auction_program);
    let auction_data = client.get_account(&extended).unwrap();
    let auction_ext: AuctionDataExtended = try_from_slice_unchecked(&auction_data.data).unwrap();

    let curr_slot = client.get_slot();
    println!("Auction Manager: {:#?}", manager);
    println!("Auction: #{:#?}", auction);
    println!("Extended data: {:#?}", auction_ext);
    println!(
        "Current slot: {:?}, Auction ends at: {:?}",
        curr_slot, auction.ended_at
    )
}
