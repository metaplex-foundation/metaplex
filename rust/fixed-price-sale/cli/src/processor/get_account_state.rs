//! Module provide handler for query commands.

use crate::error;
use borsh::BorshDeserialize;
use solana_client::rpc_client::RpcClient;
use solana_sdk::{borsh::try_from_slice_unchecked, pubkey::Pubkey};

pub fn get_account_state<T>(client: &RpcClient, account: &Pubkey) -> Result<T, error::Error>
where
    T: BorshDeserialize,
{
    // First 8-bytes filled with sha256 hash by anchor
    let account_data = client.get_account_data(account)?[8..].to_vec();

    Ok(try_from_slice_unchecked(&account_data)?)
}
