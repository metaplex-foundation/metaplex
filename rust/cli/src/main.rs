use clap::{
    self, crate_description, crate_name, crate_version, value_t, value_t_or_exit, App, AppSettings,
    Arg, ArgGroup, ArgMatches, SubCommand, Values,
};
use spl_associated_token_account::{
    self, create_associated_token_account, get_associated_token_address,
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
    system_instruction, system_program,
    transaction::Transaction,
};
use spl_token::{
    self,
    state::{Account, Mint},
};
use spl_token_metadata::{
    self,
    error::MetadataError,
    instruction::{create_master_edition, create_metadata_accounts, update_metadata_accounts},
    state::{
        Creator, Data, Key, Metadata, EDITION, MAX_CREATOR_LIMIT, MAX_MASTER_EDITION_LEN,
        MAX_METADATA_LEN, PREFIX,
    },
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

trait FromArgMatches<T> {
    fn from_argmatches(arg_matches: &ArgMatches) -> Self;
}

impl FromArgMatches<Data> for Data {
    fn from_argmatches(arg_matches: &ArgMatches) -> Self {
        Self {
            name: arg_matches.value_of("name").unwrap_or(&"").to_string(),
            symbol: arg_matches.value_of("symbol").unwrap_or(&"").to_string(),
            uri: arg_matches.value_of("uri").unwrap_or(&"").to_string(),
            seller_fee_basis_points: value_of::<u16>(arg_matches, "seller_fee_basis_points")
                .unwrap_or(0),
            creators: get_creators_vec(arg_matches.values_of("creators")),
        }
    }
}

struct MintData {
    token: Pubkey,
    mint_authority: Pubkey,
    decimals: u8,
    enable_freeze: bool,
    memo: Option<String>,
}

trait FromArgMatchesConfig<T> {
    fn from_argmatches(
        arg_matches: &ArgMatches,
        config: Option<&Config>,
        wallet_manager: &mut Option<Arc<RemoteWalletManager>>,
    ) -> (Box<dyn Signer>, Self);
}

impl FromArgMatchesConfig<MintData> for MintData {
    fn from_argmatches(
        arg_matches: &ArgMatches,
        config: Option<&Config>,
        wallet_manager: &mut Option<Arc<RemoteWalletManager>>,
    ) -> (Box<dyn Signer>, Self) {
        let (signer, token) = get_signer(arg_matches, "token_keypair", wallet_manager)
            .unwrap_or_else(new_throwaway_signer);

        (
            signer,
            Self {
                token,
                mint_authority: config.unwrap().pubkey_or_default(
                    arg_matches,
                    "mint_authority",
                    wallet_manager,
                ),
                decimals: value_t_or_exit!(arg_matches, "decimals", u8),
                enable_freeze: arg_matches.is_present("enable_freeze"),
                memo: value_t!(arg_matches, "memo", String).ok(),
            },
        )
    }
}

fn parse_cli_metadata(address: Pubkey, metadata: Metadata) -> CliMetadata {
    CliMetadata {
        address: address.to_string(),
        metadata: UiMetadata::from(metadata),
    }
}
fn get_metadata_address(mint_address: &Pubkey) -> Pubkey {
    let program_id = spl_token_metadata::id();

    let seeds = &[
        PREFIX.as_bytes(),
        program_id.as_ref(),
        mint_address.as_ref(),
    ];

    let (address, _) = Pubkey::find_program_address(seeds, &program_id);

    address
}
trait FetchParse<T> {
    fn fetch_and_parse(config: &Config, address: &Pubkey) -> Result<(Pubkey, T), Error>;
    fn calc_associated_address(address0: &Pubkey, address1: Option<&Pubkey>) -> Pubkey;
}

fn parse_metadata_account(data: &Vec<u8>) -> Result<Metadata, Error> {
    try_from_slice_checked::<Metadata>(data, Key::MetadataV1, MAX_METADATA_LEN)
        .map_err(|e| e.into())
}

impl FetchParse<Metadata> for Metadata {
    // First tries to get the metadata account directly from the provided address. If unsuccessful, calculates
    // program address assuming provided addresses is mint address and tries to retrieve again.
    fn fetch_and_parse(config: &Config, address: &Pubkey) -> Result<(Pubkey, Metadata), Error> {
        let account = config.rpc_client.get_account(&address)?;

        if let Ok(metadata) = parse_metadata_account(&account.data) {
            Ok((address.clone(), metadata))
        } else {
            let address = get_metadata_address(&address);
            let account = config.rpc_client.get_account(&address)?;
            let metadata = parse_metadata_account(&account.data)?;
            Ok((address, metadata))
        }
    }
    /// Returns metadata address
    fn calc_associated_address(mint_address: &Pubkey, _: Option<&Pubkey>) -> Pubkey {
        let program_id = spl_token_metadata::id();
        let seeds = &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            mint_address.as_ref(),
        ];
        let (metadata_address, _) = Pubkey::find_program_address(seeds, &program_id);
        metadata_address
    }
}

impl FetchParse<Mint> for Mint {
    fn fetch_and_parse(config: &Config, address: &Pubkey) -> Result<(Pubkey, Mint), Error> {
        let account = config.rpc_client.get_account(&address)?;
        let mint = Mint::unpack(&account.data)?;
        Ok((address.clone(), mint))
    }

    /// Returns token account. Mint addresss is first arguments since fn lives on Mint.
    fn calc_associated_address(mint_address: &Pubkey, wallet_address: Option<&Pubkey>) -> Pubkey {
        get_associated_token_address(wallet_address.unwrap(), mint_address)
    }
}

trait MasterEditionCalc<T> {
    fn calc_master_edition(mint_address: &Pubkey) -> Pubkey;
}

impl MasterEditionCalc<Mint> for Mint {
    fn calc_master_edition(mint_address: &Pubkey) -> Pubkey {
        let program_id = spl_token_metadata::id();
        let seeds = &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            mint_address.as_ref(),
            EDITION.as_bytes(),
        ];
        let (master_edition_address, _) = Pubkey::find_program_address(seeds, &program_id);
        master_edition_address
    }
}

// TRANSACTION HELPERS

#[allow(dead_code)]
fn new_throwaway_signer() -> (Box<dyn Signer>, Pubkey) {
    let keypair = Keypair::new();
    let pubkey = keypair.pubkey();
    (Box::new(keypair) as Box<dyn Signer>, pubkey)
}

#[allow(dead_code)]
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

// CLAP ARGUMENTS

fn generic_address_arg<'a, 'b>() -> Arg<'a, 'b> {
    Arg::with_name("address")
        .long("address")
        .value_name("ADDRESS")
        .validator(is_valid_pubkey)
        .required(true)
        .index(1)
        .help("Address of either metadata account or token mint.")
}

fn update_authority_arg<'a, 'b>() -> Arg<'a, 'b> {
    Arg::with_name("update_authority")
        .long("update-authority")
        .value_name("UPDATE_AUTHORITY_ADDRESS")
        .validator(is_valid_pubkey)
        .takes_value(true)
        .help("Specify the update authority address. Defaults to the client keypair address.")
}

fn mint_address_arg<'a, 'b>() -> Arg<'a, 'b> {
    Arg::with_name("mint_address")
        .value_name("MINT_ADDRESS")
        .validator(is_valid_pubkey)
        .takes_value(true)
        .help("Address of the existing mint account.")
}

trait MintArgs {
    fn mint_args(self) -> Self;
}

impl MintArgs for App<'_, '_> {
    fn mint_args(self) -> Self {
        self.arg(
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
                .value_name("UPDATE_AUTHORITY")
                .validator(is_valid_pubkey)
                .takes_value(true)
                .help(
                    "Specify the mint authority address. Defaults to the client keypair address.",
                ),
        )
        .arg(
            Arg::with_name("decimals")
                .long("decimals")
                .takes_value(true)
                .value_name("DECIMALS")
                .validator(is_mint_decimals)
                .default_value("0")
                .help("Decimals of mint that token account is associated with."),
        )
        .arg(
            Arg::with_name("enable_freeze")
                .long("enable-freeze")
                .takes_value(false)
                .help("Enable the mint authority to freeze associated token accounts."),
        )
        .arg(memo_arg())
    }
}

trait MetadataArgs {
    fn metadata_args(self) -> Self;
}

impl MetadataArgs for App<'_, '_> {
    fn metadata_args(self) -> Self {
        self.arg(
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
            Arg::with_name("immutable")
                .long("immutable")
                .value_name("IMMUTABLE")
                .takes_value(false)
                .help("Prohibit future metadata updates"),
        )
        .arg(
            Arg::with_name("seller_fee_basis_points")
                .long("seller-fee-basis-points")
                .value_name("SELLER_FEE_BASIS_POINTS")
                .takes_value(true)
                .validator(is_valid_basis_points)
                .help("Specify seller fee in basis points (10000 basis points equals 100%)."),
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
                .arg(mint_address_arg()),
        )
        .subcommand(
            SubCommand::with_name("metadata-info")
                .about("Query details of a Metadata account by address")
                .arg(generic_address_arg()),
        )
        .subcommand(SubCommand::with_name("filter").arg(generic_address_arg()))
        .subcommand(
            SubCommand::with_name("metadata-create")
                .about("Create metadata account for existing mint.")
                .arg(mint_address_arg())
                .arg(update_authority_arg())
                .metadata_args(),
        )
        .subcommand(
            SubCommand::with_name("metadata-update")
                .about("Update an existing metadata account.")
                .arg(generic_address_arg())
                .arg(update_authority_arg())
                .arg(
                    Arg::with_name("new_update_authority")
                        .long("new-update-authority")
                        .value_name("NEW_UPDATE_AUTHORITY_ADDRESS")
                        .validator(is_valid_pubkey)
                        .takes_value(true)
                        .help("Specify the new update authority address."),
                )
                .arg(
                    Arg::with_name("primary_sale_happened")
                        .long("primary-sale-happened")
                        .value_name("PRIMARY_SALE_HAPPENED")
                        .takes_value(false)
                        .help("indicateS primary sale has happened."),
                )
                .metadata_args()
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
            SubCommand::with_name("nft-create")
                .about(
                    "Create a de novo nft, including mint, token \
                    account, metadata and master edition.",
                )
                .mint_args()
                .metadata_args()
                .arg(update_authority_arg())
                .arg(
                    Arg::with_name("max_supply")
                        .long("max-supply")
                        .value_name("MAX_SUPPLY")
                        .takes_value(true)
                        .validator(|s| is_parsable::<u64>(s))
                        .default_value("1")
                        .help("Specify maximum allowable supply for master edition."),
                ),
        )
        .subcommand(
            SubCommand::with_name("mint-create")
                .about("Create a new token")
                .mint_args(),
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
        ("metadata-create", Some(arg_matches)) => {
            let mint_address = pubkey_of(arg_matches, "mint_address").unwrap();
            let update_authority =
                config.pubkey_or_default(arg_matches, "update_authority", &mut wallet_manager);
            let is_mutable = !arg_matches.is_present("immutable");

            let data = Data::from_argmatches(&arg_matches);

            command_metadata_create(
                &config,
                mint_address,
                update_authority,
                is_mutable,
                data,
                None,
            )
        }
        ("metadata-update", Some(arg_matches)) => {
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

            command_metadata_update_account(
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
        ("nft-create", Some(arg_matches)) => {
            let (signer, mint_data) =
                MintData::from_argmatches(&arg_matches, Some(&config), &mut wallet_manager);
            bulk_signers.push(signer);

            let update_authority =
                config.pubkey_or_default(arg_matches, "update_authority", &mut wallet_manager);
            let is_mutable = !arg_matches.is_present("immutable");
            let metadata_data = Data::from_argmatches(&arg_matches);

            let max_supply = value_t!(arg_matches, "max_supply", u64).ok();

            command_nft_create(
                &config,
                mint_data,
                update_authority,
                is_mutable,
                metadata_data,
                max_supply,
            )
        }
        ("supply", Some(arg_matches)) => {
            let address = pubkey_of_signer(arg_matches, "address", &mut wallet_manager)
                .unwrap()
                .unwrap();
            command_supply(&config, address)
        }
        ("mint-create", Some(arg_matches)) => {
            let (signer, data) =
                MintData::from_argmatches(&arg_matches, Some(&config), &mut wallet_manager);
            bulk_signers.push(signer);

            command_create_token(&config, &data)
        }
        _ => unreachable!(),
    }
    // Note that transaction_info is expected to contain batches of instructions so that related
    // instructions can be processed together in separate transactions atomically.
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
    let (address, metadata) = Metadata::fetch_and_parse(config, &address)?;
    let cli_metadata = parse_cli_metadata(address, metadata);
    println!("{}", &config.output_format.formatted_string(&cli_metadata));
    Ok(None)
}

fn command_metadata_create(
    config: &Config,
    mint_address: Pubkey,
    update_authority: Pubkey,
    is_mutable: bool,
    data: Data,
    mint_data: Option<&MintData>,
) -> CommandResult {
    if let Some(creators) = &data.creators {
        if let Err(error) = validate_creator_shares(creators) {
            return Err(error.into());
        }
    }

    let metadata_address = Metadata::calc_associated_address(&mint_address, None);

    let minimum_balance_for_rent_exemption = config
        .rpc_client
        .get_minimum_balance_for_rent_exemption(MAX_METADATA_LEN)?;

    let mint_authority = match mint_data {
        Some(mint_data) => mint_data.mint_authority,
        None => {
            let (_, mint) = Mint::fetch_and_parse(config, &mint_address)?;
            mint.mint_authority.unwrap()
        }
    };

    // I think this should be set to true if the update authority is different than the mint authority in which
    // case a signature from the update authority is required.
    let update_authority_is_signer = &mint_authority != &config.fee_payer;

    println_display(config, format!("Creating metadata {}", metadata_address));

    let instructions = vec![create_metadata_accounts(
        spl_token_metadata::id(),
        metadata_address,
        mint_address,
        mint_authority,
        config.fee_payer,
        update_authority,
        data.name,
        data.symbol,
        data.uri,
        data.creators,
        data.seller_fee_basis_points,
        update_authority_is_signer,
        is_mutable,
    )];

    Ok(Some((
        minimum_balance_for_rent_exemption,
        vec![instructions],
    )))
}

fn command_metadata_update_account(
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
    let (metadata_address, mut metadata) = Metadata::fetch_and_parse(config, &address)?;
    if !metadata.is_mutable {
        return Err(MetadataError::DataIsImmutable.into());
    }

    println_display(
        config,
        format!(
            "Updating metadata:\n  Metadata: {}\n  Mint: {}",
            metadata_address, metadata.mint
        ),
    );

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

fn command_master_edition_create(
    config: &Config,
    update_authority: Pubkey,
    metadata_address: Pubkey,
    mint_data: &MintData,
    max_supply: Option<u64>,
) -> CommandResult {
    let minimum_balance_for_rent_exemption = config
        .rpc_client
        .get_minimum_balance_for_rent_exemption(MAX_MASTER_EDITION_LEN)?;

    let edition = Mint::calc_master_edition(&mint_data.token);

    let instructions = vec![create_master_edition(
        spl_token_metadata::id(),
        edition,
        mint_data.token,
        update_authority,
        mint_data.mint_authority,
        metadata_address,
        config.fee_payer,
        max_supply,
    )];

    Ok(Some((
        minimum_balance_for_rent_exemption,
        vec![instructions],
    )))
}

/// Creates an nft from scratch
/// 1. Create a mint with zero decimals
/// 2. Create corresponding token account
/// 3. Mint one token to the token account
/// 4. Create mint metadata account
/// 5. Create master edition
fn command_nft_create(
    config: &Config,
    mint_data: MintData,
    update_authority: Pubkey,
    is_mutable: bool,
    metadata_data: Data,
    max_supply: Option<u64>,
) -> CommandResult {
    // Collect minimum balances and instructions
    let mut results: Vec<CommandResult> = Vec::new();

    // Create mint
    let result = command_create_token(&config, &mint_data);
    results.push(result);

    // Create token account
    let token_account =
        Mint::calc_associated_address(&mint_data.token, Some(&mint_data.mint_authority));
    let result =
        command_create_token_account(&config, &mint_data.token, &mint_data.mint_authority, None);
    results.push(result);

    // let decimals = mint_data.decimals;
    let result = command_mint(
        &config,
        &mint_data.token,
        1.0,
        &token_account,
        &mint_data.mint_authority,
        Some(mint_data.decimals),
        false,
    );
    results.push(result);

    // Create metadata account for mint
    let result = command_metadata_create(
        &config,
        mint_data.token.clone(),
        update_authority,
        is_mutable,
        metadata_data,
        Some(&mint_data),
    );
    results.push(result);

    // Create master edition for mint
    let metadata_address = Metadata::calc_associated_address(&mint_data.token, None);
    let result = command_master_edition_create(
        &config,
        update_authority,
        metadata_address,
        &mint_data,
        max_supply,
    );
    results.push(result);

    //Collect results
    let (total_min_balance, instruction_batches): (u64, Vec<Vec<Instruction>>) =
        results.into_iter().map(|r| r.unwrap().unwrap()).fold(
            (0, Vec::<Vec<Instruction>>::new()),
            |(bal_a, mut ins_a), (bal_b, ins_b)| {
                (bal_a + bal_b, {
                    ins_a.extend(ins_b);
                    ins_a
                })
            },
        );

    Ok(Some((total_min_balance, instruction_batches)))
}

fn command_create_token(config: &Config, data: &MintData) -> CommandResult {
    println_display(config, format!("Creating token {}", data.token));

    let minimum_balance_for_rent_exemption = config
        .rpc_client
        .get_minimum_balance_for_rent_exemption(Mint::LEN)?;

    let freeze_authority_pubkey = if data.enable_freeze {
        Some(data.mint_authority)
    } else {
        None
    };

    let mut instructions = vec![
        system_instruction::create_account(
            &config.fee_payer,
            &data.token,
            minimum_balance_for_rent_exemption,
            Mint::LEN as u64,
            &spl_token::id(),
        ),
        spl_token::instruction::initialize_mint(
            &spl_token::id(),
            &data.token,
            &data.mint_authority,
            freeze_authority_pubkey.as_ref(),
            data.decimals,
        )?,
    ];
    if let Some(text) = &data.memo {
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

fn command_create_token_account(
    config: &Config,
    token: &Pubkey,
    owner: &Pubkey,
    maybe_account: Option<Pubkey>,
) -> CommandResult {
    let minimum_balance_for_rent_exemption = config
        .rpc_client
        .get_minimum_balance_for_rent_exemption(Account::LEN)?;

    let (account, system_account_ok, instructions) = if let Some(account) = maybe_account {
        println_display(config, format!("Creating account {}", account));
        (
            account,
            false,
            vec![
                system_instruction::create_account(
                    &config.fee_payer,
                    &account,
                    minimum_balance_for_rent_exemption,
                    Account::LEN as u64,
                    &spl_token::id(),
                ),
                spl_token::instruction::initialize_account(
                    &spl_token::id(),
                    &account,
                    token,
                    owner,
                )?,
            ],
        )
    } else {
        let account = get_associated_token_address(&owner, &token);
        println_display(config, format!("Creating account {}", account));
        (
            account,
            true,
            vec![create_associated_token_account(
                &config.fee_payer,
                &owner,
                &token,
            )],
        )
    };

    if let Some(account_data) = config
        .rpc_client
        .get_account_with_commitment(&account, config.rpc_client.commitment())?
        .value
    {
        if !(account_data.owner == system_program::id() && system_account_ok) {
            return Err(format!("Error: Account already exists: {}", account).into());
        }
    }

    Ok(Some((
        minimum_balance_for_rent_exemption,
        vec![instructions],
    )))
}

fn command_mint(
    config: &Config,
    token: &Pubkey,
    ui_amount: f64,
    recipient: &Pubkey,
    mint_authority: &Pubkey,
    decimals: Option<u8>,
    use_unchecked_instruction: bool,
) -> CommandResult {
    println_display(
        config,
        format!(
            "Minting {} tokens\n  Token: {}\n  Recipient: {}",
            ui_amount, token, recipient
        ),
    );

    let decimals = match decimals {
        Some(decimals) => decimals,
        None => {
            let (_, mint) = Mint::fetch_and_parse(config, token)?;
            mint.decimals
        }
    };

    let amount = spl_token::ui_amount_to_amount(ui_amount, decimals);

    let instructions = if use_unchecked_instruction {
        vec![spl_token::instruction::mint_to(
            &spl_token::id(),
            token,
            recipient,
            mint_authority,
            &[&config.fee_payer],
            amount,
        )?]
    } else {
        vec![spl_token::instruction::mint_to_checked(
            &spl_token::id(),
            token,
            recipient,
            mint_authority,
            &[&config.fee_payer],
            amount,
            decimals,
        )?]
    };
    Ok(Some((0, vec![instructions])))
}

#[cfg(test)]
mod cli_tests {
    use super::{get_app, get_creators_vec, validate_creator_shares};
    use clap::ErrorKind;
    use solana_sdk::{
        pubkey::Pubkey,
        signer::{keypair::Keypair, Signer},
    };

    #[test]
    // It passes if pubkeys are valid and shares sum to 100.
    fn metadata_create_creators() {
        let test_pubkey: Pubkey = Keypair::new().pubkey();
        let m = get_app().get_matches_from(vec![
            "testeroni",
            "metadata-create",
            &test_pubkey.to_string(),
            "--seller-fee-basis-points",
            "1000",
            "--uri",
            "ifps://testeroni",
            "--creators",
            &format!("{k}:50", k = &test_pubkey.to_string()),
            &format!("{k}:50", k = &test_pubkey.to_string()),
        ]);
        let sub_m = m.subcommand_matches("metadata-create").unwrap();
        let creators = get_creators_vec(sub_m.values_of("creators")).unwrap();
        assert_eq!(
            validate_creator_shares(&creators).unwrap(),
            (),
            "Sum of creator shares is greater than 100."
        );
    }

    #[test]
    // It fails if shares don't sum to 100.
    fn metadata_create_creators_shares_sum() {
        let test_pubkey: Pubkey = Keypair::new().pubkey();
        let m = get_app().get_matches_from(vec![
            "testeroni",
            "metadata-create",
            &test_pubkey.to_string(),
            "--seller-fee-basis-points",
            "1000",
            "--uri",
            "ifps://testeroni",
            "--creators",
            &format!("{k}:51", k = &test_pubkey.to_string()),
            &format!("{k}:50", k = &test_pubkey.to_string()),
        ]);
        let sub_m = m.subcommand_matches("metadata-create").unwrap();
        let creators = get_creators_vec(sub_m.values_of("creators")).unwrap();
        println!("{:?}", creators);
        let error = validate_creator_shares(&creators).unwrap_err();
        assert_eq!(error.kind, ErrorKind::ValueValidation);
    }

    #[test]
    // It fails if pubkey is not valid.
    fn metadata_create_creators_pubkey() {
        let test_pubkey: Pubkey = Keypair::new().pubkey();
        let res = get_app().get_matches_from_safe(vec![
            "testeroni",
            "metadata-create",
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
    // It fails if share value is too high.
    fn metadata_create_creators_share_too_high() {
        let test_pubkey: Pubkey = Keypair::new().pubkey();
        let res = get_app().get_matches_from_safe(vec![
            "testeroni",
            "metadata-create",
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
    fn metadata_update() {
        let test_pubkey: Pubkey = Keypair::new().pubkey();
        let m = get_app().get_matches_from(vec![
            "testeroni",
            "metadata-update",
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
        let sub_m = m.subcommand_matches("metadata-update").unwrap();
        let creators = get_creators_vec(sub_m.values_of("creators")).unwrap();
        assert_eq!(validate_creator_shares(&creators).unwrap(), ());
    }

    #[test]
    fn metadata_update_not_all_args() {
        let test_pubkey: Pubkey = Keypair::new().pubkey();
        let m = get_app().get_matches_from(vec![
            "testeroni",
            "metadata-update",
            &test_pubkey.to_string(),
            "--new-update-authority",
            &test_pubkey.to_string(),
        ]);
        let sub_m = m.subcommand_matches("metadata-update").unwrap();
        assert_eq!(
            sub_m.value_of("new_update_authority").unwrap(),
            test_pubkey.to_string()
        );
    }

    #[test]
    fn metadata_update_no_args() {
        let test_pubkey: Pubkey = Keypair::new().pubkey();
        let res = get_app().get_matches_from_safe(vec![
            "testeroni",
            "metadata-update",
            &test_pubkey.to_string(),
        ]);
        assert!(res.is_err());
        assert_eq!(res.unwrap_err().kind, ErrorKind::MissingRequiredArgument);
    }
}

#[cfg(test)]
mod helper_tests {
    use crate::MasterEditionCalc;

    use super::FetchParse;
    use solana_sdk::pubkey::Pubkey;
    use spl_token::state::Mint;
    use spl_token_metadata::state::Metadata;
    use std::str::FromStr;

    #[test]
    // It returns the correct token account address
    fn mint_associated_address() {
        let mint_address =
            Pubkey::from_str("28TvgkwaFCNGttasXKoHc6eYGFJSTrBscmrNUEF83ZWf").unwrap();
        let wallet_address =
            Pubkey::from_str("28TvgkwaFCNGttasXKoHc6eYGFJSTrBscmrNUEF83ZWf").unwrap();
        let correct_address =
            Pubkey::from_str("9JHNRwrMFryTyhidgtsyXPEmgtSUvftweXMaZSfjr1Ax").unwrap();

        let calc_address = Mint::calc_associated_address(&mint_address, Some(&wallet_address));
        // let calc_address = get_associated_token_address(&wallet_address, &mint_address);
        assert_eq!(calc_address, correct_address);
    }
    #[test]
    // It returns the correct metadata account address
    fn metadata_associated_address() {
        let mint_address =
            Pubkey::from_str("28TvgkwaFCNGttasXKoHc6eYGFJSTrBscmrNUEF83ZWf").unwrap();
        let correct_address =
            Pubkey::from_str("EZDjRdK8HttaotFxpCWXTLm3QZAnn2TzNod1YSeKrkZg").unwrap();

        let calc_address = Metadata::calc_associated_address(&mint_address, None);
        assert_eq!(calc_address, correct_address);
    }

    #[test]
    // It returns the correct master edition account address
    fn master_edition_associated_address() {
        let mint_address =
            Pubkey::from_str("28TvgkwaFCNGttasXKoHc6eYGFJSTrBscmrNUEF83ZWf").unwrap();
        let correct_address =
            Pubkey::from_str("74CrqRB9WPC3cyxniXPpWPbeMcf5LXmPSfaFCCqkF1hj").unwrap();

        let calc_address = Mint::calc_master_edition(&mint_address);
        assert_eq!(calc_address, correct_address);
    }
}
