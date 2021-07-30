use crate::*;
use solana_program::{borsh::try_from_slice_unchecked, system_instruction};
use solana_program_test::*;
use solana_sdk::{
    pubkey::Pubkey, signature::Signer, signer::keypair::Keypair, transaction::Transaction,
    transport,
};
use spl_token_vault::instruction;

#[derive(Debug)]
pub struct ExternalPrice {
    pub keypair: Keypair,
    pub price_mint: Keypair,
}

impl ExternalPrice {
    pub fn new() -> Self {
        ExternalPrice {
            keypair: Keypair::new(),
            price_mint: Keypair::new(),
        }
    }

    pub async fn get_data(
        &self,
        context: &mut ProgramTestContext,
    ) -> spl_token_vault::state::ExternalPriceAccount {
        let account = get_account(context, &self.keypair.pubkey()).await;
        try_from_slice_unchecked(&account.data).unwrap()
    }

    pub async fn update(
        &self,
        context: &mut ProgramTestContext,
        price_per_share: u64,
        price_mint: &Pubkey,
        allowed_to_combine: bool,
    ) -> transport::Result<()> {
        let tx = Transaction::new_signed_with_payer(
            &[
                instruction::create_update_external_price_account_instruction(
                    spl_token_vault::id(),
                    self.keypair.pubkey(),
                    price_per_share,
                    *price_mint,
                    allowed_to_combine,
                ),
            ],
            Some(&context.payer.pubkey()),
            &[&context.payer, &self.keypair],
            context.last_blockhash,
        );

        Ok(context.banks_client.process_transaction(tx).await?)
    }

    pub async fn create(&self, context: &mut ProgramTestContext) -> transport::Result<()> {
        create_mint(
            context,
            &self.price_mint,
            &context.payer.pubkey(),
            Some(&context.payer.pubkey()),
        )
        .await?;

        let rent = context.banks_client.get_rent().await.unwrap();
        let tx = Transaction::new_signed_with_payer(
            &[system_instruction::create_account(
                &context.payer.pubkey(),
                &self.keypair.pubkey(),
                rent.minimum_balance(spl_token_vault::state::MAX_EXTERNAL_ACCOUNT_SIZE),
                spl_token_vault::state::MAX_EXTERNAL_ACCOUNT_SIZE as u64,
                &spl_token_vault::id(),
            )],
            Some(&context.payer.pubkey()),
            &[&context.payer, &self.keypair],
            context.last_blockhash,
        );

        Ok(context.banks_client.process_transaction(tx).await?)
    }
}
