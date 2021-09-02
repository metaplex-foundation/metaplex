use crate::*;
use metaplex_nft_packs::{instruction, state::PackSet};
use solana_program::{program_pack::Pack, pubkey::Pubkey, system_instruction};
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

    pub async fn activate(&self, context: &mut ProgramTestContext) -> transport::Result<()> {
        let tx = Transaction::new_signed_with_payer(
            &[instruction::activate(
                &metaplex_nft_packs::id(),
                &self.keypair.pubkey(),
                &self.authority.pubkey(),
            )],
            Some(&context.payer.pubkey()),
            &[&self.authority, &context.payer],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await
    }

    pub async fn deactivate(&self, context: &mut ProgramTestContext) -> transport::Result<()> {
        let tx = Transaction::new_signed_with_payer(
            &[instruction::deactivate(
                &metaplex_nft_packs::id(),
                &self.keypair.pubkey(),
                &self.authority.pubkey(),
            )],
            Some(&context.payer.pubkey()),
            &[&self.authority, &context.payer],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await
    }

    pub async fn delete_card(
        &self,
        context: &mut ProgramTestContext,
        test_pack_card: &TestPackCard,
        refunder: &Pubkey,
        new_master_edition_owner_token_acc: &Pubkey,
    ) -> transport::Result<()> {
        let tx = Transaction::new_signed_with_payer(
            &[instruction::delete_pack_card(
                &metaplex_nft_packs::id(),
                &self.keypair.pubkey(),
                &test_pack_card.pubkey,
                &self.authority.pubkey(),
                refunder,
                new_master_edition_owner_token_acc,
                &test_pack_card.token_account.pubkey(),
            )],
            Some(&context.payer.pubkey()),
            &[&self.authority, &context.payer],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await
    }

    pub async fn delete(
        &self,
        context: &mut ProgramTestContext,
        refunder: &Pubkey,
    ) -> transport::Result<()> {
        let tx = Transaction::new_signed_with_payer(
            &[instruction::delete_pack(
                &metaplex_nft_packs::id(),
                &self.keypair.pubkey(),
                &self.authority.pubkey(),
                refunder,
            )],
            Some(&context.payer.pubkey()),
            &[&self.authority, &context.payer],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await
    }

    pub async fn delete_voucher(
        &self,
        context: &mut ProgramTestContext,
        test_pack_voucher: &TestPackVoucher,
        refunder: &Pubkey,
        new_master_edition_owner_token_acc: &Pubkey,
    ) -> transport::Result<()> {
        let tx = Transaction::new_signed_with_payer(
            &[instruction::delete_pack_voucher(
                &metaplex_nft_packs::id(),
                &self.keypair.pubkey(),
                &test_pack_voucher.pubkey,
                &self.authority.pubkey(),
                refunder,
                new_master_edition_owner_token_acc,
                &test_pack_voucher.token_account.pubkey(),
            )],
            Some(&context.payer.pubkey()),
            &[&self.authority, &context.payer],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await
    }

    pub async fn add_voucher(
        &self,
        context: &mut ProgramTestContext,
        test_pack_voucher: &TestPackVoucher,
        test_master_edition: &TestMasterEditionV2,
        test_metadata: &TestMetadata,
        user: &User,
        args: instruction::AddVoucherToPackArgs,
    ) -> transport::Result<()> {
        let rent = context.banks_client.get_rent().await.unwrap();

        let tx = Transaction::new_signed_with_payer(
            &[
                system_instruction::create_account(
                    &context.payer.pubkey(),
                    &test_pack_voucher.token_account.pubkey(),
                    rent.minimum_balance(Account::LEN),
                    Account::LEN as u64,
                    &spl_token::id(),
                ),
                instruction::add_voucher_to_pack(
                    &metaplex_nft_packs::id(),
                    &self.keypair.pubkey(),
                    &test_pack_voucher.pubkey,
                    &self.authority.pubkey(),
                    &test_master_edition.pubkey,
                    &test_metadata.pubkey,
                    &test_master_edition.mint_pubkey,
                    &user.token_account,
                    &test_pack_voucher.token_account.pubkey(),
                    args.clone(),
                ),
            ],
            Some(&context.payer.pubkey()),
            &[
                &context.payer,
                &test_pack_voucher.token_account,
                &self.authority,
            ],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await
    }
}
