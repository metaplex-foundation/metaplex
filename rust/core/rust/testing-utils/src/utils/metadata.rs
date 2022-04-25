use crate::{solana::create_associated_token_account, utils::*};
use mpl_token_metadata::{
    id, instruction,
    state::{Collection, Creator, Data, DataV2, Uses, PREFIX},
};
use solana_program::borsh::try_from_slice_unchecked;
use solana_program_test::*;
use solana_sdk::{
    pubkey::Pubkey, signature::Signer, signer::keypair::Keypair, transaction::Transaction,
    transport,
};

#[derive(Debug)]
pub struct Metadata {
    pub mint: Keypair,
    pub pubkey: Pubkey,
    pub token: Keypair,
}

impl Metadata {
    pub fn new() -> Self {
        let mint = Keypair::new();
        let mint_pubkey = mint.pubkey();
        let program_id = id();

        let metadata_seeds = &[PREFIX.as_bytes(), program_id.as_ref(), mint_pubkey.as_ref()];
        let (pubkey, _) = Pubkey::find_program_address(metadata_seeds, &id());

        Metadata {
            mint,
            pubkey,
            token: Keypair::new(),
        }
    }

    pub async fn get_data(
        &self,
        context: &mut ProgramTestContext,
    ) -> mpl_token_metadata::state::Metadata {
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
        is_mutable: bool,
    ) -> transport::Result<()> {
        create_mint(context, &self.mint, &context.payer.pubkey(), None).await?;

        let token = create_associated_token_account(context, &self.token, &self.mint.pubkey())
            .await
            .unwrap();
        mint_tokens(
            context,
            &self.mint.pubkey(),
            &token,
            1,
            &context.payer.pubkey(),
            None,
        )
        .await?;

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
                is_mutable,
            )],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );

        Ok(context.banks_client.process_transaction(tx).await?)
    }

    pub async fn create_v2(
        &self,
        context: &mut ProgramTestContext,
        name: String,
        symbol: String,
        uri: String,
        creators: Option<Vec<Creator>>,
        seller_fee_basis_points: u16,
        is_mutable: bool,
        collection: Option<Collection>,
        uses: Option<Uses>,
    ) -> transport::Result<()> {
        create_mint(context, &self.mint, &context.payer.pubkey(), None).await?;
        create_token_account(
            context,
            &self.token,
            &self.mint.pubkey(),
            &context.payer.pubkey(),
        )
        .await?;
        mint_tokens(
            context,
            &self.mint.pubkey(),
            &self.token.pubkey(),
            1,
            &context.payer.pubkey(),
            None,
        )
        .await?;

        let tx = Transaction::new_signed_with_payer(
            &[instruction::create_metadata_accounts_v2(
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
                is_mutable,
                collection,
                uses,
            )],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );

        Ok(context.banks_client.process_transaction(tx).await?)
    }

    pub async fn update_primary_sale_happened_via_token(
        &self,
        context: &mut ProgramTestContext,
    ) -> transport::Result<()> {
        let tx = Transaction::new_signed_with_payer(
            &[instruction::update_primary_sale_happened_via_token(
                id(),
                self.pubkey,
                context.payer.pubkey(),
                self.token.pubkey(),
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

    pub async fn update_v2(
        &self,
        context: &mut ProgramTestContext,
        name: String,
        symbol: String,
        uri: String,
        creators: Option<Vec<Creator>>,
        seller_fee_basis_points: u16,
        is_mutable: bool,
        collection: Option<Collection>,
        uses: Option<Uses>,
    ) -> transport::Result<()> {
        let tx = Transaction::new_signed_with_payer(
            &[instruction::update_metadata_accounts_v2(
                id(),
                self.pubkey,
                context.payer.pubkey().clone(),
                None,
                Some(DataV2 {
                    name,
                    symbol,
                    uri,
                    creators,
                    seller_fee_basis_points,
                    collection: collection,
                    uses: uses,
                }),
                None,
                Some(is_mutable),
            )],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );

        Ok(context.banks_client.process_transaction(tx).await?)
    }

    pub async fn verify_collection(
        &self,
        context: &mut ProgramTestContext,
        collection: Pubkey,
        collection_authority: Keypair,
        collection_mint: Pubkey,
        collection_master_edition_account: Pubkey,
        collection_authority_record: Option<Pubkey>,
    ) -> transport::Result<()> {
        let tx = Transaction::new_signed_with_payer(
            &[instruction::verify_collection(
                id(),
                self.pubkey,
                collection_authority.pubkey(),
                context.payer.pubkey().clone(),
                collection_mint,
                collection,
                collection_master_edition_account,
                collection_authority_record,
            )],
            Some(&context.payer.pubkey()),
            &[&context.payer, &collection_authority],
            context.last_blockhash,
        );

        Ok(context.banks_client.process_transaction(tx).await?)
    }

    pub async fn unverify_collection(
        &self,
        context: &mut ProgramTestContext,
        collection: Pubkey,
        collection_authority: Keypair,
        collection_mint: Pubkey,
        collection_master_edition_account: Pubkey,
        collection_authority_record: Option<Pubkey>,
    ) -> transport::Result<()> {
        let tx = Transaction::new_signed_with_payer(
            &[instruction::unverify_collection(
                id(),
                self.pubkey,
                collection_authority.pubkey(),
                collection_mint,
                collection,
                collection_master_edition_account,
                collection_authority_record,
            )],
            Some(&context.payer.pubkey()),
            &[&context.payer, &collection_authority],
            context.last_blockhash,
        );

        Ok(context.banks_client.process_transaction(tx).await?)
    }
}
