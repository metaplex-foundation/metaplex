use crate::*;
use solana_program::borsh::try_from_slice_unchecked;
use solana_program_test::*;
use solana_sdk::{
    pubkey::Pubkey, signature::Signer, signer::keypair::Keypair, transaction::Transaction,
    transport,
};
use spl_token_metadata::{
    id,
    state::{Creator, Data, PREFIX},
};

#[derive(Debug)]
pub struct Metadata {
    pub mint: Keypair,
    pub pubkey: Pubkey,
}

impl Metadata {
    pub fn new() -> Self {
        let mint = Keypair::new();
        let mint_pubkey = mint.pubkey();
        let program_id = id();

        let metadata_seeds = &[PREFIX.as_bytes(), program_id.as_ref(), mint_pubkey.as_ref()];
        let (pubkey, _) = Pubkey::find_program_address(metadata_seeds, &id());

        Metadata { mint, pubkey }
    }

    pub async fn get_data(
        &self,
        context: &mut ProgramTestContext,
    ) -> spl_token_metadata::state::Metadata {
        let account = get_account(context, &self.pubkey).await;
        try_from_slice_unchecked(&account.data).unwrap()
    }

    pub async fn create(
        &self,
        context: &mut ProgramTestContext,
        name: String,
        symbol: String,
        uri: String,
        creators: Option<Vec<Creator>>,
        seller_fee_basis_points: u16,
    ) -> transport::Result<()> {
        create_mint(context, &self.mint, &context.payer.pubkey()).await?;

        let tx = Transaction::new_signed_with_payer(
            &[instruction::create_metadata_accounts(
                id(),
                self.pubkey.clone(),
                self.mint.pubkey(),
                context.payer.pubkey().clone(),
                context.payer.pubkey().clone(),
                context.payer.pubkey().clone(),
                name,
                symbol,
                uri,
                creators,
                seller_fee_basis_points,
                false,
                false,
            )],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );

        Ok(context.banks_client.process_transaction(tx).await?)
    }

    pub async fn update(
        &self,
        context: &mut ProgramTestContext,
        name: String,
        symbol: String,
        uri: String,
        creators: Option<Vec<Creator>>,
        seller_fee_basis_points: u16,
    ) -> transport::Result<()> {
        let tx = Transaction::new_signed_with_payer(
            &[instruction::update_metadata_accounts(
                id(),
                self.pubkey,
                context.payer.pubkey().clone(),
                None,
                Some(Data {
                    name,
                    symbol,
                    uri,
                    creators,
                    seller_fee_basis_points,
                }),
                None,
            )],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );

        Ok(context.banks_client.process_transaction(tx).await?)
    }
}
