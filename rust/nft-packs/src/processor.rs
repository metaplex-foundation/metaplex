//! Program state processor

use crate::{error::NFTPacksError, instruction::NFTPacksInstruction};
use borsh::BorshDeserialize;
use solana_program::{
    account_info::next_account_info, account_info::AccountInfo, entrypoint::ProgramResult, msg,
    pubkey::Pubkey,
};

/// Program state handler.
pub struct Processor {}
impl Processor {
    /// Process example instruction
    pub fn process_example_instruction(
        _program_id: &Pubkey,
        accounts: &[AccountInfo],
    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let _example_account_info = next_account_info(account_info_iter)?;

        Ok(())
    }

    /// Processes an instruction
    pub fn process_instruction(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        input: &[u8],
    ) -> ProgramResult {
        let instruction = NFTPacksInstruction::try_from_slice(input)?;
        match instruction {
            NFTPacksInstruction::ExampleInstruction => {
                msg!("Instruction: ExampleInstruction");
                Self::process_example_instruction(program_id, accounts)
            }
            NFTPacksInstruction::InitPack => {
                msg!("");
                unimplemented!()
            }
            NFTPacksInstruction::AddCardToPack {
                max_supply,
                probability_type,
                probability,
            } => {
                msg!("");
                unimplemented!()
            }
            NFTPacksInstruction::AddVoucherToPack => {
                msg!("");
                unimplemented!()
            }
            NFTPacksInstruction::Activate => {
                msg!("");
                unimplemented!()
            }
            NFTPacksInstruction::Deactivate => {
                msg!("");
                unimplemented!()
            }
            NFTPacksInstruction::ProveOwnership => {
                msg!("");
                unimplemented!()
            }
            NFTPacksInstruction::ClaimPack => {
                msg!("");
                unimplemented!()
            }
            NFTPacksInstruction::TransferAuthority => {
                msg!("");
                unimplemented!()
            }
            NFTPacksInstruction::DeletePack => {
                msg!("");
                unimplemented!()
            }
            NFTPacksInstruction::DeletePackCard => {
                msg!("");
                unimplemented!()
            }
            NFTPacksInstruction::DeletePackVoucher => {
                msg!("");
                unimplemented!()
            }
            NFTPacksInstruction::EditPack => {
                msg!("");
                unimplemented!()
            }
            NFTPacksInstruction::EditPackCard => {
                msg!("");
                unimplemented!()
            }
            NFTPacksInstruction::EditPackVoucher => {
                msg!("");
                unimplemented!()
            }
        }
    }
}
