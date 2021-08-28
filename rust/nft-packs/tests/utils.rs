#![cfg(feature = "test-bpf")]

use metaplex_nft_packs::*;
use solana_program::pubkey::Pubkey;
use solana_program_test::*;

pub fn program_test() -> ProgramTest {
    let mut program = ProgramTest::new(
        "metaplex_nft_packs",
        id(),
        processor!(processor::Processor::process_instruction),
    );
    program.add_program("spl_token_metadata", spl_token_metadata::id(), None);
    program
}
