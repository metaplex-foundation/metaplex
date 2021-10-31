#![deny(missing_docs)]

//! Metaplex NFT packs Solana program

pub mod error;
pub mod instruction;
pub mod math;
pub mod processor;
pub mod state;
pub mod utils;

/// Current program version
pub const PROGRAM_VERSION: u8 = 1;

#[cfg(not(feature = "no-entrypoint"))]
pub mod entrypoint;

// Export current sdk types for downstream users building with a different sdk version
pub use solana_program;
use solana_program::pubkey::Pubkey;
use state::{PackCard, PackVoucher, ProvingProcess, PREFIX};

solana_program::declare_id!("BW8ME2QqeUzFubR7oMn9mctq1VQhCEuHiAair39jUwM5");

/// Default precision
pub const PRECISION: u128 = 1000000000;
/// Max weight value
pub const MAX_WEIGHT_VALUE: u16 = 100;

/// Generates seed bump for authorities
pub fn find_program_address(program_id: &Pubkey, pubkey: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[&pubkey.to_bytes()[..32]], program_id)
}

/// Generates program authority
pub fn find_program_authority(program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[PREFIX.as_bytes(), program_id.as_ref()], program_id)
}

/// Generates pack card address
pub fn find_pack_card_program_address(
    program_id: &Pubkey,
    pack: &Pubkey,
    index: u32,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            PackCard::PREFIX.as_bytes(),
            &pack.to_bytes(),
            &index.to_le_bytes(),
        ],
        program_id,
    )
}

/// Generates pack voucher address
pub fn find_pack_voucher_program_address(
    program_id: &Pubkey,
    pack: &Pubkey,
    index: u32,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            PackVoucher::PREFIX.as_bytes(),
            &pack.to_bytes(),
            &index.to_le_bytes(),
        ],
        program_id,
    )
}

/// Generates proving process address
pub fn find_proving_process_program_address(
    program_id: &Pubkey,
    pack: &Pubkey,
    voucher_mint: &Pubkey,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            ProvingProcess::PREFIX.as_bytes(),
            &pack.to_bytes(),
            &voucher_mint.to_bytes(),
        ],
        program_id,
    )
}
