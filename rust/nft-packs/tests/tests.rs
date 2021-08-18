#![cfg(feature = "test-bpf")]

use solana_program::pubkey::Pubkey;
use metaplex_nft_packs::*;
use solana_program_test::*;
use solana_sdk::{
    signature::{Keypair, Signer},
    transaction::Transaction,
};

pub fn program_test() -> ProgramTest {
    ProgramTest::new(
        "metaplex-nft-packs",
        id(),
        processor!(processor::Processor::process_instruction),
    )
}
