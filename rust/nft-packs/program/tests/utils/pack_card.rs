use crate::*;
use mpl_nft_packs::{find_pack_card_program_address, state::PackCard};
use solana_program::{program_pack::Pack, pubkey::Pubkey};
use solana_program_test::*;
use solana_sdk::{signature::Signer, signer::keypair::Keypair};

#[derive(Debug)]
pub struct TestPackCard {
    pub pubkey: Pubkey,
    pub token_account: Keypair,
    pub index: u32,
}

impl TestPackCard {
    #[allow(clippy::new_without_default)]
    pub fn new(test_pack_set: &TestPackSet, index: u32) -> Self {
        let (pubkey, _) = find_pack_card_program_address(
            &mpl_nft_packs::id(),
            &test_pack_set.keypair.pubkey(),
            index,
        );

        Self {
            pubkey,
            token_account: Keypair::new(),
            index,
        }
    }

    pub async fn get_data(&self, context: &mut ProgramTestContext) -> PackCard {
        let account = get_account(context, &self.pubkey).await;
        PackCard::unpack_unchecked(&account.data).unwrap()
    }
}
