use mpl_token_metadata::state::{EDITION, PREFIX};
use solana_sdk::pubkey::Pubkey;

#[derive(Debug)]
pub struct TestEdition {
    pub pubkey: Pubkey,
}

impl TestEdition {
    pub fn new(mint: &Pubkey) -> Self {
        let program_id = mpl_token_metadata::id();

        let (pubkey, _) = Pubkey::find_program_address(
            &[
                PREFIX.as_bytes(),
                program_id.as_ref(),
                (*mint).as_ref(),
                EDITION.as_bytes(),
            ],
            &program_id,
        );

        TestEdition { pubkey }
    }
}
