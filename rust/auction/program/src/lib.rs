#![allow(warnings)]

mod utils;

pub mod entrypoint;
pub mod errors;
pub mod instruction;
pub mod processor;

/// Prefix used in PDA derivations to avoid collisions with other programs.
pub const PREFIX: &str = "auction";

pub const EXTENDED: &str = "extended";
solana_program::declare_id!("gamEmNd1VwNdaKtJwxA1beyKiFmJgVsrR8vjEzG24PP");
