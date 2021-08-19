//! Program state processor

use crate::{error::NFTPacksError, instruction::NFTPacksInstruction};
use borsh::BorshDeserialize;
use init_pack::init_pack;
use solana_program::{
    account_info::next_account_info, account_info::AccountInfo, entrypoint::ProgramResult, msg,
    pubkey::Pubkey,
};

pub mod init_pack;

/// Program state handler.
pub struct Processor {}
impl Processor {
    /// Processes an instruction
    pub fn process_instruction(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        input: &[u8],
    ) -> ProgramResult {
        let instruction = NFTPacksInstruction::try_from_slice(input)?;
        match instruction {
            NFTPacksInstruction::InitPack(args) => {
                msg!("Instruction: InitPack");
                init_pack(program_id, accounts, args)
            }
            NFTPacksInstruction::AddCardToPack => {
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
