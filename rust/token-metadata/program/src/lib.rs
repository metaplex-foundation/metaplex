//! A Token Metadata program for the Solana blockchain.

pub mod assertions;
pub mod deprecated_instruction;
pub mod deprecated_processor;
pub mod entrypoint;
pub mod error;
pub mod instruction;
pub mod pda;
pub mod processor;
pub mod state;
pub mod utils;
pub mod utils_test;
// Export current sdk types for downstream users building with a different sdk version
pub use solana_program;

//solana_program::declare_id!("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
solana_program::declare_id!("5iYdS8vnReHe1VhYmUe3jotd4NaYXGPCrgo4LvFu4Kv1");
