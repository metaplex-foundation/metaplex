//! Program state processor

use crate::instruction::NFTPacksInstruction;
use activate::activate_pack;
use borsh::BorshDeserialize;
use claim_pack::claim_pack;
use deactivate::deactivate_pack;
use delete_pack_card::delete_pack_card;
use init_pack::init_pack;
use solana_program::{account_info::AccountInfo, entrypoint::ProgramResult, msg, pubkey::Pubkey};

pub mod activate;
pub mod claim_pack;
pub mod deactivate;
pub mod delete_pack_card;
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
                msg!("Instruction: Activate");
                activate_pack(program_id, accounts)
            }
            NFTPacksInstruction::Deactivate => {
                msg!("Instruction: Deactivate");
                deactivate_pack(program_id, accounts)
            }
            NFTPacksInstruction::ProveOwnership => {
                msg!("");
                unimplemented!()
            }
            NFTPacksInstruction::ClaimPack => {
                msg!("Instruction: ClaimPack");
                claim_pack(program_id, accounts)
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
                msg!("Instruction: DeletePackCard");
                delete_pack_card(program_id, accounts)
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
