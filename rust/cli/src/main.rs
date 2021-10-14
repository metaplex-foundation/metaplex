use clap::{
    self, crate_description, crate_name, crate_version, value_t, value_t_or_exit, App, AppSettings,
    Arg, ArgGroup, ArgMatches, SubCommand, Values,
};

use solana_account_decoder::{
    parse_token::{parse_token, TokenAccountType},
    UiAccountEncoding,
};
use solana_clap_utils::{
    fee_payer::fee_payer_arg,
    input_parsers::{pubkey_of, pubkey_of_signer, value_of},
    input_validators::{
        is_parsable, is_url, is_url_or_moniker, is_valid_pubkey, is_valid_signer,
        normalize_to_url_if_moniker,
    },
    keypair::{signer_from_path, CliSignerInfo},
    memo::memo_arg,
};
use solana_cli_output::{CliSignature, OutputFormat};
use solana_client::{
    rpc_client::RpcClient,
    rpc_config::{RpcAccountInfoConfig, RpcProgramAccountsConfig},
    rpc_filter::{Memcmp, MemcmpEncodedBytes, RpcFilterType},
};
use solana_remote_wallet::remote_wallet::RemoteWalletManager;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    instruction::Instruction,
    message::Message,
    native_token::lamports_to_sol,
    program_pack::Pack,
    pubkey::Pubkey,
    signer::{keypair::Keypair, Signer},
    system_instruction,
    transaction::Transaction,
};
use spl_token::{self, instruction, state::Mint};
use spl_token_metadata::{
    self,
    error::MetadataError,
    instruction::{create_metadata_accounts, update_metadata_accounts},
    state::{Creator, Data, Key, Metadata, MAX_CREATOR_LIMIT, MAX_METADATA_LEN, PREFIX},
    utils::try_from_slice_checked,
};
use std::{fmt::Display, process::exit, str::FromStr, sync::Arc};

pub mod config;
use crate::config::Config;

pub mod output;
use output::{println_display, CliMetadata, CliMint, CliTokenAmount, UiMetadata};

pub(crate) type Error = Box<dyn std::error::Error>;
type CommandResult = Result<Option<(u64, Vec<Vec<Instruction>>)>, Error>;

// INPUT VALIDATORS

fn is_mint_decimals(string: String) -> Result<(), String> {
    is_parsable::<u8>(string)
}

fn is_valid_basis_points<T>(basis_points: T) -> Result<(), String>
where
    T: AsRef<str> + Display,
{
    basis_points
        .as_ref()
        .parse::<u16>()
        .map_err(|e| {
            format!(
                "Unable to parse input basis points, provided: {}, err: {}",
                basis_points, e
            )
        })
        .and_then(|v| {
            if v > 10000 {
                Err(format!(
                    "Basis points must be in range of 0 to 10000, provided: {}",
                    v
                ))
            } else {
                Ok(())
            }
        })
}

// Checks to make sure creator shares sum to 100.
fn validate_creator_shares(creators: &Vec<Creator>) -> Result<(), clap::Error> {
    let share_sum: u64 = creators.iter().map(|c| c.share as u64).sum();
    if share_sum > 100 {
        Err(clap::Error::with_description(
            &format!("Sum of shares of {} must equal 100.", share_sum),
            clap::ErrorKind::ValueValidation,
        ))
    } else {
        Ok(())
    }
}

// Validates individuals creator <PUBKEY:SHARE> arguments to make sure the
// pubkey is valid and the individual share is less than 100. Clap doesn't have
// the native ability to validate over multiple values, i.e, to validate that sum
// of shares is equal to 100. That is done separately in the operative commands
// since it can't be done during parsing.
fn is_valid_creator<T>(creator: T) -> Result<(), String>
where
    T: AsRef<str> + Display,
{
    let split: Vec<_> = creator.as_ref().split(":").collect();
    let pubkey_result = split[0].parse::<Pubkey>();
    let share_result = split[1].parse::<u8>();
    if let Err(error) = pubkey_result {
        Err(format!("{}", error))
    } else {
        match share_result {
            Err(error) => Err(format!("{}", error)),
            Ok(share) => {
                if share > 100 {
                    Err(format!(
                        "Individual share of {} must be less than 100.",
                        share
                    ))
                } else {
                    Ok(())
                }
            }
        }
    }
}

// DATA HELPERS

fn get_creators_vec(creator_values: Option<Values>) -> Option<Vec<Creator>> {
    let mut creators = Vec::<Creator>::new();
    if let Some(creator_strings) = creator_values {
        creator_strings.for_each(|c| {
            let split: Vec<&str> = c.split(":").collect();
            let creator = Creator {
                address: Pubkey::from_str(split[0]).unwrap(),
                verified: false,
                share: u8::from_str(split[1]).unwrap(),
            };
            creators.push(creator)
        });
        Some(creators)
    } else {
        None
    }
}

fn parse_metadata_account(data: &Vec<u8>) -> Result<Metadata, Error> {
    try_from_slice_checked::<Metadata>(data, Key::MetadataV1, MAX_METADATA_LEN)
        .map_err(|e| e.into())
}

fn parse_cli_metadata(address: Pubkey, metadata: Metadata) -> CliMetadata {
    CliMetadata {
        address: address.to_string(),
        metadata: UiMetadata::from(metadata),
    }
}

fn get_metadata_address(mint_address: &Pubkey) -> Pubkey {
    let program_id = spl_token_metadata::id();

    let metadata_seeds = &[
        PREFIX.as_bytes(),
        program_id.as_ref(),
        mint_address.as_ref(),
    ];

    let (metadata_address, _) = Pubkey::find_program_address(metadata_seeds, &program_id);

    metadata_address
}

/// First tries to get the metadata account directly from the provided address. If unsuccessful, calculates
/// program address assuming provided addresses is mint address and tries to retrieve again.
fn fetch_and_parse_metadata_account(
    config: &Config,
    address: Pubkey,
) -> Result<(Pubkey, Metadata), Error> {
    let account = config.rpc_client.get_account(&address)?;

    if let Ok(metadata) = parse_metadata_account(&account.data) {
        Ok((address, metadata))
    } else {
        let address = get_metadata_address(&address);
        let account = config.rpc_client.get_account(&address)?;
        let metadata = parse_metadata_account(&account.data)?;
        Ok((address, metadata))
    }
}

// TRANSACTION HELPERS

fn new_throwaway_signer() -> (Box<dyn Signer>, Pubkey) {
    let keypair = Keypair::new();
    let pubkey = keypair.pubkey();
    (Box::new(keypair) as Box<dyn Signer>, pubkey)
}

fn get_signer(
    matches: &ArgMatches<'_>,
    keypair_name: &str,
    wallet_manager: &mut Option<Arc<RemoteWalletManager>>,
) -> Option<(Box<dyn Signer>, Pubkey)> {
    matches.value_of(keypair_name).map(|path| {
        let signer =
            signer_from_path(matches, path, keypair_name, wallet_manager).unwrap_or_else(|e| {
                eprintln!("error: {}", e);
                exit(1);
            });
        let signer_pubkey = signer.pubkey();
        (signer, signer_pubkey)
    })
}

pub(crate) fn check_fee_payer_balance(config: &Config, required_balance: u64) -> Result<(), Error> {
    let balance = config.rpc_client.get_balance(&config.fee_payer)?;
    if balance < required_balance {
        Err(format!(
            "Fee payer, {}, has insufficient balance: {} required, {} available",
            config.fee_payer,
            lamports_to_sol(required_balance),
            lamports_to_sol(balance)
        )
        .into())
    } else {
        Ok(())
    }
}

fn get_app() -> App<'static, 'static> {
    let app_matches = App::new(crate_name!())
        .about(crate_description!())
        .version(crate_version!())
        .setting(AppSettings::SubcommandRequiredElseHelp)
        .arg({
            let arg = Arg::with_name("config_file")
                .short("C")
                .long("config")
                .value_name("PATH")
                .takes_value(true)
                .global(true)
                .help("Configuration file to use");
            if let Some(ref config_file) = *solana_cli_config::CONFIG_FILE {
                arg.default_value(config_file)
            } else {
                arg
            }
        })
        .arg(
            Arg::with_name("json_rpc_url")
                .short("u")
                .long("url")
                .value_name("URL_OR_MONIKER")
                .takes_value(true)
                .global(true)
                .validator(is_url_or_moniker)
                .help(
                    "URL for Solana's JSON RPC or moniker (or their first letter): \
                   [mainnet-beta, testnet, devnet, localhost] \
                Default from the configuration file.",
                ),
        )
        .arg(
            Arg::with_name("verbose")
                .short("v")
                .long("verbose")
                .takes_value(false)
                .global(true)
                .help("Show additional information."),
        )
        .arg(
            Arg::with_name("output_format")
                .long("output")
                .value_name("FORMAT")
                .global(true)
                .takes_value(true)
                .possible_values(&["json", "json-compact"])
                .help("Return information in specified output format."),
        )
        .arg(
            Arg::with_name("dry_run")
                .long("dry-run")
                .takes_value(false)
                .global(true)
                .help("Simulate transaction instead of executing."),
        )
        .arg(fee_payer_arg().global(true))
        .subcommand(
            SubCommand::with_name("mint-info")
                .about("Query details of an SPL Mint account by address")
                .arg(
                    Arg::with_name("address")
                        .value_name("MINT_ADDRESS")
                        .validator(is_valid_pubkey)
                        .takes_value(true)
                        .required(true)
                        .index(1)
                        .help("Address of the existing mint account."),
                ),
        )
        .subcommand(
            SubCommand::with_name("metadata-info")
                .about("Query details of a Metadata account by address")
                .arg(
                    Arg::with_name("address")
                        .value_name("ADDRESS")
                        .validator(is_valid_pubkey)
                        .index(1)
                        .help(
                            "Address of the existing metadata account. \
                        Can be either token 
                        ",
                        ),
                ),
        )
        .subcommand(
            SubCommand::with_name("filter").arg(
                Arg::with_name("address")
                    .value_name("ADDRESS")
                    .validator(is_valid_pubkey)
                    .index(1)
                    .help(
                        "Address of the existing metadata account. \
                        Can be either token or metadata account.
                        ",
                    ),
            ),
        )
        .subcommand(
            SubCommand::with_name("create-metadata")
                .about("Create metadata account for existing mint")
                .arg(
                    Arg::with_name("mint_address")
                        .long("mint-address")
                        .value_name("MINT_ADDRESS")
                        .validator(is_valid_pubkey)
                        .takes_value(true)
                        .required(true)
                        .help("Address of mint account"),
                )
                .arg(
                    Arg::with_name("update_authority")
                        .long("update-authority")
                        .value_name("UPDATE_AUTHORITY_ADDRESS")
                        .validator(is_valid_pubkey)
                        .takes_value(true)
                        .help(
                            "Specify the update authority address. \
                         Defaults to the client keypair address.",
                        ),
                )
                .arg(
                    Arg::with_name("name")
                        .long("name")
                        .global(true)
                        .value_name("NAME")
                        .takes_value(true)
                        .help("Specify the name for the mint."),
                )
                .arg(
                    Arg::with_name("symbol")
                        .long("symbol")
                        .value_name("SYMBOL")
                        .takes_value(true)
                        .help("Specify the symbol for the mint."),
                )
                .arg(
                    Arg::with_name("uri")
                        .long("uri")
                        .value_name("URI")
                        .takes_value(true)
                        .required(true)
                        .validator(is_url)
                        .help("Specify the URI for the mint."),
                )
                .arg(
                    Arg::with_name("mutable")
                        .long("mutable")
                        .value_name("MUTABLE")
                        .takes_value(false)
                        .required(false)
                        .help("Permit future metadata updates"),
                )
                .arg(
                    Arg::with_name("seller_fee_basis_points")
                        .long("seller-fee-basis-points")
                        .value_name("SELLER_FEE_BASIS_POINTS")
                        .takes_value(true)
                        .required(true)
                        .validator(is_valid_basis_points)
                        .help(
                            "Specify seller fee in basis points. \
                        1000 basis points equals 100%.",
                        ),
                )
                .arg(
                    Arg::with_name("creators")
                        .long("creators")
                        .value_name("CREATORS")
                        .multiple(true)
                        .takes_value(true)
                        .validator(is_valid_creator)
                        .max_values(MAX_CREATOR_LIMIT as u64)
                        .help(
                            "Specify up to five creator addresses with \
                    percentage shares as <ADDRESS>:<SHARE> \
                    separated by spaces.",
                        ),
                ),
        )
        .subcommand(
            SubCommand::with_name("update-metadata")
                .about("Update an existing metadata account.")
                .arg(
                    Arg::with_name("address")
                        .value_name("ADDRESS")
                        .validator(is_valid_pubkey)
                        .index(1)
                        .help(
                            "Address of the existing metadata account. \
                        Can be either token 
                        ",
                        ),
                )
                .arg(
                    Arg::with_name("update_authority")
                        .long("update-authority")
                        .value_name("UPDATE_AUTHORITY_ADDRESS")
                        .validator(is_valid_pubkey)
                        .takes_value(true)
                        .help(
                            "Specify the update authority address. \
                         Defaults to the client keypair address.",
                        ),
                )
                .arg(
                    Arg::with_name("new_update_authority")
                        .long("new-update-authority")
                        .value_name("NEW_UPDATE_AUTHORITY_ADDRESS")
                        .validator(is_valid_pubkey)
                        .takes_value(true)
                        .help("Specify the new update authority address."),
                )
                .arg(
                    Arg::with_name("name")
                        .long("name")
                        .global(true)
                        .value_name("NAME")
                        .takes_value(true)
                        .help("Specify the name for the mint."),
                )
                .arg(
                    Arg::with_name("symbol")
                        .long("symbol")
                        .value_name("SYMBOL")
                        .takes_value(true)
                        .help("Specify the symbol for the mint."),
                )
                .arg(
                    Arg::with_name("uri")
                        .long("uri")
                        .value_name("URI")
                        .takes_value(true)
                        .validator(is_url)
                        .help("Specify the URI for the mint."),
                )
                .arg(
                    Arg::with_name("seller_fee_basis_points")
                        .long("seller-fee-basis-points")
                        .value_name("SELLER_FEE_BASIS_POINTS")
                        .takes_value(true)
                        .validator(is_valid_basis_points)
                        .help(
                            "Specify seller fee in basis points. \
                        1000 basis points equals 100%.",
                        ),
                )
                .arg(
                    Arg::with_name("creators")
                        .long("creators")
                        .value_name("CREATORS")
                        .multiple(true)
                        .takes_value(true)
                        .validator(is_valid_creator)
                        .max_values(MAX_CREATOR_LIMIT as u64)
                        .help(
                            "Specify up to five creator addresses with \
                            percentage shares as <ADDRESS>:<SHARE> \
                            separated by spaces.",
                        ),
                )
                .arg(
                    Arg::with_name("primary_sale_happened")
                        .long("primary-sale-happened")
                        .alias("sell-bps")
                        .value_name("SELLER_FEE_BASIS_POINTS")
                        .takes_value(false)
                        .help(
                            "Include to indicate that primary sale \
                            has happened.",
                        ),
                )
                .group(
                    ArgGroup::with_name("update_values")
                        .args(&vec![
                            "new_update_authority",
                            "name",
                            "symbol",
                            "uri",
                            "seller_fee_basis_points",
                            "creators",
                            "primary_sale_happened",
                        ])
                        .required(true)
                        .multiple(true),
                ),
        )
        .subcommand(
            SubCommand::with_name("create-token")
                .about("Create a new token")
                .arg(
                    Arg::with_name("token_keypair")
                        .value_name("TOKEN_KEYPAIR")
                        .validator(is_valid_signer)
                        .takes_value(true)
                        .index(1)
                        .help(
                            "Specify the token keypair. \
                         This may be a keypair file or the ASK keyword. \
                         [default: randomly generated keypair]",
                        ),
                )
                .arg(
                    Arg::with_name("mint_authority")
                        .long("mint-authority")
                        .alias("owner")
                        .value_name("ADDRESS")
                        .validator(is_valid_pubkey)
                        .takes_value(true)
                        .help(
                            "Specify the mint authority address. \
                         Defaults to the client keypair address.",
                        ),
                )
                .arg(
                    Arg::with_name("decimals")
                        .long("decimals")
                        .validator(is_mint_decimals)
                        .value_name("DECIMALS")
                        .takes_value(true)
                        .default_value("9")
                        .help("Number of base 10 digits to the right of the decimal place"),
                )
                .arg(
                    Arg::with_name("enable_freeze")
                        .long("enable-freeze")
                        .takes_value(false)
                        .help("Enable the mint authority to freeze associated token accounts."),
                )
                .arg(memo_arg()),
        )
        .subcommand(
            SubCommand::with_name("supply")
                .about("Get token supply")
                .arg(
                    Arg::with_name("address")
                        .validator(is_valid_pubkey)
                        .value_name("TOKEN_ADDRESS")
                        .takes_value(true)
                        .index(1)
                        .required(true)
                        .help("The token address"),
                ),
        );
    app_matches
}

fn main() {
    let no_wait = false;
    let app_matches = get_app().get_matches();

    let mut wallet_manager = None;
    let mut bulk_signers: Vec<Box<dyn Signer>> = Vec::new();

    let (sub_command, sub_matches) = app_matches.subcommand();
    let matches = sub_matches.unwrap();

    let config = {
        let cli_config = if let Some(config_file) = matches.value_of("config_file") {
            solana_cli_config::Config::load(config_file).unwrap_or_default()
        } else {
            solana_cli_config::Config::default()
        };
        let json_rpc_url = normalize_to_url_if_moniker(
            matches
                .value_of("json_rpc_url")
                .unwrap_or(&cli_config.json_rpc_url),
        );

        let (signer, fee_payer) = signer_from_path(
            matches,
            matches
                .value_of("fee_payer")
                .unwrap_or(&cli_config.keypair_path),
            "fee_payer",
            &mut wallet_manager,
        )
        .map(|s| {
            let p = s.pubkey();
            (s, p)
        })
        .unwrap_or_else(|e| {
            eprintln!("error: {}", e);
            exit(1);
        });
        bulk_signers.push(signer);

        let verbose = matches.is_present("verbose");
        let output_format = matches
            .value_of("output_format")
            .map(|value| match value {
                "json" => OutputFormat::Json,
                "json-compact" => OutputFormat::JsonCompact,
                _ => unreachable!(),
            })
            .unwrap_or(if verbose {
                OutputFormat::DisplayVerbose
            } else {
                OutputFormat::Display
            });

        let dry_run = matches.is_present("dry_run");

        Config {
            rpc_client: RpcClient::new_with_commitment(json_rpc_url, CommitmentConfig::confirmed()),
            output_format,
            fee_payer,
            default_keypair_path: cli_config.keypair_path,
            dry_run,
        }
    };

    solana_logger::setup_with_default("solana=info");

    let _ = match (sub_command, sub_matches) {
        ("mint-info", Some(arg_matches)) => {
            let address = pubkey_of(arg_matches, "address").unwrap();
            command_mint_info(&config, address)
        }
        ("metadata-info", Some(arg_matches)) => {
            let address = pubkey_of(arg_matches, "address").unwrap();
            command_metadata_info(&config, address)
        }
        ("filter", Some(arg_matches)) => {
            let address = pubkey_of(arg_matches, "address").unwrap();
            get_filtered_program_accounts(&config, address)
        }
        ("create-metadata", Some(arg_matches)) => {
            let mint_address = pubkey_of(arg_matches, "mint_address").unwrap();
            let update_authority =
                config.pubkey_or_default(arg_matches, "update_authority", &mut wallet_manager);

            let is_mutable = arg_matches.is_present("mutable");
            let name = arg_matches.value_of("name").unwrap_or(&"").to_string();
            let symbol = arg_matches.value_of("symbol").unwrap_or(&"").to_string();
            let uri = arg_matches.value_of("uri").unwrap_or(&"").to_string();
            let seller_fee_basis_points =
                value_of::<u16>(arg_matches, "seller_fee_basis_points").unwrap();

            let creators = get_creators_vec(arg_matches.values_of("creators"));

            command_create_metadata_account(
                &config,
                mint_address,
                update_authority,
                name,
                symbol,
                uri,
                creators,
                seller_fee_basis_points,
                is_mutable,
            )
        }
        ("update-metadata", Some(arg_matches)) => {
            let address = pubkey_of(arg_matches, "address").unwrap();
            let update_authority =
                config.pubkey_or_default(arg_matches, "update_authority", &mut wallet_manager);
            let new_update_authority = pubkey_of(arg_matches, "new_update_authority");

            let name = arg_matches.value_of("name").map(|v| v.to_string());
            let symbol = arg_matches.value_of("symbol").map(|v| v.to_string());
            let uri = arg_matches.value_of("uri").map(|v| v.to_string());
            let seller_fee_basis_points = value_of::<u16>(arg_matches, "seller_fee_basis_points");
            let creators = get_creators_vec(arg_matches.values_of("creators"));

            let primary_sale_happened = arg_matches
                .is_present("primary_sale_happened")
                .then(|| true);

            command_update_metadata_account(
                &config,
                address,
                update_authority,
                new_update_authority,
                name,
                symbol,
                uri,
                seller_fee_basis_points,
                creators,
                primary_sale_happened,
            )
        }
        ("supply", Some(arg_matches)) => {
            let address = pubkey_of_signer(arg_matches, "address", &mut wallet_manager)
                .unwrap()
                .unwrap();
            command_supply(&config, address)
        }
        ("create-token", Some(arg_matches)) => {
            let decimals = value_t_or_exit!(arg_matches, "decimals", u8);
            let mint_authority =
                config.pubkey_or_default(arg_matches, "mint_authority", &mut wallet_manager);
            let memo = value_t!(arg_matches, "memo", String).ok();

            let (token_signer, token) =
                get_signer(arg_matches, "token_keypair", &mut wallet_manager)
                    .unwrap_or_else(new_throwaway_signer);
            bulk_signers.push(token_signer);

            command_create_token(
                &config,
                decimals,
                token,
                mint_authority,
                arg_matches.is_present("enable_freeze"),
                memo,
            )
        }
        _ => unreachable!(),
    }
    .and_then(|transaction_info| {
        if let Some((minimum_balance_for_rent_exemption, instruction_batches)) = transaction_info {
            let fee_payer = Some(&config.fee_payer);
            let signer_info = CliSignerInfo {
                signers: bulk_signers,
            };
            let (recent_blockhash, fee_calculator) = config.rpc_client.get_recent_blockhash()?;
            for instructions in instruction_batches {
                let message = Message::new(&instructions, fee_payer);
                check_fee_payer_balance(
                    &config,
                    minimum_balance_for_rent_exemption + fee_calculator.calculate_fee(&message),
                )?;
                let signers = signer_info.signers_for_message(&message);
                let mut transaction = Transaction::new_unsigned(message);

                transaction.try_sign(&signers, recent_blockhash)?;
                let signature = if no_wait {
                    config.rpc_client.send_transaction(&transaction)?
                } else {
                    config
                        .rpc_client
                        .send_and_confirm_transaction_with_spinner(&transaction)?
                };
                let signature = CliSignature {
                    signature: signature.to_string(),
                };
                println!("{}", config.output_format.formatted_string(&signature));
            }
        }
        Ok(())
    })
    .map_err(|err| {
        eprintln!("{}", err);
        exit(1);
    });
}

fn command_mint_info(config: &Config, address: Pubkey) -> CommandResult {
    let account = config.rpc_client.get_account(&address)?;

    match parse_token(&account.data, None)? {
        TokenAccountType::Mint(mint) => {
            let cli_mint = CliMint {
                address: address.to_string(),
                mint,
            };
            println!("{}", config.output_format.formatted_string(&cli_mint));
        }
        _ => {
            println!("{} is not a mint account.", address);
        }
    };
    Ok(None)
}

// Retrieving metadata account based on calculated program account address, but
// leaving this here as template for filtering on bytes.
fn get_filtered_program_accounts(config: &Config, address: Pubkey) -> CommandResult {
    let method_config = RpcProgramAccountsConfig {
        filters: Some(vec![
            RpcFilterType::DataSize(MAX_METADATA_LEN as u64),
            RpcFilterType::Memcmp(Memcmp {
                offset: 33,
                bytes: MemcmpEncodedBytes::Binary(address.to_string()),
                encoding: None,
            }),
        ]),
        account_config: RpcAccountInfoConfig {
            encoding: Some(UiAccountEncoding::Base64),
            data_slice: None,
            commitment: Some(config.rpc_client.commitment()),
        },
        with_context: Some(false),
    };
    let accounts = config
        .rpc_client
        .get_program_accounts_with_config(&spl_token_metadata::id(), method_config)
        .map_err(|_| format!("Could not find metadata account {}", address))
        .unwrap();
    println!("{:?}", accounts);
    Ok(None)
}

fn command_metadata_info(config: &Config, address: Pubkey) -> CommandResult {
    let (address, metadata) = fetch_and_parse_metadata_account(config, address)?;
    let cli_metadata = parse_cli_metadata(address, metadata);
    println!("{}", &config.output_format.formatted_string(&cli_metadata));
    Ok(None)
}

fn command_create_metadata_account(
    config: &Config,
    mint_address: Pubkey,
    update_authority: Pubkey,
    name: String,
    symbol: String,
    uri: String,
    creators: Option<Vec<Creator>>,
    seller_fee_basis_points: u16,
    is_mutable: bool,
) -> CommandResult {
    if let Some(creators) = &creators {
        if let Err(error) = validate_creator_shares(creators) {
            return Err(error.into());
        }
    }

    let metadata_address = get_metadata_address(&mint_address);

    if let Ok(_) = config.rpc_client.get_account(&metadata_address) {
        return Err(MetadataError::AlreadyInitialized.into());
    }

    let minimum_balance_for_rent_exemption = config
        .rpc_client
        .get_minimum_balance_for_rent_exemption(MAX_METADATA_LEN)?;

    let account = config.rpc_client.get_account(&mint_address)?;

    let mint = Mint::unpack(&account.data)?;

    // I think this should be set to true if the update authority is different than the mint authority in which
    // case a signature from the update authority is required.
    let update_authority_is_signer = mint.mint_authority.unwrap() != config.fee_payer;

    println_display(config, format!("Creating metadata {}", metadata_address));

    let instructions = vec![create_metadata_accounts(
        spl_token_metadata::id(),
        metadata_address,
        mint_address,
        mint.mint_authority.unwrap(),
        config.fee_payer,
        update_authority,
        name,
        symbol,
        uri,
        creators,
        seller_fee_basis_points,
        update_authority_is_signer,
        is_mutable,
    )];

    Ok(Some((
        minimum_balance_for_rent_exemption,
        vec![instructions],
    )))
}

fn command_update_metadata_account(
    config: &Config,
    address: Pubkey,
    update_authority: Pubkey,
    new_update_authority: Option<Pubkey>,
    name: Option<String>,
    symbol: Option<String>,
    uri: Option<String>,
    seller_fee_basis_points: Option<u16>,
    creators: Option<Vec<Creator>>,
    primary_sale_happened: Option<bool>,
) -> CommandResult {
    let (metadata_address, mut metadata) = fetch_and_parse_metadata_account(config, address)?;

    let mut data: Option<Data> = None;
    let mut is_new_data: bool = false;

    if let Some(name) = name {
        metadata.data.name = name;
        is_new_data = true;
    }

    if let Some(symbol) = symbol {
        metadata.data.symbol = symbol;
        is_new_data = true;
    }

    if let Some(uri) = uri {
        metadata.data.uri = uri;
        is_new_data = true;
    }

    if let Some(seller_fee_basis_points) = seller_fee_basis_points {
        metadata.data.seller_fee_basis_points = seller_fee_basis_points;
        is_new_data = true;
    }

    if let Some(creators) = creators {
        if let Err(error) = validate_creator_shares(&creators) {
            return Err(error.into());
        } else {
            metadata.data.creators = Some(creators);
            is_new_data = true;
        }
    }

    if is_new_data {
        data = Some(metadata.data);
    }

    let minimum_balance_for_rent_exemption = config
        .rpc_client
        .get_minimum_balance_for_rent_exemption(MAX_METADATA_LEN)?;

    let instructions = vec![update_metadata_accounts(
        spl_token_metadata::id(),
        metadata_address,
        update_authority,
        new_update_authority,
        data,
        primary_sale_happened,
    )];

    Ok(Some((
        minimum_balance_for_rent_exemption,
        vec![instructions],
    )))
}

fn command_create_token(
    config: &Config,
    decimals: u8,
    token: Pubkey,
    authority: Pubkey,
    enable_freeze: bool,
    memo: Option<String>,
) -> CommandResult {
    println_display(config, format!("Creating token {}", token));

    let minimum_balance_for_rent_exemption = config
        .rpc_client
        .get_minimum_balance_for_rent_exemption(Mint::LEN)?;

    let freeze_authority_pubkey = if enable_freeze { Some(authority) } else { None };

    let mut instructions = vec![
        system_instruction::create_account(
            &config.fee_payer,
            &token,
            minimum_balance_for_rent_exemption,
            Mint::LEN as u64,
            &spl_token::id(),
        ),
        instruction::initialize_mint(
            &spl_token::id(),
            &token,
            &authority,
            freeze_authority_pubkey.as_ref(),
            decimals,
        )?,
    ];
    if let Some(text) = memo {
        instructions.push(spl_memo::build_memo(text.as_bytes(), &[&config.fee_payer]));
    }
    Ok(Some((
        minimum_balance_for_rent_exemption,
        vec![instructions],
    )))
}

fn command_supply(config: &Config, address: Pubkey) -> CommandResult {
    let supply = config.rpc_client.get_token_supply(&address)?;
    let cli_token_amount = CliTokenAmount { amount: supply };
    println!(
        "{}",
        config.output_format.formatted_string(&cli_token_amount)
    );

    Ok(None)
}

#[cfg(test)]
mod tests {
    use super::{get_app, get_creators_vec, validate_creator_shares};
    use clap::ErrorKind;
    use solana_sdk::{
        pubkey::Pubkey,
        signer::{keypair::Keypair, Signer},
    };

    #[test]
    fn create_metadata_creators() {
        // It passes if pubkeys are valid and shares sum to 100.

        let test_pubkey: Pubkey = Keypair::new().pubkey();
        let m = get_app().get_matches_from(vec![
            "testeroni",
            "create-metadata",
            "--mint-address",
            &test_pubkey.to_string(),
            "--seller-fee-basis-points",
            "1000",
            "--uri",
            "ifps://testeroni",
            "--creators",
            &format!("{k}:50", k = &test_pubkey.to_string()),
            &format!("{k}:50", k = &test_pubkey.to_string()),
        ]);
        let sub_m = m.subcommand_matches("create-metadata").unwrap();
        let creators = get_creators_vec(sub_m.values_of("creators")).unwrap();
        assert_eq!(
            validate_creator_shares(&creators).unwrap(),
            (),
            "Sum of creator shares is greater than 100."
        );
    }
    #[test]
    fn create_metadata_creators_shares_sum() {
        // It fails if shares don't sum to 100.

        let test_pubkey: Pubkey = Keypair::new().pubkey();
        let m = get_app().get_matches_from(vec![
            "testeroni",
            "create-metadata",
            "--mint-address",
            &test_pubkey.to_string(),
            "--seller-fee-basis-points",
            "1000",
            "--uri",
            "ifps://testeroni",
            "--creators",
            &format!("{k}:51", k = &test_pubkey.to_string()),
            &format!("{k}:50", k = &test_pubkey.to_string()),
        ]);
        let sub_m = m.subcommand_matches("create-metadata").unwrap();
        let creators = get_creators_vec(sub_m.values_of("creators")).unwrap();
        println!("{:?}", creators);
        let error = validate_creator_shares(&creators).unwrap_err();
        assert_eq!(error.kind, ErrorKind::ValueValidation);
    }

    #[test]
    fn create_metadata_creators_pubkey() {
        // It fails if pubkey is not valid.
        let test_pubkey: Pubkey = Keypair::new().pubkey();
        let res = get_app().get_matches_from_safe(vec![
            "testeroni",
            "create-metadata",
            "--mint-address",
            &test_pubkey.to_string(),
            "--seller-fee-basis-points",
            "1000",
            "--uri",
            "ifps://testeroni",
            "--creators",
            &format!("{k}:50", k = "bogus_pubkey"),
        ]);

        assert!(res.is_err());
        assert_eq!(res.unwrap_err().kind, ErrorKind::ValueValidation);
    }

    #[test]
    fn create_metadata_creators_share_too_high() {
        // It fails if share value is too high.
        let test_pubkey: Pubkey = Keypair::new().pubkey();
        let res = get_app().get_matches_from_safe(vec![
            "testeroni",
            "create-metadata",
            "--mint-address",
            &test_pubkey.to_string(),
            "--seller-fee-basis-points",
            "1000",
            "--uri",
            "ifps://testeroni",
            "--creators",
            &format!("{k}:101", k = "bogus_pubkey"),
        ]);

        assert!(res.is_err());
        assert_eq!(res.unwrap_err().kind, ErrorKind::ValueValidation);
    }

    #[test]
    fn update_metadata() {
        let test_pubkey: Pubkey = Keypair::new().pubkey();
        let m = get_app().get_matches_from(vec![
            "testeroni",
            "update-metadata",
            &test_pubkey.to_string(),
            "--new-update-authority",
            &test_pubkey.to_string(),
            "--name",
            "yo yo",
            "--symbol",
            "YO",
            "--uri",
            "ifps://testeroni",
            "--seller-fee-basis-points",
            "1000",
            "--creators",
            &format!("{k}:50", k = &test_pubkey.to_string()),
            &format!("{k}:50", k = &test_pubkey.to_string()),
        ]);
        let sub_m = m.subcommand_matches("update-metadata").unwrap();
        let creators = get_creators_vec(sub_m.values_of("creators")).unwrap();
        assert_eq!(validate_creator_shares(&creators).unwrap(), ());
    }

    #[test]
    fn update_metadata_not_all_args() {
        let test_pubkey: Pubkey = Keypair::new().pubkey();
        let m = get_app().get_matches_from(vec![
            "testeroni",
            "update-metadata",
            &test_pubkey.to_string(),
            "--new-update-authority",
            &test_pubkey.to_string(),
        ]);
        let sub_m = m.subcommand_matches("update-metadata").unwrap();
        assert_eq!(
            sub_m.value_of("new_update_authority").unwrap(),
            test_pubkey.to_string()
        );
    }

    #[test]
    fn update_metadata_no_args() {
        let test_pubkey: Pubkey = Keypair::new().pubkey();
        let res = get_app().get_matches_from_safe(vec![
            "testeroni",
            "update-metadata",
            &test_pubkey.to_string(),
        ]);
        assert!(res.is_err());
        assert_eq!(res.unwrap_err().kind, ErrorKind::MissingRequiredArgument);
    }
}
