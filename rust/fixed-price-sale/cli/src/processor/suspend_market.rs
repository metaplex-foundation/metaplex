//! Module provide handler for `SuspendMarket` command.

use super::UiTransactionInfo;
use crate::error;
use anchor_lang::{InstructionData, ToAccountMetas};
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    instruction::Instruction, pubkey::Pubkey, signature::Signer, signer::keypair::Keypair, sysvar,
    transaction::Transaction,
};

/// Additional `SuspendMarket` instruction info, that need to be displayed in TUI.
#[derive(Debug)]
pub struct SuspendMarketUiInfo {
    market: Pubkey,
}

impl UiTransactionInfo for SuspendMarketUiInfo {
    fn print(&self) {
        println!("SuspendMarket::market - {}", self.market);
    }
}

pub fn suspend_market(
    client: &RpcClient,
    owner: &Keypair,
    market: &Pubkey,
) -> Result<(Transaction, Box<dyn UiTransactionInfo>), error::Error> {
    let accounts = mpl_fixed_price_sale::accounts::SuspendMarket {
        market: *market,
        owner: owner.pubkey(),
        clock: sysvar::id(),
    }
    .to_account_metas(None);

    let data = mpl_fixed_price_sale::instruction::SuspendMarket {}.data();

    let instruction = Instruction {
        program_id: mpl_fixed_price_sale::id(),
        data,
        accounts,
    };

    let recent_blockhash = client.get_latest_blockhash()?;

    Ok((
        Transaction::new_signed_with_payer(
            &[instruction],
            Some(&owner.pubkey()),
            &[owner],
            recent_blockhash,
        ),
        Box::new(SuspendMarketUiInfo { market: *market }),
    ))
}
