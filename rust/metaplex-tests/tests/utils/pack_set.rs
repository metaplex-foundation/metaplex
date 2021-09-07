use crate::*;
use metaplex_nft_packs::{
    find_program_authority,
    instruction::{self, EditPackCardArgs, EditPackSetArgs, EditPackVoucherArgs},
    state::{ActionOnProve, DistributionType, PackSet},
};
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

    pub async fn mint_edition_with_card(
        &self,
        context: &mut ProgramTestContext,
        test_metadata: &TestMetadata,
        test_pack_card: &TestPackCard,
        test_new_metadata: &TestMetadata,
        test_new_edition: &TestEdition,
        test_master_edition: &TestMasterEditionV2,
        new_mint_authority: &Pubkey,
        new_metadata_update_authority: &Pubkey,
    ) -> transport::Result<()> {
        let new_mint = Keypair::new();
        let dummy_token_account = Keypair::new();

        create_mint(context, &new_mint, &new_mint_authority, None)
            .await
            .unwrap();

        create_token_account(
            context,
            &dummy_token_account,
            &new_mint.pubkey(),
            &context.payer.pubkey(),
        )
        .await
        .unwrap();

        mint_tokens(
            context,
            &new_mint.pubkey(),
            &dummy_token_account.pubkey(),
            1,
            &context.payer.pubkey(),
            None,
        )
        .await
        .unwrap();

        let (program_authority, _) = find_program_authority(&metaplex_nft_packs::id());

        let tx = Transaction::new_signed_with_payer(
            &[instruction::mint_new_edition_from_card(
                &metaplex_nft_packs::id(),
                &self.keypair.pubkey(),
                &self.authority.pubkey(),
                &test_pack_card.pubkey,
                &test_new_metadata.pubkey,
                &test_new_edition.pubkey,
                &test_master_edition.pubkey,
                &new_mint.pubkey(),
                new_mint_authority,
                &context.payer.pubkey(),
                &program_authority,
                &test_pack_card.token_account.pubkey(),
                new_metadata_update_authority,
                &test_metadata.pubkey,
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
        total_packs: Option<u32>,
    ) -> transport::Result<()> {
        let tx = Transaction::new_signed_with_payer(
            &[instruction::edit_pack(
                &metaplex_nft_packs::id(),
                &self.keypair.pubkey(),
                &self.authority.pubkey(),
                EditPackSetArgs {
                    mutable,
                    name,
                    total_packs,
                },
            )],
            Some(&context.payer.pubkey()),
            &[&self.authority, &context.payer],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await
    }

    pub async fn edit_card(
        &self,
        context: &mut ProgramTestContext,
        test_pack_card: &TestPackCard,
        distribution_type: Option<DistributionType>,
        max_supply: Option<u32>,
        number_in_pack: Option<u64>,
    ) -> transport::Result<()> {
        let tx = Transaction::new_signed_with_payer(
            &[instruction::edit_pack_card(
                &metaplex_nft_packs::id(),
                &self.keypair.pubkey(),
                &test_pack_card.pubkey,
                &self.authority.pubkey(),
                EditPackCardArgs {
                    distribution_type,
                    max_supply,
                    number_in_pack,
                },
            )],
            Some(&context.payer.pubkey()),
            &[&self.authority, &context.payer],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await
    }

    pub async fn edit_voucher(
        &self,
        context: &mut ProgramTestContext,
        test_pack_voucher: &TestPackVoucher,
        action_on_prove: Option<ActionOnProve>,
        max_supply: Option<u32>,
        number_to_open: Option<u32>,
    ) -> transport::Result<()> {
        let tx = Transaction::new_signed_with_payer(
            &[instruction::edit_pack_voucher(
                &metaplex_nft_packs::id(),
                &self.keypair.pubkey(),
                &test_pack_voucher.pubkey,
                &self.authority.pubkey(),
                EditPackVoucherArgs {
                    action_on_prove,
                    max_supply,
                    number_to_open,
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

    pub async fn prove_voucher_ownership(
        &self,
        context: &mut ProgramTestContext,
        edition: &Pubkey,
        edition_mint: &Pubkey,
        user_wallet: &Keypair,
        user_token_account: &Pubkey,
        voucher: &Pubkey,
    ) -> transport::Result<()> {
        let tx = Transaction::new_signed_with_payer(
            &[instruction::prove_ownership(
                &metaplex_nft_packs::id(),
                &self.keypair.pubkey(),
                edition,
                edition_mint,
                &user_wallet.pubkey(),
                user_token_account,
                voucher,
            )],
            Some(&context.payer.pubkey()),
            &[&context.payer, user_wallet],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await
    }
}
