//! Module provide handler for `Withdraw` command.

use super::{get_account_state, UiTransactionInfo};
use crate::error;
use anchor_lang::{prelude::AccountMeta, InstructionData, ToAccountMetas};
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    instruction::Instruction,
    pubkey::Pubkey,
    signature::Signer,
    signer::keypair::Keypair,
    system_program,
    sysvar::{clock, rent},
    transaction::Transaction,
};

/// Additional `Withdraw` instruction info, that need to be displayed in TUI.
#[derive(Debug)]
pub struct WithdrawUiInfo {
    primary_metadata_creators: Pubkey,
    primary_royalties_holder: Pubkey,
    payout_ticket: Pubkey,
    destination: Pubkey,
}

impl UiTransactionInfo for WithdrawUiInfo {
    fn print(&self) {
        println!(
            "Withdraw::primary_metadata_creators - {}",
            self.primary_metadata_creators
        );
        println!(
            "Withdraw::primary_royalties_holder - {}",
            self.primary_royalties_holder
        );
        println!("Withdraw::payout_ticket - {}", self.payout_ticket);
        println!("Withdraw::destination - {}", self.destination);
    }
}

pub fn withdraw(
    client: &RpcClient,
    payer: &Keypair,
    market: &Pubkey,
) -> Result<Vec<(Transaction, Box<dyn UiTransactionInfo>)>, error::Error> {
    let market_state = get_account_state::<mpl_fixed_price_sale::state::Market>(client, market)?;
    let selling_resource_state = get_account_state::<mpl_fixed_price_sale::state::SellingResource>(
        client,
        &market_state.selling_resource,
    )?;
    let resource_mint = selling_resource_state.resource;

    let (treasury_owner, treasury_owner_bump) =
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

    let (primary_metadata_creators, _primary_metadata_creators_bump) =
        mpl_fixed_price_sale::utils::find_primary_metadata_creators(&master_edition_metadata);

    let primary_metadata_creators_state = get_account_state::<
        mpl_fixed_price_sale::state::PrimaryMetadataCreators,
    >(client, &primary_metadata_creators)?;

    let mut data_bundle: Vec<(Transaction, Box<dyn UiTransactionInfo>)> = Vec::new();
    for c in primary_metadata_creators_state.creators {
        let primary_royalties_holder = c.address;

        let destination = spl_associated_token_account::get_associated_token_address(
            &primary_royalties_holder,
            &market_state.treasury_mint,
        );

        let (payout_ticket, payout_ticket_bump) =
            mpl_fixed_price_sale::utils::find_payout_ticket_address(
                &market,
                &primary_royalties_holder,
            );

        let mut accounts = mpl_fixed_price_sale::accounts::Withdraw {
            market: *market,
            selling_resource: market_state.selling_resource,
            treasury_holder: market_state.treasury_holder,
            metadata: master_edition_metadata,
            treasury_mint: market_state.treasury_mint,
            owner: treasury_owner,
            funder: primary_royalties_holder,
            payer: payer.pubkey(),
            payout_ticket,
            destination,
            clock: clock::id(),
            rent: rent::id(),
            associated_token_program: spl_associated_token_account::id(),
            token_program: spl_token::id(),
            system_program: system_program::id(),
        }
        .to_account_metas(None);
        accounts.push(AccountMeta::new(primary_metadata_creators, false));

        let data = mpl_fixed_price_sale::instruction::Withdraw {
            treasury_owner_bump,
            payout_ticket_bump,
        }
        .data();

        let instruction = Instruction {
            program_id: mpl_fixed_price_sale::id(),
            data,
            accounts,
        };

        let recent_blockhash = client.get_latest_blockhash()?;

        data_bundle.push((
            Transaction::new_signed_with_payer(
                &[instruction],
                Some(&payer.pubkey()),
                &[payer],
                recent_blockhash,
            ),
            Box::new(WithdrawUiInfo {
                primary_metadata_creators,
                destination,
                primary_royalties_holder,
                payout_ticket,
            }),
        ));
    }

    Ok(data_bundle)
}
