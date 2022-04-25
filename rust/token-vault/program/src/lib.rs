//! A Token Fraction program for the Solana blockchain.

pub mod entrypoint;
pub mod error;
pub mod instruction;
pub mod processor;
pub mod state;
pub mod utils;
// Export current sdk types for downstream users building with a different sdk version
pub use solana_program;

//solana_program::declare_id!("4qJjbEoAtBTQjt6WH81uGTMyQWNo51kN5ebw5bG4tfRx");
solana_program::declare_id!("5jVaUEr49BMJWTc3iuJtCFiduKYfQX2J2LahdvgUZEUA");
