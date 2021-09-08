use solana_sdk::pubkey::Pubkey;
use spl_token_metadata::state::{EDITION, PREFIX};

#[derive(Debug)]
pub struct TestEdition {
    pub pubkey: Pubkey,
}

impl TestEdition {
    pub fn new(mint: &Pubkey) -> Self {
        let program_id = spl_token_metadata::id();

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
