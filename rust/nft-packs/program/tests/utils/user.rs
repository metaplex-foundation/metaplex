use super::create_token_account;
use crate::*;
use solana_program::pubkey::Pubkey;
use solana_program_test::ProgramTestContext;
use solana_sdk::{
    signature::{Keypair, Signer},
    transport,
};

#[derive(Debug)]
pub struct User {
    pub owner: Keypair,
    pub token_account: Pubkey,
}

impl User {
    pub fn pubkey(&self) -> Pubkey {
        self.owner.pubkey()
    }
}

pub async fn add_user(
    context: &mut ProgramTestContext,
    test_master_edition: &TestMasterEditionV2,
) -> transport::Result<User> {
    let owner = Keypair::new();
    let token_account = Keypair::new();

    create_token_account(
        context,
        &token_account,
        &test_master_edition.mint_pubkey,
        &owner.pubkey(),
    )
    .await?;

    Ok(User {
        owner,
        token_account: token_account.pubkey(),
    })
}
