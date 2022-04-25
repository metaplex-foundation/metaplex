use crate::utils::*;
use borsh::BorshSerialize;
use mpl_token_metadata::{
    id,
    instruction::{self, MetadataInstruction, MintNewEditionFromMasterEditionViaTokenArgs},
    state::{EDITION, EDITION_MARKER_BIT_SIZE, PREFIX},
};
use solana_program::{
    borsh::try_from_slice_unchecked,
    instruction::{AccountMeta, Instruction},
    sysvar,
};
use solana_program_test::*;
use solana_sdk::{
    pubkey::Pubkey, signature::Signer, signer::keypair::Keypair, transaction::Transaction,
    transport,
};

#[derive(Debug)]
pub struct EditionMarker {
    pub new_metadata_pubkey: Pubkey,
    pub new_edition_pubkey: Pubkey,
    pub master_edition_pubkey: Pubkey,
    pub metadata_mint_pubkey: Pubkey,
    pub mint: Keypair,
    pub metadata_pubkey: Pubkey,
    pub pubkey: Pubkey,
    pub edition: u64,
    pub token: Keypair,
    pub metadata_token_pubkey: Pubkey,
}

impl EditionMarker {
    pub fn new(metadata: &Metadata, master_edition: &MasterEditionV2, edition: u64) -> Self {
        let mint = Keypair::new();
        let mint_pubkey = mint.pubkey();
        let metadata_mint_pubkey = metadata.mint.pubkey();
        let program_id = id();

        let edition_number = edition.checked_div(EDITION_MARKER_BIT_SIZE).unwrap();
        let as_string = edition_number.to_string();
        let (pubkey, _) = Pubkey::find_program_address(
            &[
                PREFIX.as_bytes(),
                program_id.as_ref(),
                metadata_mint_pubkey.as_ref(),
                EDITION.as_bytes(),
                as_string.as_bytes(),
            ],
            &program_id,
        );

        let metadata_seeds = &[PREFIX.as_bytes(), program_id.as_ref(), mint_pubkey.as_ref()];
        let (new_metadata_pubkey, _) = Pubkey::find_program_address(metadata_seeds, &id());

        let master_edition_seeds = &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            mint_pubkey.as_ref(),
            EDITION.as_bytes(),
        ];
        let (new_edition_pubkey, _) = Pubkey::find_program_address(master_edition_seeds, &id());

        EditionMarker {
            pubkey,
            edition,
            mint,
            metadata_mint_pubkey,
            metadata_pubkey: metadata.pubkey,
            master_edition_pubkey: master_edition.pubkey,
            new_metadata_pubkey,
            new_edition_pubkey,
            metadata_token_pubkey: metadata.token.pubkey(),
            token: Keypair::new(),
        }
    }

    pub async fn get_data(
        &self,
        context: &mut ProgramTestContext,
    ) -> mpl_token_metadata::state::EditionMarker {
        let account = get_account(context, &self.pubkey).await;
        try_from_slice_unchecked(&account.data).unwrap()
    }

    pub async fn create_via_vault(
        &self,
        context: &mut ProgramTestContext,
        vault: &Vault,
        safety_deposit_box: &Pubkey,
        store: &Pubkey,
    ) -> transport::Result<()> {
        let metaplex_token_vault_id = mpl_token_vault::id();
        let vault_pubkey = vault.keypair.pubkey();

        let vault_mint_seeds = &[
            PREFIX.as_bytes(),
            metaplex_token_vault_id.as_ref(),
            vault_pubkey.as_ref(),
        ];
        let (_authority, _) =
            Pubkey::find_program_address(vault_mint_seeds, &metaplex_token_vault_id);

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
            &[
                instruction::mint_edition_from_master_edition_via_vault_proxy(
                    id(),
                    self.new_metadata_pubkey,
                    self.new_edition_pubkey,
                    self.master_edition_pubkey,
                    self.mint.pubkey(),
                    self.pubkey,
                    context.payer.pubkey(),
                    context.payer.pubkey(),
                    context.payer.pubkey(),
                    *store,
                    *safety_deposit_box,
                    vault.keypair.pubkey(),
                    context.payer.pubkey(),
                    self.metadata_pubkey,
                    spl_token::id(),
                    mpl_token_vault::id(),
                    self.edition,
                ),
            ],
            Some(&context.payer.pubkey()),
            &[&context.payer, &context.payer],
            context.last_blockhash,
        );

        Ok(context.banks_client.process_transaction(tx).await?)
    }

    pub async fn create(&self, context: &mut ProgramTestContext) -> transport::Result<()> {
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
            &[instruction::mint_new_edition_from_master_edition_via_token(
                id(),
                self.new_metadata_pubkey,
                self.new_edition_pubkey,
                self.master_edition_pubkey,
                self.mint.pubkey(),
                context.payer.pubkey(),
                context.payer.pubkey(),
                context.payer.pubkey(),
                self.metadata_token_pubkey,
                context.payer.pubkey(),
                self.metadata_pubkey,
                self.metadata_mint_pubkey,
                self.edition,
            )],
            Some(&context.payer.pubkey()),
            &[&context.payer, &context.payer],
            context.last_blockhash,
        );

        Ok(context.banks_client.process_transaction(tx).await?)
    }

    pub async fn create_with_invalid_token_program(
        &self,
        context: &mut ProgramTestContext,
    ) -> transport::Result<()> {
        let fake_token_program = Keypair::new();
        let program_id = mpl_token_metadata::id();

        let edition_number = self.edition.checked_div(EDITION_MARKER_BIT_SIZE).unwrap();
        let as_string = edition_number.to_string();
        let (edition_mark_pda, _) = Pubkey::find_program_address(
            &[
                PREFIX.as_bytes(),
                program_id.as_ref(),
                self.metadata_mint_pubkey.as_ref(),
                EDITION.as_bytes(),
                as_string.as_bytes(),
            ],
            &program_id,
        );

        let accounts = vec![
            AccountMeta::new(self.new_metadata_pubkey, false),
            AccountMeta::new(self.new_edition_pubkey, false),
            AccountMeta::new(self.master_edition_pubkey, false),
            AccountMeta::new(self.mint.pubkey(), false),
            AccountMeta::new(edition_mark_pda, false),
            AccountMeta::new_readonly(context.payer.pubkey(), true),
            AccountMeta::new(context.payer.pubkey(), true),
            AccountMeta::new_readonly(context.payer.pubkey(), true),
            AccountMeta::new_readonly(self.token.pubkey(), false),
            AccountMeta::new_readonly(context.payer.pubkey(), false),
            AccountMeta::new_readonly(self.metadata_pubkey, false),
            AccountMeta::new_readonly(fake_token_program.pubkey(), false),
            AccountMeta::new_readonly(solana_program::system_program::id(), false),
            AccountMeta::new_readonly(sysvar::rent::id(), false),
        ];

        let fake_instruction = Instruction {
            program_id,
            accounts,
            data: MetadataInstruction::MintNewEditionFromMasterEditionViaToken(
                MintNewEditionFromMasterEditionViaTokenArgs {
                    edition: self.edition,
                },
            )
            .try_to_vec()
            .unwrap(),
        };

        let tx = Transaction::new_signed_with_payer(
            &[fake_instruction],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );

        Ok(context.banks_client.process_transaction(tx).await?)
    }
}
