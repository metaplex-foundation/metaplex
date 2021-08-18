use crate::*;
use borsh::ser::BorshSerialize;
use solana_program::borsh::try_from_slice_unchecked;
use solana_program::{
    instruction::{AccountMeta, Instruction},
    sysvar,
};
use solana_program_test::*;
use solana_sdk::signature::Keypair;
use solana_sdk::{pubkey::Pubkey, signature::Signer, transaction::Transaction, transport};
use spl_token_metadata::{
    id,
    instruction::{self, CreateMasterEditionArgs, MetadataInstruction},
    state::{EDITION, PREFIX},
};

#[derive(Debug)]
pub struct MasterEditionV2 {
    pub pubkey: Pubkey,
    pub metadata_pubkey: Pubkey,
    pub mint_pubkey: Pubkey,
}

impl MasterEditionV2 {
    pub fn new(metadata: &Metadata) -> Self {
        let program_id = id();
        let mint_pubkey = metadata.mint.pubkey();

        let master_edition_seeds = &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            mint_pubkey.as_ref(),
            EDITION.as_bytes(),
        ];
        let (pubkey, _) = Pubkey::find_program_address(master_edition_seeds, &id());

        MasterEditionV2 {
            pubkey,
            metadata_pubkey: metadata.pubkey,
            mint_pubkey: mint_pubkey,
        }
    }

    pub async fn get_data(
        &self,
        context: &mut ProgramTestContext,
    ) -> spl_token_metadata::state::MasterEditionV2 {
        let account = get_account(context, &self.pubkey).await;
        try_from_slice_unchecked(&account.data).unwrap()
    }

    pub async fn get_data_from_account(
        context: &mut ProgramTestContext,
        pubkey: &Pubkey,
    ) -> spl_token_metadata::state::MasterEditionV2 {
        let account = get_account(context, pubkey).await;
        try_from_slice_unchecked(&account.data).unwrap()
    }

    pub async fn create_with_invalid_token_program(
        &self,
        context: &mut ProgramTestContext,
        max_supply: Option<u64>,
    ) -> transport::Result<()> {
        let fake_token_program = Keypair::new();

        let fake_instruction = Instruction {
            program_id: spl_token_metadata::id(),
            accounts: vec![
                AccountMeta::new(self.pubkey, false),
                AccountMeta::new(self.mint_pubkey, false),
                AccountMeta::new_readonly(context.payer.pubkey(), true),
                AccountMeta::new_readonly(context.payer.pubkey(), true),
                AccountMeta::new_readonly(context.payer.pubkey(), true),
                AccountMeta::new_readonly(self.metadata_pubkey, false),
                AccountMeta::new_readonly(fake_token_program.pubkey(), false),
                AccountMeta::new_readonly(solana_program::system_program::id(), false),
                AccountMeta::new_readonly(sysvar::rent::id(), false),
            ],
            data: MetadataInstruction::CreateMasterEdition(CreateMasterEditionArgs { max_supply })
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

    pub async fn create(
        &self,
        context: &mut ProgramTestContext,
        max_supply: Option<u64>,
    ) -> transport::Result<()> {
        let tx = Transaction::new_signed_with_payer(
            &[instruction::create_master_edition(
                id(),
                self.pubkey,
                self.mint_pubkey,
                context.payer.pubkey(),
                context.payer.pubkey(),
                self.metadata_pubkey,
                context.payer.pubkey(),
                max_supply,
            )],
            Some(&context.payer.pubkey()),
            &[&context.payer, &context.payer, &context.payer],
            context.last_blockhash,
        );

        Ok(context.banks_client.process_transaction(tx).await?)
    }
}
