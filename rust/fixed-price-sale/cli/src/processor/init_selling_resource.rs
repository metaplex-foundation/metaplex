//! Module provide handler for `InitSellingResource` command.

use super::UiTransactionInfo;
use crate::{error, utils};
use anchor_lang::{InstructionData, ToAccountMetas};
use mpl_fixed_price_sale::utils::find_vault_owner_address;
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    instruction::Instruction, pubkey::Pubkey, signature::Signer, signer::keypair::Keypair,
    system_program, sysvar::rent, transaction::Transaction,
};

/// Additional `InitSellingResource` instruction info, that need to be displayed in TUI.
#[derive(Debug)]
pub struct InitSellingResourceUiInfo {
    selling_resource: Pubkey,
    vault: Pubkey,
    vault_owner: Pubkey,
}

impl UiTransactionInfo for InitSellingResourceUiInfo {
    fn print(&self) {
        println!(
            "InitSellingResource::selling_resource - {}",
            self.selling_resource
        );
        println!("InitSellingResource::vault - {}", self.vault);
        println!("InitSellingResource::vault_owner - {}", self.vault_owner);
    }
}

pub fn init_selling_resource(
    client: &RpcClient,
    payer: &Keypair,
    store: &Pubkey,
    admin_keypair: &Keypair,
    selling_resource_owner: &Pubkey,
    resource_mint: &Pubkey,
    resource_token: &Pubkey,
    max_supply: Option<u64>,
) -> Result<(Transaction, Box<dyn UiTransactionInfo>), error::Error> {
    let (vault_owner, vault_owner_bump) = find_vault_owner_address(resource_mint, store);
    let selling_resource = Keypair::new();

    // Should be created
    let (master_edition, master_edition_bump) = Pubkey::find_program_address(
        &[
            mpl_token_metadata::state::PREFIX.as_bytes(),
            mpl_token_metadata::id().as_ref(),
            resource_mint.as_ref(),
            mpl_token_metadata::state::EDITION.as_bytes(),
        ],
        &mpl_token_metadata::id(),
    );

    let (metadata, _) = Pubkey::find_program_address(
        &[
            mpl_token_metadata::state::PREFIX.as_bytes(),
            mpl_token_metadata::id().as_ref(),
            resource_mint.as_ref(),
        ],
        &mpl_token_metadata::id(),
    );

    let vault_keypair = Keypair::new();
    utils::create_token_account(client, payer, &vault_keypair, &resource_mint, &vault_owner)?;

    let accounts = mpl_fixed_price_sale::accounts::InitSellingResource {
        store: *store,
        admin: admin_keypair.pubkey(),
        selling_resource: selling_resource.pubkey(),
        selling_resource_owner: *selling_resource_owner,
        resource_mint: *resource_mint,
        master_edition,
        metadata,
        vault: vault_keypair.pubkey(),
        owner: vault_owner,
        resource_token: *resource_token,
        rent: rent::id(),
        token_program: spl_token::id(),
        system_program: system_program::id(),
    }
    .to_account_metas(None);

    let data = mpl_fixed_price_sale::instruction::InitSellingResource {
        master_edition_bump: master_edition_bump,
        vault_owner_bump: vault_owner_bump,
        max_supply,
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
            &[payer, admin_keypair, &selling_resource],
            recent_blockhash,
        ),
        Box::new(InitSellingResourceUiInfo {
            selling_resource: selling_resource.pubkey(),
            vault: vault_keypair.pubkey(),
            vault_owner,
        }),
    ))
}
