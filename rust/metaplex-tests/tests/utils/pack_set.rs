use crate::*;
use metaplex_nft_packs::{instruction, state::PackSet};
use solana_program::{program_pack::Pack, system_instruction};
use solana_program_test::*;
use solana_sdk::{
    signature::Signer, signer::keypair::Keypair, transaction::Transaction, transport,
};
use spl_token::state::Account;

#[derive(Debug)]
pub struct TestPackSet {
    pub keypair: Keypair,
    pub authority: Keypair,
    pub minting_authority: Keypair,
}

impl TestPackSet {
    #[allow(clippy::new_without_default)]
    pub fn new() -> Self {
        Self {
            keypair: Keypair::new(),
            authority: Keypair::new(),
            minting_authority: Keypair::new(),
        }
    }

    pub async fn get_data(&self, context: &mut ProgramTestContext) -> PackSet {
        let account = get_account(context, &self.keypair.pubkey()).await;
        PackSet::unpack_unchecked(&account.data).unwrap()
    }

    pub async fn init(
        &self,
        context: &mut ProgramTestContext,
        args: instruction::InitPackSetArgs,
    ) -> transport::Result<()> {
        create_account::<PackSet>(context, &self.keypair, &metaplex_nft_packs::id()).await?;

        let tx = Transaction::new_signed_with_payer(
            &[
                // Transfer a few lamports to cover fee for create account
                system_instruction::transfer(
                    &context.payer.pubkey(),
                    &self.authority.pubkey(),
                    999999999,
                ),
                instruction::init_pack(
                    &metaplex_nft_packs::id(),
                    &self.keypair.pubkey(),
                    &self.authority.pubkey(),
                    &self.minting_authority.pubkey(),
                    args,
                ),
            ],
            Some(&context.payer.pubkey()),
            &[&context.payer, &self.authority],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await
    }

    pub async fn add_card(
        &self,
        context: &mut ProgramTestContext,
        test_pack_card: &TestPackCard,
        test_master_edition: &TestMasterEditionV2,
        test_metadata: &TestMetadata,
        user: &User,
        args: instruction::AddCardToPackArgs,
    ) -> transport::Result<()> {
        let rent = context.banks_client.get_rent().await.unwrap();
        let tx = Transaction::new_signed_with_payer(
            &[
                system_instruction::create_account(
                    &context.payer.pubkey(),
                    &test_pack_card.token_account.pubkey(),
                    rent.minimum_balance(Account::LEN),
                    Account::LEN as u64,
                    &spl_token::id(),
                ),
                instruction::add_card_to_pack(
                    &metaplex_nft_packs::id(),
                    &self.keypair.pubkey(),
                    &self.authority.pubkey(),
                    &test_master_edition.pubkey,
                    &test_metadata.pubkey,
                    &test_master_edition.mint_pubkey,
                    &user.token_account,
                    &test_pack_card.token_account.pubkey(),
                    args.clone(),
                ),
            ],
            Some(&context.payer.pubkey()),
            &[
                &context.payer,
                &test_pack_card.token_account,
                &self.authority,
            ],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await
    }
}
