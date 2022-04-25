//! Module define CLI structure.

use clap::{Parser, Subcommand};
use std::env;

/// CLI arguments.
#[derive(Parser, Debug)]
#[clap(name = "mpl-fixed-price-sale-cli")]
#[clap(about = "CLI utility for mpl-fixed-price-sale program")]
#[clap(version, author)]
pub struct CliArgs {
    /// RPC endpoint.
    #[clap(short, long, default_value_t = String::from("https://api.mainnet-beta.solana.com"), value_name = "URL")]
    pub url: String,

    /// Path to transaction payer keypair file.
    #[clap(short, long, default_value_t = format!("{}/.config/solana/id.json", env::var("HOME").unwrap()), value_name = "FILE")]
    pub payer_keypair: String,

    #[clap(subcommand)]
    pub command: Commands,
}

/// CLI sub-commands.
#[derive(Subcommand, Debug)]
pub enum Commands {
    /// Obtain `SellingResource` account from `mpl_fixed_price_sale` program.
    GetSellingResource {
        #[clap(short, value_name = "STRING")]
        account: String,
    },
    /// Obtain `Store` account from `mpl_fixed_price_sale` program.
    GetStore {
        #[clap(short, value_name = "STRING")]
        account: String,
    },
    /// Obtain `Market` account from `mpl_fixed_price_sale` program.
    GetMarket {
        #[clap(short, value_name = "STRING")]
        account: String,
    },
    /// Obtain `TradeHistory` account from `mpl_fixed_price_sale` program.
    GetTradeHistory {
        #[clap(short, value_name = "STRING")]
        account: String,
    },
    /// Perform `CreateStore` instruction of `mpl_fixed_price_sale` program.
    CreateStore {
        #[clap(long, value_name = "FILE")]
        admin_keypair: Option<String>,

        #[clap(long, value_name = "STRING")]
        name: String,

        #[clap(long, value_name = "STRING")]
        description: String,
    },
    /// Perform `Buy` instruction of `mpl_fixed_price_sale` program.
    Buy {
        #[clap(long, value_name = "PUBKEY")]
        market: String,

        #[clap(long, value_name = "PUBKEY")]
        user_token_account: String,

        #[clap(long, value_name = "FILE")]
        user_wallet_keypair: Option<String>,
    },
    /// Perform `InitSellingResource` instruction of `mpl_fixed_price_sale` program.
    InitSellingResource {
        #[clap(long, value_name = "PUBKEY")]
        store: String,

        #[clap(long, value_name = "FILE")]
        admin_keypair: Option<String>,

        #[clap(long, value_name = "PUBKEY")]
        selling_resource_owner: Option<String>,

        #[clap(long, value_name = "PUBKEY")]
        resource_mint: String,

        #[clap(long, value_name = "PUBKEY")]
        resource_token: String,

        #[clap(long, value_name = "U64")]
        max_supply: Option<u64>,
    },
    /// Perform `CreateMarket` instruction of `mpl_fixed_price_sale` program.
    CreateMarket {
        #[clap(long, value_name = "FILE")]
        selling_resource_owner_keypair: Option<String>,

        #[clap(long, value_name = "PUBKEY")]
        selling_resource: String,

        #[clap(long, value_name = "PUBKEY")]
        mint: Option<String>,

        #[clap(long, value_name = "STRING")]
        name: String,

        #[clap(long, value_name = "STRING")]
        description: String,

        #[clap(long, value_name = "BOOL")]
        mutable: bool,

        #[clap(long, value_name = "F64")]
        price: f64,

        #[clap(long, value_name = "U64")]
        pieces_in_one_wallet: Option<u64>,

        #[clap(long, value_name = "TIMESTAMP")]
        start_date: Option<u64>,

        #[clap(long, value_name = "TIMESTAMP")]
        end_date: Option<u64>,

        #[clap(long, value_name = "FILE")]
        gating_config: Option<String>,
    },
    /// Perform `CloseMarket` instruction of `mpl_fixed_price_sale` program.
    CloseMarket {
        #[clap(long, value_name = "PUBKEY")]
        market: String,

        #[clap(long, value_name = "FILE")]
        owner: Option<String>,
    },
    /// Perform `SuspendMarket` instruction of `mpl_fixed_price_sale` program.
    SuspendMarket {
        #[clap(long, value_name = "PUBKEY")]
        market: String,

        #[clap(long, value_name = "FILE")]
        owner: Option<String>,
    },
    /// Perform `ResumeMarket` instruction of `mpl_fixed_price_sale` program.
    ResumeMarket {
        #[clap(long, value_name = "PUBKEY")]
        market: String,

        #[clap(long, value_name = "FILE")]
        owner: Option<String>,
    },
    /// Perform `Withdraw` instruction of `mpl_fixed_price_sale` program.
    Withdraw {
        #[clap(long, value_name = "PUBKEY")]
        market: String,
    },
    /// Perform `ClaimResource` instruction of `mpl_fixed_price_sale` program.
    ClaimResource {
        #[clap(long, value_name = "PUBKEY")]
        market: String,

        #[clap(long, value_name = "PUBKEY")]
        claim_token: String,
    },
    /// Perform `SavePrimaryMetadataCreators` instruction of `mpl_fixed_price_sale` program.
    SavePrimaryMetadataCreators {
        #[clap(long, value_name = "FILE")]
        admin: Option<String>,

        #[clap(long, value_name = "PUBKEY")]
        metadata: String,

        #[clap(long, value_name = "FILE")]
        creators: Option<String>,
    },
    /// Perform `ChangeMarket` instruction of `mpl_fixed_price_sale` program.
    ChangeMarket {
        #[clap(long, value_name = "PUBKEY")]
        market: String,

        #[clap(long, value_name = "FILE")]
        owner: Option<String>,

        #[clap(long, value_name = "STRING")]
        new_name: Option<String>,

        #[clap(long, value_name = "STRING")]
        new_description: Option<String>,

        #[clap(long, value_name = "BOOL")]
        mutable: Option<bool>,

        #[clap(long, value_name = "U64")]
        new_price: Option<u64>,

        #[clap(long, value_name = "U64")]
        new_pieces_in_one_wallet: Option<u64>,
    },
}
