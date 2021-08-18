mod show;

use {
    clap::{crate_description, crate_name, crate_version, App, Arg, SubCommand},
    show::send_show,
    solana_clap_utils::input_validators::{is_url, is_valid_pubkey, is_valid_signer},
    solana_client::rpc_client::RpcClient,
    solana_program::{account_info::AccountInfo, pubkey::Pubkey},
    solana_sdk::{account::Account, signature::read_keypair_file},
};
pub fn make_account_with_data<'a>(
    key: &'a Pubkey,
    account: &'a mut Account,
    lamports: &'a mut u64,
) -> AccountInfo<'a> {
    AccountInfo::new(
        key,
        false,
        false,
        lamports,
        &mut account.data,
        &account.owner,
        false,
        0,
    )
}

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
                ),
        )
        .get_matches();

    let client = RpcClient::new(
        app_matches
            .value_of("json_rpc_url")
            .unwrap_or(&"https://api.devnet.solana.com".to_owned())
            .to_owned(),
    );

    let (sub_command, sub_matches) = app_matches.subcommand();

    let payer = read_keypair_file(app_matches.value_of("keypair").unwrap()).unwrap();

    match (sub_command, sub_matches) {
        ("show", Some(arg_matches)) => {
            send_show(arg_matches, payer, client);
        }

        _ => unreachable!(),
    }
}
