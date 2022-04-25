//! Module provide handler for `ClaimResource` command.

use super::{get_account_state, UiTransactionInfo};
use crate::error;
use anchor_lang::{InstructionData, ToAccountMetas};
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    instruction::Instruction, pubkey::Pubkey, signature::Signer, signer::keypair::Keypair,
    system_program, sysvar::clock, transaction::Transaction,
};

/// Additional `ClaimResource` instruction info, that need to be displayed in TUI.
#[derive(Debug)]
pub struct ClaimResourceUiInfo {}

impl UiTransactionInfo for ClaimResourceUiInfo {
    fn print(&self) {}
}

pub fn claim_resource(
    client: &RpcClient,
    payer: &Keypair,
    market: &Pubkey,
    claim_token: &Pubkey,
) -> Result<(Transaction, Box<dyn UiTransactionInfo>), error::Error> {
    let market_state = get_account_state::<mpl_fixed_price_sale::state::Market>(client, market)?;
    let selling_resource_state = get_account_state::<mpl_fixed_price_sale::state::SellingResource>(
        client,
        &market_state.selling_resource,
    )?;
    let resource_mint = selling_resource_state.resource;

    let (treasury_owner, _treasury_owner_bump) =
        mpl_fixed_price_sale::utils::find_treasury_owner_address(
            &market_state.treasury_mint,
            &market_state.selling_resource,
        );

    // Should be created
    let (master_edition_metadata, _) = Pubkey::find_program_address(
        &[
            mpl_token_metadata::state::PREFIX.as_bytes(),
            mpl_token_metadata::id().as_ref(),
            resource_mint.as_ref(),
        ],
        &mpl_token_metadata::id(),
    );

    let (_owner, vault_owner_bump) = mpl_fixed_price_sale::utils::find_vault_owner_address(
        &selling_resource_state.resource,
        &selling_resource_state.store,
    );

    let accounts = mpl_fixed_price_sale::accounts::ClaimResource {
        market: *market,
        selling_resource: market_state.selling_resource,
        treasury_holder: market_state.treasury_holder,
        metadata: master_edition_metadata,
        owner: treasury_owner,
        destination: *claim_token,
        selling_resource_owner: selling_resource_state.owner,
        vault: selling_resource_state.vault,
        token_metadata_program: mpl_token_metadata::id(),
        clock: clock::id(),
        token_program: spl_token::id(),
        system_program: system_program::id(),
    }
    .to_account_metas(None);

    let data = mpl_fixed_price_sale::instruction::ClaimResource { vault_owner_bump }.data();

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
            &[payer],
            recent_blockhash,
        ),
        Box::new(ClaimResourceUiInfo {}),
    ))
}
