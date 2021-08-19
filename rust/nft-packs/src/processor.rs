//! Program state processor

use crate::instruction::NFTPacksInstruction;
use borsh::BorshDeserialize;
use solana_program::{account_info::AccountInfo, entrypoint::ProgramResult, msg, pubkey::Pubkey};

use add_card_to_pack::*;
use init_pack::*;

pub mod add_card_to_pack;
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
            NFTPacksInstruction::AddCardToPack(args) => {
                msg!("Instruction: AddCardToPack");
                add_card_to_pack(program_id, accounts, args)
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
