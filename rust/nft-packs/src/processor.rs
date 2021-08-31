//! Program state processor

use crate::instruction::NFTPacksInstruction;
use activate::activate_pack;
use borsh::BorshDeserialize;
use change_authority::{transfer_authority, AuthorityToChange};
use claim_pack::claim_pack;
use deactivate::deactivate_pack;
use delete_pack::delete_pack;
use delete_pack_card::delete_pack_card;
use delete_pack_voucher::delete_pack_voucher;
use edit_pack::edit_pack;
use edit_pack_card::edit_pack_card;
use init_pack::init_pack;
use mint_edition::{mint_edition_with_card, mint_edition_with_voucher};
use prove_ownership::prove_ownership;
use solana_program::{account_info::AccountInfo, entrypoint::ProgramResult, msg, pubkey::Pubkey};

pub mod activate;
pub mod change_authority;
pub mod claim_pack;
pub mod deactivate;
pub mod delete_pack;
pub mod delete_pack_card;
pub mod delete_pack_voucher;
pub mod edit_pack;
pub mod edit_pack_card;
pub mod edit_pack_voucher;

use add_card_to_pack::*;

pub mod add_card_to_pack;
pub mod init_pack;
pub mod mint_edition;
pub mod prove_ownership;

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
                msg!("Instruction: ClaimPack");
                claim_pack(program_id, accounts)
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
            NFTPacksInstruction::EditPackCard(args) => {
                msg!("Instruction: EditPackCard");
                edit_pack_card(program_id, accounts, args)
            }
            NFTPacksInstruction::EditPackVoucher(args) => {
                msg!("");
                unimplemented!()
            }
            NFTPacksInstruction::MintEditionWithCard => {
                msg!("Instruction: MintEditionWithCard");
                mint_edition_with_card(program_id, accounts)
            }
            NFTPacksInstruction::MintEditionWithVoucher => {
                msg!("Instruction: MintEditionWithVoucher");
                mint_edition_with_voucher(program_id, accounts)
            }
        }
    }
}
