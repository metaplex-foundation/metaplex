//! Program state processor

use crate::instruction::NFTPacksInstruction;
use activate::activate_pack;
use add_card_to_pack::add_card_to_pack;
use add_voucher_to_pack::add_voucher_to_pack;
use borsh::BorshDeserialize;
use change_authority::transfer_authority;
use claim_pack::claim_pack;
use clean_up::clean_up;
use close_pack::close_pack;
use deactivate::deactivate_pack;
use delete_pack::delete_pack;
use delete_pack_card::delete_pack_card;
use delete_pack_config::delete_pack_config;
use delete_pack_voucher::delete_pack_voucher;
use edit_pack::edit_pack;
use init_pack::init_pack;
use request_card_to_redeem::request_card_for_redeem;
use solana_program::{account_info::AccountInfo, entrypoint::ProgramResult, msg, pubkey::Pubkey};

pub mod activate;
pub mod add_card_to_pack;
pub mod add_voucher_to_pack;
pub mod change_authority;
pub mod claim_pack;
pub mod clean_up;
pub mod close_pack;
pub mod deactivate;
pub mod delete_pack;
pub mod delete_pack_card;
pub mod delete_pack_config;
pub mod delete_pack_voucher;
pub mod edit_pack;
pub mod init_pack;
pub mod request_card_to_redeem;

/// Program state handler.
pub struct Processor {}
impl Processor {
    /// Processes an instruction
    pub fn process_instruction<'a>(
        program_id: &Pubkey,
        accounts: &'a [AccountInfo<'a>],
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
                msg!("Instruction: AddVoucherToPack");
                add_voucher_to_pack(program_id, accounts)
            }
            NFTPacksInstruction::Activate => {
                msg!("Instruction: Activate");
                activate_pack(program_id, accounts)
            }
            NFTPacksInstruction::Deactivate => {
                msg!("Instruction: Deactivate");
                deactivate_pack(program_id, accounts)
            }
            NFTPacksInstruction::ClosePack => {
                msg!("Instruction: ClosePack");
                close_pack(program_id, accounts)
            }
            NFTPacksInstruction::ClaimPack(args) => {
                msg!("Instruction: ClaimPack");
                claim_pack(program_id, accounts, args)
            }
            NFTPacksInstruction::TransferPackAuthority => {
                msg!("Instruction: TransferPackAuthority");
                transfer_authority(program_id, accounts)
            }
            NFTPacksInstruction::DeletePack => {
                msg!("Instruction: DeletePack");
                delete_pack(program_id, accounts)
            }
            NFTPacksInstruction::DeletePackCard => {
                msg!("Instruction: DeletePackCard");
                delete_pack_card(program_id, accounts)
            }
            NFTPacksInstruction::DeletePackVoucher => {
                msg!("Instruction: DeletePackVoucher");
                delete_pack_voucher(program_id, accounts)
            }
            NFTPacksInstruction::EditPack(args) => {
                msg!("Instruction: EditPack");
                edit_pack(program_id, accounts, args)
            }
            NFTPacksInstruction::RequestCardForRedeem(args) => {
                msg!("Instruction: RequestCardForRedeem");
                request_card_for_redeem(program_id, accounts, args)
            }
            NFTPacksInstruction::CleanUp => {
                msg!("Instruction: CleanUp");
                clean_up(program_id, accounts)
            }
            NFTPacksInstruction::DeletePackConfig => {
                msg!("Instruction: DeletePackConfig");
                delete_pack_config(program_id, accounts)
            }
        }
    }
}
