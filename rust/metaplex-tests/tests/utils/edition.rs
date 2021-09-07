use super::TestMetadata;
use solana_sdk::{pubkey::Pubkey, signer::Signer};
use spl_token_metadata::state::{EDITION, PREFIX};

#[derive(Debug)]
pub struct TestEdition {
    pub pubkey: Pubkey,
}

impl TestEdition {
    pub fn new(test_metadata: &TestMetadata) -> Self {
        let program_id = spl_token_metadata::id();

        let (pubkey, _) = Pubkey::find_program_address(
            &[
                PREFIX.as_bytes(),
                program_id.as_ref(),
                test_metadata.mint.pubkey().as_ref(),
                EDITION.as_bytes(),
            ],
            &program_id,
        );

        TestEdition { pubkey }
    }
}
