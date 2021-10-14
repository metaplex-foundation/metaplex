//! Program entrypoint definitions

#![cfg(all(target_arch = "bpf", not(feature = "no-entrypoint")))]

use {
    crate::{processor},
    solana_program::{
        account_info::AccountInfo, entrypoint, entrypoint::ProgramResult,
        program_error::PrintProgramError, pubkey::Pubkey,
    },
    spl_shared_metaplex::{
        error::MetaplexError,
    }
};

entrypoint!(process_instruction);
fn process_instruction<'a>(
    program_id: &'a Pubkey,
    accounts: &'a [AccountInfo<'a>],
    instruction_data: &[u8],
) -> ProgramResult {
    if let Err(error) = processor::process_instruction(program_id, accounts, instruction_data) {
        // catch the error so we can print it
        error.print::<MetaplexError>();
        return Err(error);
    }
    Ok(())
}
