use {
    crate::PROGRAM_PUBKEY,
    clap::ArgMatches,
    solana_clap_utils::input_parsers::pubkey_of,
    solana_client::rpc_client::RpcClient,
    solana_program::borsh::try_from_slice_unchecked,
    solana_sdk::{
        pubkey::Pubkey,
        signature::{read_keypair_file, Keypair, Signer},
        transaction::Transaction,
    },
    spl_metaplex::instruction::create_start_auction_instruction,
    spl_metaplex::state::AuctionManager,
    std::str::FromStr,
};

pub fn send_start_auction(app_matches: &ArgMatches, payer: Keypair, client: RpcClient) {
    let program_key = Pubkey::from_str(PROGRAM_PUBKEY).unwrap();

    let authority = read_keypair_file(
        app_matches
            .value_of("authority")
            .unwrap_or_else(|| app_matches.value_of("keypair").unwrap()),
    )
    .unwrap();

    let auction_manager_key = pubkey_of(app_matches, "auction_manager").unwrap();

    let account = client.get_account(&auction_manager_key).unwrap();
    let manager: AuctionManager = try_from_slice_unchecked(&account.data).unwrap();
    let instructions = [create_start_auction_instruction(
        program_key,
        auction_manager_key,
        manager.auction,
        authority.pubkey(),
        manager.store,
    )];

    let signers = [&payer];
    let mut transaction = Transaction::new_with_payer(&instructions, Some(&payer.pubkey()));
    let recent_blockhash = client.get_recent_blockhash().unwrap().0;

    transaction.sign(&signers, recent_blockhash);
    client.send_and_confirm_transaction(&transaction).unwrap();

    println!("Started auction.");
}
