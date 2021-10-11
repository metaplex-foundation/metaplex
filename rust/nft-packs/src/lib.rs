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

solana_program::declare_id!("GLbAYokR3CtLsS7pMN1p9y9FbDwTkwRpiwYFpz9stqtv");

/// Default precision
pub const PRECISION: u128 = 1000000000;
/// Max probability value - 100% with precision
pub const MAX_PROBABILITY_VALUE: u16 = 10000;

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
            &index.to_be_bytes(),
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
            &index.to_be_bytes(),
        ],
        program_id,
    )
}

/// Generates proving process address
pub fn find_proving_process_program_address(
    program_id: &Pubkey,
    pack: &Pubkey,
    user_wallet: &Pubkey,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            ProvingProcess::PREFIX.as_bytes(),
            &pack.to_bytes(),
            &user_wallet.to_bytes(),
        ],
        program_id,
    )
}
