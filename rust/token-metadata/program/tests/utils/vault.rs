use super::{create_mint, create_token_account, ExternalPrice};
use solana_program::{pubkey::Pubkey, system_instruction};
use solana_program_test::*;
use solana_sdk::{
    signature::{Keypair, Signer},
    transaction::Transaction,
    transport,
};
use spl_token_vault::{instruction, state::PREFIX};

pub struct Vault {
    pub keypair: Keypair,
    pub mint: Keypair,
    pub redeem_treasury: Keypair,
    pub fraction_treasury: Keypair,
}

impl Vault {
    pub fn new() -> Self {
        Vault {
            keypair: Keypair::new(),
            mint: Keypair::new(),
            redeem_treasury: Keypair::new(),
            fraction_treasury: Keypair::new(),
        }
    }

    pub async fn create(
        &self,
        context: &mut ProgramTestContext,
        external_price: &ExternalPrice,
    ) -> transport::Result<()> {
        let spl_token_vault_id = spl_token_vault::id();
        let vault_pubkey = self.keypair.pubkey();

        let seed = [PREFIX.as_bytes().as_ref(), spl_token_vault_id.as_ref()].concat();
        let (authority, _) = Pubkey::find_program_address(&[&seed], &spl_token_vault_id);

        create_mint(context, &self.mint, &authority).await?;
        create_token_account(
            context,
            &self.redeem_treasury,
            &self.mint.pubkey(),
            &authority,
        )
        .await?;
        create_token_account(
            context,
            &self.fraction_treasury,
            &self.mint.pubkey(),
            &authority,
        )
        .await?;

        let rent = context.banks_client.get_rent().await.unwrap();
        let tx = Transaction::new_signed_with_payer(
            &[
                system_instruction::create_account(
                    &context.payer.pubkey(),
                    &self.keypair.pubkey(),
                    rent.minimum_balance(spl_token_vault::state::MAX_VAULT_SIZE),
                    spl_token_vault::state::MAX_VAULT_SIZE as u64,
                    &spl_token_vault::id(),
                ),
                instruction::create_init_vault_instruction(
                    spl_token_vault::id(),
                    self.mint.pubkey(),
                    self.redeem_treasury.pubkey(),
                    self.fraction_treasury.pubkey(),
                    self.keypair.pubkey(),
                    context.payer.pubkey(),
                    external_price.keypair.pubkey(),
                    false,
                ),
            ],
            Some(&context.payer.pubkey()),
            &[&context.payer, &context.payer, &self.keypair],
            context.last_blockhash,
        );

        Ok(context.banks_client.process_transaction(tx).await?)
    }
}
