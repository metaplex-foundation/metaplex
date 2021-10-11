use clap::ArgMatches;
use solana_clap_utils::{input_parsers::pubkey_of_signer, keypair::pubkey_from_path};
use solana_cli_output::OutputFormat;
use solana_client::rpc_client::RpcClient;
use solana_remote_wallet::remote_wallet::RemoteWalletManager;
use solana_sdk::pubkey::Pubkey;
use std::{process::exit, sync::Arc};

pub struct Config {
    pub rpc_client: RpcClient,
    pub(crate) output_format: OutputFormat,
    pub fee_payer: Pubkey,
    pub default_keypair_path: String,
    pub dry_run: bool,
}

impl Config {
    // Checks if an explicit address was provided, otherwise return the default address.
    pub(crate) fn pubkey_or_default(
        &self,
        arg_matches: &ArgMatches,
        address_name: &str,
        wallet_manager: &mut Option<Arc<RemoteWalletManager>>,
    ) -> Pubkey {
        if address_name != "owner" {
            if let Some(address) =
                pubkey_of_signer(arg_matches, address_name, wallet_manager).unwrap()
            {
                return address;
            }
        }

        return self
            .default_address(arg_matches, wallet_manager)
            .unwrap_or_else(|e| {
                eprintln!("error: {}", e);
                exit(1);
            });
    }

    fn default_address(
        &self,
        matches: &ArgMatches,
        wallet_manager: &mut Option<Arc<RemoteWalletManager>>,
    ) -> Result<Pubkey, Box<dyn std::error::Error>> {
        // for backwards compatibility, check owner before cli config default
        if let Some(address) = pubkey_of_signer(matches, "owner", wallet_manager).unwrap() {
            return Ok(address);
        }

        let path = &self.default_keypair_path;
        pubkey_from_path(matches, path, "default", wallet_manager)
    }
}
