mod initialize_auction_manager;
mod place_bid;
mod redeem_bid;
mod settings_utils;
mod show;
mod start_auction;
mod validate_safety_deposits;
mod vault_utils;

use {
    clap::{crate_description, crate_name, crate_version, App, Arg, SubCommand},
    initialize_auction_manager::initialize_auction_manager,
    place_bid::make_bid,
    redeem_bid::redeem_bid_wrapper,
    show::send_show,
    solana_clap_utils::input_validators::{is_url, is_valid_pubkey, is_valid_signer},
    solana_client::rpc_client::RpcClient,
    solana_sdk::signature::read_keypair_file,
    start_auction::send_start_auction,
    validate_safety_deposits::validate_safety_deposits,
};

pub const VAULT_PROGRAM_PUBKEY: &str = "vau1zxA2LbssAUEF7Gpw91zMM1LvXrvpzJtmZ58rPsn";
pub const AUCTION_PROGRAM_PUBKEY: &str = "auctxRXPeJoc4817jDhf4HbjnhEcr1cCXenosMhK5R8";

pub const PROGRAM_PUBKEY: &str = "p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98";

pub const TOKEN_PROGRAM_PUBKEY: &str = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

fn main() {
    let app_matches = App::new(crate_name!())
        .about(crate_description!())
        .version(crate_version!())
        .arg(
            Arg::with_name("keypair")
                .long("keypair")
                .value_name("KEYPAIR")
                .validator(is_valid_signer)
                .takes_value(true)
                .global(true)
                .help("Filepath or URL to a keypair"),
        )
        .arg(
            Arg::with_name("json_rpc_url")
                .long("url")
                .value_name("URL")
                .takes_value(true)
                .global(true)
                .validator(is_url)
                .help("JSON RPC URL for the cluster [default: devnet]"),
        )
        .arg(
            Arg::with_name("admin")
                .long("admin")
                .value_name("ADMIN")
                .required(false)
                .validator(is_valid_signer)
                .takes_value(true)
                .help("Admin of the store you want to use, defaults to your key"),
        )
        .subcommand(
            SubCommand::with_name("init")
                .about("Initialize an Auction Manager")
                .arg(
                    Arg::with_name("authority")
                        .long("authority")
                        .value_name("AUTHORITY")
                        .required(false)
                        .validator(is_valid_pubkey)
                        .takes_value(true)
                        .help("Pubkey of authority, defaults to you otherwise"),
                )
                .arg(
                    Arg::with_name("external_price_account")
                        .long("external_price_account")
                        .value_name("EXTERNAL_PRICE_ACCOUNT")
                        .required(false)
                        .validator(is_valid_pubkey)
                        .takes_value(true)
                        .help("Pubkey of external price account, if one not provided, one will be made. Needs to be same as the one on the Vault."),
                )
                .arg(
                    Arg::with_name("vault")
                        .long("vault")
                        .value_name("VAULT")
                        .required(false)
                        .validator(is_valid_pubkey)
                        .takes_value(true)
                        .help("Pubkey of vault. If one not provided, one will be made."),
                )
                .arg(
                    Arg::with_name("auction")
                        .long("auction")
                        .value_name("AUCTION")
                        .required(false)
                        .validator(is_valid_pubkey)
                        .takes_value(true)
                        .help("Pubkey of auction. If one not provided, one will be made."),
                )
                .arg(
                    Arg::with_name("winner_limit")
                        .long("winner_limit")
                        .value_name("WINNER_LIMIT")
                        .required(false)
                        .takes_value(true)
                        .help("Defaults to unlimited (0), ignored if existing auction provided."),
                ).arg(
                    Arg::with_name("gap_time")
                        .long("gap_time")
                        .value_name("GAP_TIME")
                        .required(false)
                        .takes_value(true)
                        .help("Defaults to 1200 slots, ignored if existing auction provided."),
                )
                .arg(
                    Arg::with_name("end_time")
                        .long("end_time")
                        .value_name("END_TIME")
                        .required(false)
                        .takes_value(true)
                        .help("Defaults to 1200 slots, ignored if existing auction provided."),
                )
                .arg(
                    Arg::with_name("settings_file")
                        .long("settings_file")
                        .value_name("SETTINGS_FILE")
                        .takes_value(true)
                        .required(true)
                        .help("File path or uri to settings file (json) for setting up Auction Managers. See settings_sample.json, and you can follow the JSON structs in settings_utils.rs to customize the AuctionManagerSetting struct that gets created for shipping."),
                ),
        ).subcommand(
            SubCommand::with_name("validate")
                .about("Validate one (or all) of the winning configurations of your auction manager by slot.")
                .arg(
                    Arg::with_name("authority")
                        .long("authority")
                        .value_name("AUTHORITY")
                        .required(false)
                        .validator(is_valid_signer)
                        .takes_value(true)
                        .help("Pubkey of authority, defaults to you otherwise"),
                )
                .arg(
                    Arg::with_name("metadata_authority")
                        .long("metadata_authority")
                        .value_name("METADATA_AUTHORITY")
                        .required(false)
                        .validator(is_valid_signer)
                        .takes_value(true)
                        .help("Pubkey of the metadata authority on the given winning configuration(s), defaults to you otherwise"),
                )
                .arg(
                    Arg::with_name("auction_manager")
                        .long("auction_manager")
                        .value_name("AUCTION_MANAGER")
                        .required(true)
                        .validator(is_valid_pubkey)
                        .takes_value(true)
                        .help("Pubkey of auction manager."),
                )
                .arg(
                    Arg::with_name("winner_config_slot")
                        .long("winner_config_slot")
                        .value_name("WINNER_CONFIG_SLOT")
                        .required(false)
                        .takes_value(true)
                        .help("Pass in a specific 0-indexed slot in the array to validate that slot, if not passed, all will be validated."),
                )
        ).subcommand(
            SubCommand::with_name("show")
                .about("Print out the manager data for a given manager address.")
                .arg(
                    Arg::with_name("auction_manager")
                        .long("auction_manager")
                        .value_name("AUCTION_MANAGER")
                        .required(true)
                        .validator(is_valid_pubkey)
                        .takes_value(true)
                        .help("Pubkey of auction manager."),
                )
        ).subcommand(
            SubCommand::with_name("place_bid")
                .about("Place a bid on a specific slot, receive a bidder metadata address in return.")
                .arg(
                    Arg::with_name("auction_manager")
                        .long("auction_manager")
                        .value_name("AUCTION_MANAGER")
                        .required(true)
                        .validator(is_valid_pubkey)
                        .takes_value(true)
                        .help("Pubkey of auction manager."),
                ).arg(
                    Arg::with_name("wallet")
                        .long("wallet")
                        .value_name("WALLET")
                        .required(false)
                        .validator(is_valid_signer)
                        .takes_value(true)
                        .help("Valid wallet, defaults to you."),
                ).arg(
                    Arg::with_name("mint_it")
                        .long("mint_it")
                        .value_name("MINT_IT")
                        .required(false)
                        .takes_value(false)
                        .help("Attempts to mint the tokens. Useful on devnet and you need to have authority as payer over the token_mint on the auction."),
                )
                .arg(
                    Arg::with_name("price")
                        .long("price")
                        .value_name("PRICE")
                        .required(true)
                        .takes_value(true)
                        .help("The price in sol you want to bid"),
                )
        ).subcommand(
            SubCommand::with_name("redeem_bid")
                .about("Redeem a bid")
                .arg(
                    Arg::with_name("auction_manager")
                        .long("auction_manager")
                        .value_name("AUCTION_MANAGER")
                        .required(true)
                        .validator(is_valid_pubkey)
                        .takes_value(true)
                        .help("Pubkey of auction manager."),
                ).arg(
                    Arg::with_name("wallet")
                        .long("wallet")
                        .value_name("WALLET")
                        .required(false)
                        .validator(is_valid_signer)
                        .takes_value(true)
                        .help("Wallet that placed the bid, defaults to you."),
                ).arg(
                    Arg::with_name("mint_it")
                        .long("mint_it")
                        .value_name("MINT_IT")
                        .required(false)
                        .takes_value(false)
                        .help("Attempts to mint tokens to pay for the open edition. Useful on devnet and you need to have authority as payer over the token_mint on the auction."),
                )
        ).subcommand(
            SubCommand::with_name("start_auction")
                .about("Starts an auction on an auction manager that has been fully validated")
                .arg(
                    Arg::with_name("auction_manager")
                        .long("auction_manager")
                        .value_name("AUCTION_MANAGER")
                        .required(true)
                        .validator(is_valid_pubkey)
                        .takes_value(true)
                        .help("Pubkey of auction manager."),
                ).arg(
                    Arg::with_name("authority")
                        .long("authority")
                        .value_name("AUTHORITY")
                        .required(false)
                        .validator(is_valid_signer)
                        .takes_value(true)
                        .help("Pubkey of authority, defaults to you otherwise"),
                )
        )

        .get_matches();

    let client = RpcClient::new(
        app_matches
            .value_of("json_rpc_url")
            .unwrap_or(&"https://devnet.solana.com".to_owned())
            .to_owned(),
    );

    let (sub_command, sub_matches) = app_matches.subcommand();

    let payer = read_keypair_file(app_matches.value_of("keypair").unwrap()).unwrap();

    match (sub_command, sub_matches) {
        ("init", Some(arg_matches)) => {
            let (key, manager) = initialize_auction_manager(arg_matches, payer, client);
            println!(
                "Created auction manager with address {:?} and output {:?}",
                key, manager
            );
        }
        ("validate", Some(arg_matches)) => {
            validate_safety_deposits(arg_matches, payer, client);
            println!("Validated all winning configs passed in.",);
        }
        ("place_bid", Some(arg_matches)) => {
            make_bid(arg_matches, payer, client);
        }
        ("redeem_bid", Some(arg_matches)) => {
            redeem_bid_wrapper(arg_matches, payer, client);
        }
        ("start_auction", Some(arg_matches)) => {
            send_start_auction(arg_matches, payer, client);
        }
        ("show", Some(arg_matches)) => {
            send_show(arg_matches, payer, client);
        }

        _ => unreachable!(),
    }
}
