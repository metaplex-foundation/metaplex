//! Instruction types

use crate::state::InitPackSetParams;
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    instruction::{AccountMeta, Instruction},
    program_error::ProgramError,
    pubkey::Pubkey,
    sysvar,
};

use crate::{find_pack_card_program_address, state::ProbabilityType};

/// Instruction definition
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub enum NFTPacksInstruction {
    /// InitPack
    ///
    /// Initialize created account.
    ///
    /// Accounts:
    /// - write                          pack_set
    /// - signer                         authority
    /// - read                           minting_authority
    /// - read                           Rent account
    ///
    /// Parameters:
    /// - name	[u8; 32]
    /// - total_packs	u32
    /// - mutable	bool
    InitPack(InitPackSetParams),

    /// AddCardToPack
    ///
    /// Creates new account with PackCard structure and program token account which will hold MasterEdition token.
    /// Also admin points how many items of this specific MasterEdition will be in the pack. Check MasterEdition for V2.
    ///
    /// Accounts:
    /// - read, write                   pack_set
    /// - write                         pack_card (PDA, [pack, 'card', index])
    /// - signer                        authority
    /// - read                          master_edition
    /// - read                          master_metadata
    /// - write                         token_account (program account to hold MasterEdition token)
    ///
    /// Parameters:
    /// - max_supply	Option<u32>
    /// - probability_type	enum[fixed number, probability based]
    /// - probability	u64
    AddCardToPack {
        /// How many instances of this card exists in all packs
        max_supply: Option<u32>,
        /// Fixed number / probability-based
        probability_type: ProbabilityType,
        /// Based on above property it's fixed number to receive or probability
        probability: u64,
    },

    /// AddVoucherToPack
    ///
    /// Creates new account with PackVoucher structure, saves there data about NFTs which user has to provide to open the pack.
    /// Check MasterEdition for V2.
    ///
    /// Accounts:
    /// - read, write                   pack_set
    /// - write                         pack_voucher (PDA, [pack, 'voucher', index])
    /// - signer                        authority
    /// - read                          master_edition
    /// - read                          master_metadata
    /// - write                         token_account (program account to hold MasterEdition token)
    ///
    /// Parameters:
    /// - max_supply	Option<u32>
    /// - number_to_open	u32
    /// - action_on_prove	enum[burn, redeem]
    AddVoucherToPack,

    /// Activate
    ///
    /// Pack authority call this instruction to activate pack, means close for changing.
    ///
    /// Accounts:
    /// - write            pack_set
    /// - signer           authority
    Activate,

    /// Deactivate
    ///
    /// Forbid users prove vouchers ownership and claiming.
    ///
    /// Accounts:
    /// - write            pack_set
    /// - signer           authority
    Deactivate,

    /// ProveOwnership
    ///
    /// Creates account with ProvingProcess structure if it's not created yet.
    /// This instruction receives PackSet, PackCard and PackVoucher among with user's token account and check if it's voucher MasterEdition,
    /// if so transfer(or burn) token from user to program token account,
    /// increment proved_voucher_editions value and proved_vouchers if only one token was required or wait until all the tokens from
    /// specific voucher are received and then increment it.
    ///
    /// Accounts:
    /// - read             pack_set
    /// - write            proving_process (PDA, [pack, 'proving', user_wallet])
    /// - signer           user_wallet
    /// - read             pack_voucher (PDA, [pack, 'voucher', index])
    /// - read             master_metadata
    /// - write            user_token_acc (account with edition token)
    ProveOwnership,

    /// ClaimPack
    ///
    /// Call this instruction with ProvingProcess and PackCard accounts and program among with random oracle will transfer
    /// MasterEdition to user account or return empty response depends successfully or not user open pack with specific MasterEdition.
    ///
    /// Accounts:
    /// - read              pack_set
    /// - read, write       proving_process (PDA, [pack, 'proving', user_wallet])
    /// - signer            user_wallet
    /// - read, write       pack_card (PDA, [pack, 'card', index])
    /// - write             user_token_acc (user token account ot hold new minted edition)
    ClaimPack,

    /// TransferAuthority
    ///
    /// Change either usual authority or mint authority.
    ///
    /// Accounts:
    /// - write            pack_set
    /// - signer           current_authority
    /// - read             new_authority
    ///
    /// Parameters:
    /// - authority_type enum[pack, minting]
    TransferAuthority,

    /// DeletePack
    ///
    /// Transfer all the SOL from pack set account to refunder account and thus remove it.
    ///
    /// Accounts:
    /// - write            pack_set
    /// - signer           authority
    /// - write            refunder
    DeletePack,

    /// DeletePackCard
    ///
    /// Transfer all the SOL from pack card account to refunder account and thus remove it.
    /// Also transfer master token to new owner.
    ///
    /// Accounts:
    /// - write            pack_set
    /// - write            pack_card
    /// - signer           authority
    /// - write            refunder
    /// - write            new_master_edition_owner
    DeletePackCard,

    /// DeletePackVoucher
    ///
    /// Transfer all the SOL from pack voucher account to refunder account and thus remove it.
    /// Also transfer master token to new owner.
    ///
    /// Accounts:
    /// - write            pack_set
    /// - write            pack_voucher
    /// - signer           authority
    /// - write            refunder
    /// - write            new_master_edition_owner
    DeletePackVoucher,

    /// EditPack
    ///
    /// Edit pack data.
    ///
    /// Accounts:
    /// - write            pack_set
    /// - signer           authority
    ///
    /// Parameters:
    /// - name Option<[u8; 32]>
    /// - total_packs Option<u32>
    /// mutable	Option<bool> (only can be changed from true to false)
    EditPack,

    /// EditPackCard
    ///
    /// Edit pack card data.
    ///
    /// Accounts:
    /// - read             pack_set
    /// - signer           authority
    /// - write            pack_card
    ///
    /// Parameters:
    /// - card_index (to link it with pack set)
    /// - max_supply	Option<u32>
    /// - probability_type	Option<enum[fixed number, probability based]>
    /// - probability	Option<u64>
    EditPackCard,

    /// EditPackVoucher
    ///
    /// Edit pack voucher data
    ///
    /// Accounts:
    /// - read             pack_set
    /// - signer           authority
    /// - write            pack_voucher
    ///
    /// Parameters:
    /// - voucher_index (to link it with pack set)
    /// - max_supply Option<u32>
    /// - number_to_open Option<u32>
    /// - action_on_prove Option<enum[burn, redeem]>
    EditPackVoucher,
}

/// Create `InitPack` instruction
pub fn init_pack(
    program_id: &Pubkey,
    pack_set: &Pubkey,
    authority: &Pubkey,
    minting_authority: &Pubkey,
    args: InitPackSetParams,
) -> Instruction {
    let accounts = vec![
        AccountMeta::new(*pack_set, false),
        AccountMeta::new_readonly(*authority, true),
        AccountMeta::new_readonly(*minting_authority, false),
        AccountMeta::new_readonly(sysvar::rent::id(), false),
    ];

    Instruction::new_with_borsh(*program_id, &NFTPacksInstruction::InitPack(args), accounts)
}

/// Creates 'AddCardToPack' instruction.
#[allow(clippy::too_many_arguments)]
pub fn add_cart_to_pack(
    program_id: &Pubkey,
    pack_set: &Pubkey,
    authority: &Pubkey,
    master_edition: &Pubkey,
    master_metadata: &Pubkey,
    token_account: &Pubkey,
    max_supply: Option<u32>,
    probability_type: ProbabilityType,
    probability: u64,
    index: u32,
) -> Instruction {
    let (pack_card, _) = find_pack_card_program_address(program_id, pack_set, index);

    let accounts = vec![
        AccountMeta::new(*pack_set, false),
        AccountMeta::new(pack_card, false),
        AccountMeta::new_readonly(*authority, true),
        AccountMeta::new_readonly(*master_edition, false),
        AccountMeta::new_readonly(*master_metadata, false),
        AccountMeta::new(*token_account, false),
        AccountMeta::new_readonly(spl_token::id(), false),
    ];

    Instruction::new_with_borsh(
        *program_id,
        &NFTPacksInstruction::AddCardToPack {
            max_supply,
            probability_type,
            probability,
        },
        accounts,
    )
}
