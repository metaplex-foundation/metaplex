#![allow(warnings)]

mod utils;

pub mod entrypoint;
pub mod errors;
pub mod instruction;
pub mod processor;

/// Prefix used in PDA derivations to avoid collisions with other programs.
pub const PREFIX: &str = "auction";
pub const EXTENDED: &str = "extended";
pub const BIDDER_POT_TOKEN: &str = "bidder_pot_token";
//solana_program::declare_id!("auctxRXPeJoc4817jDhf4HbjnhEcr1cCXenosMhK5R8");
solana_program::declare_id!("6BXwYfijsyvhm2XKe5uqnDXVNdBV3syRDesELmAsqs15");
