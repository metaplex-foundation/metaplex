//! A Token Metadata program for the Solana blockchain.

pub mod deprecated_instruction;
pub mod deprecated_processor;
pub mod entrypoint;
pub mod error;
pub mod instruction;
pub mod processor;
pub mod state;
pub mod utils;
// Export current sdk types for downstream users building with a different sdk version
pub use solana_program;

solana_program::declare_id!("GCUQ7oWCzgtRKnHnuJGxpr5XVeEkxYUXwTKYcqGtxLv4");
