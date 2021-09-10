use solana_client::rpc_client::RpcClient;
use solana_program::account_info::{AccountInfo, IntoAccountInfo};
use solana_program::pubkey::ParsePubkeyError;
use solana_program::pubkey::Pubkey;
use solana_program::sysvar::slot_history::ProgramError;
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
                    SafetyDepositBox::convert(&account_info).map(|data| {
                        self.safety_deposit_boxs.insert(*account_info.key, data);
                    });
                    Vault::convert(&account_info).map(|data| {
                        self.vaults.insert(*account_info.key, data);
                    });
                }
            }
        }
    }
}

trait Processor {
    const ID: &'static str;
    fn process_account_info(
        state: &mut SharedState,
        account_info: &solana_program::account_info::AccountInfo,
    );
    fn process(state: &mut SharedState, client: &RpcClient) {
        if let Ok(key) = Pubkey::from_str(VAULT_ID) {
            if let Ok(response) = client.get_program_accounts(&key) {
                for mut item in response {
                    let account_info = IntoAccountInfo::into_account_info(&mut item);
                    if *account_info.owner != key {
                        continue;
                    }
                    Self::process_account_info(state, &account_info);
                }
            }
        }
    }
}

trait TypeConverter {
    const BYTE: u8;
    type Item;
    fn from_account_info(a: &AccountInfo) -> Result<Self::Item, ProgramError>;

    fn convert(a: &AccountInfo) -> Option<Self::Item> {
        if Self::is_byte(&a) {
            return Self::from_account_info(&a).ok();
        }
        None
    }

    fn is_byte(account_info: &AccountInfo) -> bool {
        account_info
            .data
            .try_borrow()
            .map(|data| data[0] == Self::BYTE)
            .unwrap_or(false)
    }
}

impl TypeConverter for SafetyDepositBox {
    const BYTE: u8 = 1;
    type Item = SafetyDepositBox;
    fn from_account_info(a: &AccountInfo) -> Result<Self::Item, ProgramError> {
        SafetyDepositBox::from_account_info(&a)
    }
}
impl TypeConverter for Vault {
    const BYTE: u8 = 3;
    type Item = Vault;
    fn from_account_info(a: &AccountInfo) -> Result<Self::Item, ProgramError> {
        Vault::from_account_info(&a)
    }
}
