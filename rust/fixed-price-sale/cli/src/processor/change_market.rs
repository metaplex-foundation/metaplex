//! Module provide handler for `ChangeMarket` command.

use super::UiTransactionInfo;
use crate::error;
use anchor_lang::{InstructionData, ToAccountMetas};
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    instruction::Instruction, pubkey::Pubkey, signature::Signer, signer::keypair::Keypair, sysvar,
    transaction::Transaction,
};

/// Additional `ChangeMarket` instruction info, that need to be displayed in TUI.
#[derive(Debug)]
pub struct ChangeMarketUiInfo {
    market: Pubkey,
}

impl UiTransactionInfo for ChangeMarketUiInfo {
    fn print(&self) {
        println!("ChangeMarket::market - {}", self.market);
    }
}

pub fn change_market(
    client: &RpcClient,
    owner: &Keypair,
    market: &Pubkey,
    new_name: Option<String>,
    new_description: Option<String>,
    mutable: Option<bool>,
    new_price: Option<u64>,
    new_pieces_in_one_wallet: Option<u64>,
) -> Result<(Transaction, Box<dyn UiTransactionInfo>), error::Error> {
    let accounts = mpl_fixed_price_sale::accounts::ChangeMarket {
        market: *market,
        owner: owner.pubkey(),
        clock: sysvar::id(),
    }
    .to_account_metas(None);

    let data = mpl_fixed_price_sale::instruction::ChangeMarket {
        new_name,
        new_description,
        mutable,
        new_price,
        new_pieces_in_one_wallet,
    }
    .data();

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
        Box::new(ChangeMarketUiInfo { market: *market }),
    ))
}
