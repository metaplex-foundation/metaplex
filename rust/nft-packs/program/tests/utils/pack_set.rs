use crate::*;
use mpl_nft_packs::{
    instruction::{self, EditPackSetArgs},
    state::PackSet,
};
use solana_program::{
    instruction::AccountMeta, program_pack::Pack, pubkey::Pubkey, system_instruction,
};
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
    pub store: Pubkey,
}

impl TestPackSet {
    #[allow(clippy::new_without_default)]
    pub fn new(store: Pubkey) -> Self {
        Self {
            keypair: Keypair::new(),
            authority: Keypair::new(),
            minting_authority: Keypair::new(),
            store,
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
        create_account::<PackSet>(context, &self.keypair, &mpl_nft_packs::id()).await?;

        let tx = Transaction::new_signed_with_payer(
            &[
                // Transfer a few lamports to cover fee for create account
                system_instruction::transfer(
                    &context.payer.pubkey(),
                    &self.authority.pubkey(),
                    999999999,
                ),
                instruction::init_pack(
                    &mpl_nft_packs::id(),
                    &self.keypair.pubkey(),
                    &self.authority.pubkey(),
                    &self.store,
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

    pub async fn clean_up(&self, context: &mut ProgramTestContext) -> transport::Result<()> {
        let tx = Transaction::new_signed_with_payer(
            &[instruction::clean_up(
                &mpl_nft_packs::id(),
                &self.keypair.pubkey(),
            )],
            Some(&context.payer.pubkey()),
            &[&context.payer],
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
                    &mpl_nft_packs::id(),
                    &self.keypair.pubkey(),
                    &self.authority.pubkey(),
                    &test_master_edition.pubkey,
                    &test_metadata.pubkey,
                    &test_master_edition.mint_pubkey,
                    &user.token_account,
                    &test_pack_card.token_account.pubkey(),
                    &self.store,
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
                &mpl_nft_packs::id(),
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
                &mpl_nft_packs::id(),
                &self.keypair.pubkey(),
                &self.authority.pubkey(),
            )],
            Some(&context.payer.pubkey()),
            &[&self.authority, &context.payer],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await
    }

    pub async fn close(&self, context: &mut ProgramTestContext) -> transport::Result<()> {
        let tx = Transaction::new_signed_with_payer(
            &[instruction::close_pack(
                &mpl_nft_packs::id(),
                &self.keypair.pubkey(),
                &self.authority.pubkey(),
            )],
            Some(&context.payer.pubkey()),
            &[&self.authority, &context.payer],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await
    }

    pub async fn transfer_pack_authority(
        &self,
        context: &mut ProgramTestContext,
        new_authority: &Pubkey,
    ) -> transport::Result<()> {
        let tx = Transaction::new_signed_with_payer(
            &[instruction::transfer_pack_authority(
                &mpl_nft_packs::id(),
                &self.keypair.pubkey(),
                &self.authority.pubkey(),
                &new_authority,
            )],
            Some(&context.payer.pubkey()),
            &[&self.authority, &context.payer],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await
    }

    pub async fn edit(
        &self,
        context: &mut ProgramTestContext,
        mutable: Option<bool>,
        name: Option<[u8; 32]>,
        description: Option<String>,
        uri: Option<String>,
    ) -> transport::Result<()> {
        let tx = Transaction::new_signed_with_payer(
            &[instruction::edit_pack(
                &mpl_nft_packs::id(),
                &self.keypair.pubkey(),
                &self.authority.pubkey(),
                EditPackSetArgs {
                    mutable,
                    name,
                    description,
                    uri,
                },
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
                &mpl_nft_packs::id(),
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
                &mpl_nft_packs::id(),
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
    ) -> transport::Result<()> {
        let tx = Transaction::new_signed_with_payer(
            &[instruction::delete_pack_voucher(
                &mpl_nft_packs::id(),
                &self.keypair.pubkey(),
                &test_pack_voucher.pubkey,
                &self.authority.pubkey(),
                refunder,
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
                    &mpl_nft_packs::id(),
                    &self.keypair.pubkey(),
                    &test_pack_voucher.pubkey,
                    &self.authority.pubkey(),
                    &self.authority.pubkey(),
                    &test_master_edition.pubkey,
                    &test_metadata.pubkey,
                    &test_master_edition.mint_pubkey,
                    &user.token_account,
                    &self.store,
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

    pub async fn request_card_for_redeem(
        &self,
        context: &mut ProgramTestContext,
        store: &Pubkey,
        edition: &Pubkey,
        edition_mint: &Pubkey,
        user_wallet: &Keypair,
        user_token_acc: &Option<Pubkey>,
        voucher_index: u32,
    ) -> transport::Result<()> {
        let tx = Transaction::new_signed_with_payer(
            &[instruction::request_card_for_redeem(
                &mpl_nft_packs::id(),
                &self.keypair.pubkey(),
                store,
                edition,
                edition_mint,
                &user_wallet.pubkey(),
                user_token_acc,
                voucher_index,
            )],
            Some(&context.payer.pubkey()),
            &[&context.payer, user_wallet],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await
    }

    pub async fn request_card_for_redeem_fake_voucher(
        &self,
        context: &mut ProgramTestContext,
        store: &Pubkey,
        edition: &Pubkey,
        edition_mint: &Pubkey,
        user_wallet: &Keypair,
        user_token_acc: &Option<Pubkey>,
        voucher_index: u32,
    ) -> transport::Result<()> {
        let mut ix = instruction::request_card_for_redeem(
            &mpl_nft_packs::id(),
            &self.keypair.pubkey(),
            store,
            edition,
            edition_mint,
            &user_wallet.pubkey(),
            user_token_acc,
            voucher_index,
        );

        let fake_pack_voucher = Pubkey::new_unique();
        ix.accounts[5] = AccountMeta::new_readonly(fake_pack_voucher, false);

        let tx = Transaction::new_signed_with_payer(
            &[ix],
            Some(&context.payer.pubkey()),
            &[&context.payer, user_wallet],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await
    }

    pub async fn claim_pack(
        &self,
        context: &mut ProgramTestContext,
        user_wallet: &Keypair,
        voucher_mint: &Pubkey,
        master_token_account: &Pubkey,
        master_edition_account: &Pubkey,
        new_mint: &Keypair,
        new_mint_token_acc: &Keypair,
        new_mint_authority: &Keypair,
        master_metadata: &Pubkey,
        master_mint: &Pubkey,
        index: u32,
    ) -> transport::Result<()> {
        create_mint(context, new_mint, &new_mint_authority.pubkey(), None)
            .await
            .unwrap();
        create_token_account(
            context,
            new_mint_token_acc,
            &new_mint.pubkey(),
            &user_wallet.pubkey(),
        )
        .await
        .unwrap();
        mint_tokens(
            context,
            &new_mint.pubkey(),
            &new_mint_token_acc.pubkey(),
            1,
            &new_mint_authority.pubkey(),
            Some(vec![new_mint_authority]),
        )
        .await
        .unwrap();

        let mint_key = new_mint.pubkey();
        let spl_token_metadata_key = mpl_token_metadata::id();

        let metadata_seeds = &[
            mpl_token_metadata::state::PREFIX.as_bytes(),
            spl_token_metadata_key.as_ref(),
            mint_key.as_ref(),
        ];
        let (new_metadata_pubkey, _) =
            Pubkey::find_program_address(metadata_seeds, &mpl_token_metadata::id());

        let master_edition_seeds = &[
            mpl_token_metadata::state::PREFIX.as_bytes(),
            spl_token_metadata_key.as_ref(),
            mint_key.as_ref(),
            mpl_token_metadata::state::EDITION.as_bytes(),
        ];
        let (new_edition_pubkey, _) =
            Pubkey::find_program_address(master_edition_seeds, &mpl_token_metadata::id());

        let tx = Transaction::new_signed_with_payer(
            &[instruction::claim_pack(
                &mpl_nft_packs::id(),
                &self.keypair.pubkey(),
                &user_wallet.pubkey(),
                voucher_mint,
                master_token_account,
                &new_metadata_pubkey,
                &new_edition_pubkey,
                master_edition_account,
                &new_mint.pubkey(),
                &new_mint_authority.pubkey(),
                master_metadata,
                master_mint,
                index,
            )],
            Some(&context.payer.pubkey()),
            &[&context.payer, user_wallet, &new_mint_authority],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await
    }
}
