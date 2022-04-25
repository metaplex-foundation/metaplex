//! Module provide handler for `CloseMarket` command.

use super::UiTransactionInfo;
use crate::error;
use anchor_lang::{InstructionData, ToAccountMetas};
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    instruction::Instruction, pubkey::Pubkey, signature::Signer, signer::keypair::Keypair, sysvar,
    transaction::Transaction,
};

/// Additional `CloseMarket` instruction info, that need to be displayed in TUI.
#[derive(Debug)]
pub struct CloseMarketUiInfo {
    market: Pubkey,
}

impl UiTransactionInfo for CloseMarketUiInfo {
    fn print(&self) {
        println!("CloseMarket::market - {}", self.market);
    }
}

pub fn close_market(
    client: &RpcClient,
    owner: &Keypair,
    market: &Pubkey,
) -> Result<(Transaction, Box<dyn UiTransactionInfo>), error::Error> {
    let accounts = mpl_fixed_price_sale::accounts::CloseMarket {
        market: *market,
        owner: owner.pubkey(),
        clock: sysvar::id(),
    }
    .to_account_metas(None);

    let data = mpl_fixed_price_sale::instruction::CloseMarket {}.data();

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
        Box::new(CloseMarketUiInfo { market: *market }),
    ))
}
