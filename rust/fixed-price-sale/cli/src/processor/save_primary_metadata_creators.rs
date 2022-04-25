//! Module provide handler for `SavePrimaryMetadataCreators` command.

use super::UiTransactionInfo;
use crate::error;
use anchor_lang::{InstructionData, ToAccountMetas};
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    instruction::Instruction, pubkey::Pubkey, signature::Signer, signer::keypair::Keypair,
    system_program, transaction::Transaction,
};

/// Additional `SavePrimaryMetadataCreators` instruction info, that need to be displayed in TUI.
#[derive(Debug)]
pub struct SavePrimaryMetadataCreatorsUiInfo {
    primary_metadata_creators: Pubkey,
}

impl UiTransactionInfo for SavePrimaryMetadataCreatorsUiInfo {
    fn print(&self) {
        println!(
            "SavePrimaryMetadataCreators::primary_metadata_creators - {}",
            self.primary_metadata_creators
        );
    }
}

pub fn save_primary_metadata_creators(
    client: &RpcClient,
    payer: &Keypair,
    admin: &Keypair,
    metadata: &Pubkey,
    creators: &Vec<mpl_token_metadata::state::Creator>,
) -> Result<(Transaction, Box<dyn UiTransactionInfo>), error::Error> {
    let (primary_metadata_creators, primary_metadata_creators_bump) =
        mpl_fixed_price_sale::utils::find_primary_metadata_creators(&metadata);

    let accounts = mpl_fixed_price_sale::accounts::SavePrimaryMetadataCreators {
        admin: admin.pubkey(),
        metadata: *metadata,
        primary_metadata_creators,
        system_program: system_program::id(),
    }
    .to_account_metas(None);

    let data = mpl_fixed_price_sale::instruction::SavePrimaryMetadataCreators {
        primary_metadata_creators_bump,
        creators: creators.clone(),
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
            Some(&payer.pubkey()),
            &[payer, admin],
            recent_blockhash,
        ),
        Box::new(SavePrimaryMetadataCreatorsUiInfo {
            primary_metadata_creators,
        }),
    ))
}
