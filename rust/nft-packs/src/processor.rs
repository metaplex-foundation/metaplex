//! Program state processor

use crate::instruction::NFTPacksInstruction;
use activate::activate_pack;
use borsh::BorshDeserialize;
use change_authority::{transfer_authority, AuthorityToChange};
use delete_pack::delete_pack;
use deactivate::deactivate_pack;
use edit_pack::edit_pack;
use edit_pack_card::edit_pack_card;
use init_pack::init_pack;
use prove_ownership::prove_ownership;
use solana_program::{account_info::AccountInfo, entrypoint::ProgramResult, msg, pubkey::Pubkey};

pub mod activate;
pub mod change_authority;
pub mod delete_pack;
pub mod deactivate;
pub mod edit_pack;
pub mod edit_pack_card;
pub mod edit_pack_voucher;
pub mod init_pack;
pub mod prove_ownership;

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
                msg!("Instruction: ProveOwnership");
                prove_ownership(program_id, accounts)
            }
            NFTPacksInstruction::ClaimPack => {
                msg!("");
                unimplemented!()
            }
            NFTPacksInstruction::TransferPackAuthority => {
                msg!("Instruction: TransferPackAuthority");
                transfer_authority(program_id, accounts, AuthorityToChange::PackAuthority)
            }
            NFTPacksInstruction::TransferMintingAuthority => {
                msg!("Instruction: TransferMintingAuthority");
                transfer_authority(program_id, accounts, AuthorityToChange::MintingAuthority)
            }
            NFTPacksInstruction::DeletePack => {
                msg!("Instruction: DeletePack");
                delete_pack(program_id, accounts)
            }
            NFTPacksInstruction::DeletePackCard => {
                msg!("");
                unimplemented!()
            }
            NFTPacksInstruction::DeletePackVoucher => {
                msg!("");
                unimplemented!()
            }
            NFTPacksInstruction::EditPack(args) => {
                msg!("Instruction: EditPack");
                edit_pack(program_id, accounts, args)
            }
            NFTPacksInstruction::EditPackCard(args) => {
                msg!("Instruction: EditPackCard");
                edit_pack_card(program_id, accounts, args)
            }
            NFTPacksInstruction::EditPackVoucher(args) => {
                msg!("");
                unimplemented!()
            }
        }
    }
}
