//! Instruction types

use crate::{find_pack_voucher_program_address, find_proving_process_program_address};
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    sysvar,
};

/// Initialize a PackSet arguments
#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct InitPackSetArgs {
    /// Name
    pub name: [u8; 32],
    /// How many packs are available for redeeming
    pub total_packs: u32,
    /// If true authority can make changes at deactivated phase
    pub mutable: bool,
}

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
    InitPack(InitPackSetArgs),

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
    AddCardToPack,

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

    /// TransferPackAuthority
    ///
    /// Change pack authority.
    ///
    /// Accounts:
    /// - write            pack_set
    /// - signer           current_authority
    /// - read             new_authority
    TransferPackAuthority,

    /// TransferMintingAuthority
    ///
    /// Change minting authority.
    ///
    /// Accounts:
    /// - write            pack_set
    /// - signer           current_authority
    /// - read             new_authority
    TransferMintingAuthority,

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
    args: InitPackSetArgs,
) -> Instruction {
    let accounts = vec![
        AccountMeta::new(*pack_set, false),
        AccountMeta::new_readonly(*authority, true),
        AccountMeta::new_readonly(*minting_authority, false),
        AccountMeta::new_readonly(sysvar::rent::id(), false),
    ];

    Instruction::new_with_borsh(*program_id, &NFTPacksInstruction::InitPack(args), accounts)
}

/// Create `Activate` instruction
pub fn activate(program_id: &Pubkey, pack_set: &Pubkey, authority: &Pubkey) -> Instruction {
    let accounts = vec![
        AccountMeta::new(*pack_set, false),
        AccountMeta::new_readonly(*authority, true),
    ];

    Instruction::new_with_borsh(*program_id, &NFTPacksInstruction::Activate, accounts)
}

/// Create `Deactivate` instruction
pub fn deactivate(program_id: &Pubkey, pack_set: &Pubkey, authority: &Pubkey) -> Instruction {
    let accounts = vec![
        AccountMeta::new(*pack_set, false),
        AccountMeta::new_readonly(*authority, true),
    ];

    Instruction::new_with_borsh(*program_id, &NFTPacksInstruction::Deactivate, accounts)
}

/// Create `ProveOwnership` instruction
pub fn prove_ownership(
    program_id: &Pubkey,
    pack_set: &Pubkey,
    edition_data: &Pubkey,
    edition_mint: &Pubkey,
    user_wallet: &Pubkey,
    user_token_acc: &Pubkey,
    voucher: &Pubkey,
) -> Instruction {
    let (proving_process, _) =
        find_proving_process_program_address(program_id, pack_set, user_wallet);

    let accounts = vec![
        AccountMeta::new_readonly(*pack_set, false),
        AccountMeta::new_readonly(*edition_data, false),
        AccountMeta::new(*edition_mint, false),
        AccountMeta::new(*voucher, false),
        AccountMeta::new(proving_process, false),
        AccountMeta::new_readonly(*user_wallet, true),
        AccountMeta::new(*user_token_acc, false),
        AccountMeta::new_readonly(sysvar::rent::id(), false),
    ];

    Instruction::new_with_borsh(*program_id, &NFTPacksInstruction::ProveOwnership, accounts)
}

/// Create `TransferPackAuthority` instruction
pub fn transfer_pack_authority(program_id: &Pubkey, pack_set: &Pubkey, authority: &Pubkey, new_authority: &Pubkey) -> Instruction {
    let accounts = vec![
        AccountMeta::new(*pack_set, false),
        AccountMeta::new_readonly(*authority, true),
        AccountMeta::new_readonly(*new_authority, false),
    ];

    Instruction::new_with_borsh(*program_id, &NFTPacksInstruction::TransferPackAuthority, accounts)
}

/// Create `TransferMintingAuthority` instruction
pub fn transfer_minting_authority(program_id: &Pubkey, pack_set: &Pubkey, authority: &Pubkey, new_authority: &Pubkey) -> Instruction {
    let accounts = vec![
        AccountMeta::new(*pack_set, false),
        AccountMeta::new_readonly(*authority, true),
        AccountMeta::new_readonly(*new_authority, false),
    ];

    Instruction::new_with_borsh(*program_id, &NFTPacksInstruction::TransferMintingAuthority, accounts)
}

/// Create `DeletePack` instruction
pub fn delete_pack(program_id: &Pubkey, pack_set: &Pubkey, authority: &Pubkey, refunder: &Pubkey) -> Instruction {
    let accounts = vec![
        AccountMeta::new(*pack_set, false),
        AccountMeta::new_readonly(*authority, true),
        AccountMeta::new(*refunder, false),
    ];

    Instruction::new_with_borsh(*program_id, &NFTPacksInstruction::DeletePack, accounts)
}
