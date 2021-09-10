use solana_client::rpc_client::RpcClient;
use solana_program::account_info::{AccountInfo, IntoAccountInfo};
use solana_program::pubkey::ParsePubkeyError;
use solana_program::pubkey::Pubkey;
use spl_token_vault::state::{SafetyDepositBox, Vault};
use std::collections::HashMap;
use std::str::FromStr;

pub struct SharedState {
    pub vaults: HashMap<Pubkey, Vault>,
    pub safety_deposit_boxs: HashMap<Pubkey, SafetyDepositBox>,
}

const DEVNET_API: &str = "http://api.devnet.solana.com";
const VAULT_ID: &str = "vau1zxA2LbssAUEF7Gpw91zMM1LvXrvpzJtmZ58rPsn";

#[derive(Debug)]
pub enum SharedStateError {
    ParseError(ParsePubkeyError),
}

impl SharedState {
    pub fn new() -> Self {
        SharedState {
            vaults: HashMap::new(),
            safety_deposit_boxs: HashMap::new(),
        }
    }

    pub fn preload(&mut self) {
        let client = RpcClient::new(DEVNET_API.to_string());
        self.process_vault(&client);
    }

    fn process_vault(&mut self, client: &RpcClient) {
        if let Ok(key) = Pubkey::from_str(VAULT_ID) {
            if let Ok(response) = client.get_program_accounts(&key) {
                for mut item in response {
                    let account_info = IntoAccountInfo::into_account_info(&mut item);
                    if *account_info.owner != key {
                        continue;
                    }
                    if is_byte(&account_info, 1) {
                        // SafetyDepositBox
                        let value = SafetyDepositBox::from_account_info(&account_info);
                        if let Ok(data) = value {
                            self.safety_deposit_boxs.insert(*account_info.key, data);
                        }
                    } else if is_byte(&account_info, 3) {
                        // VaultV1
                        let value = Vault::from_account_info(&account_info);
                        if let Ok(data) = value {
                            self.vaults.insert(*account_info.key, data);
                        }
                    }
                }
            }
        }
    }
}

fn is_byte(account_info: &AccountInfo, val: u8) -> bool {
    let data = account_info.data.borrow();
    return data[0] == val;
}
