//! Instruction types
#![allow(missing_docs)]

use crate::{
    find_pack_card_program_address, find_pack_config_program_address,
    find_pack_voucher_program_address, find_program_authority,
    find_proving_process_program_address, state::PackDistributionType,
};
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    system_program, sysvar,
};

#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct AddCardToPackArgs {
    /// How many editions of this card will exists in pack
    pub max_supply: u32,
    /// Probability value, required only if PackSet distribution type == Fixed
    pub weight: u16,
    /// Index
    pub index: u32,
}

/// Initialize a PackSet arguments
#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct InitPackSetArgs {
    /// Name
    pub name: [u8; 32],
    /// Description
    pub description: String,
    /// Pack set preview image
    pub uri: String,
    /// If true authority can make changes at deactivated phase
    pub mutable: bool,
    /// Distribution type
    pub distribution_type: PackDistributionType,
    /// Allowed amount to redeem
    pub allowed_amount_to_redeem: u32,
    /// Redeem start date, if not filled set current timestamp
    pub redeem_start_date: Option<u64>,
    /// Redeem end date
    pub redeem_end_date: Option<u64>,
}

/// Edit a PackSet arguments
#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct EditPackSetArgs {
    /// Name
    pub name: Option<[u8; 32]>,
    /// Description
    pub description: Option<String>,
    /// URI
    pub uri: Option<String>,
    /// If true authority can make changes at deactivated phase
    pub mutable: Option<bool>,
}

/// Claim card from pack
#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct ClaimPackArgs {
    /// Card index
    pub index: u32,
}

/// Request card to redeem arguments
#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct RequestCardToRedeemArgs {
    /// Voucher index
    pub index: u32,
}

/// Instruction definition
#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub enum NFTPacksInstruction {
    /// InitPack
    ///
    /// Initialize created account.
    ///
    /// Accounts:
    /// - write                          pack_set
    /// - signer                         authority
    /// - read                           store
    /// - read                           Rent account
    /// - read                           Clock account
    /// - read                           whitelisted_creator. Optional key
    ///
    /// Parameters:
    /// - name	[u8; 32]
    /// - description String
    /// - URI String
    /// - mutable	bool
    /// - distribution_type    DistributionType
    /// - allowed_amount_to_redeem    u32
    /// - redeem_start_date    Option<u64>
    /// - redeem_end_date    Option<u64>
    InitPack(InitPackSetArgs),

    /// AddCardToPack
    ///
    /// Creates new account with PackCard structure and program token account which will hold MasterEdition token.
    /// Also admin points how many items of this specific MasterEdition will be in the pack. Check MasterEdition for V2.
    ///
    /// Accounts:
    /// - read, write                   pack_set
    /// - write                         pack_config (PDA, ['config', pack])
    /// - write                         pack_card (PDA, ['card', pack, index])
    /// - signer                        authority
    /// - read                          master_edition
    /// - read                          master_metadata
    /// - read                          mint
    /// - write                         source
    /// - write                         token_account (program account to hold MasterEdition token)
    /// - read                          program_authority
    /// - read                          store
    /// - read                          rent
    /// - read                          system_program
    /// - read                          spl_token program
    ///
    /// Parameters:
    /// - max_supply	Option<u32>
    /// - probability_type	enum[fixed number, probability based]
    /// - probability	u64
    AddCardToPack(AddCardToPackArgs),

    /// AddVoucherToPack
    ///
    /// Creates new account with PackVoucher structure, saves there data about NFTs which user has to provide to open the pack.
    /// Check MasterEdition for V2.
    ///
    /// Accounts:
    /// - read, write                   pack_set
    /// - write                         pack_voucher (PDA, ['voucher', pack, index])
    /// - signer, write                 authority
    /// - signer, read                  voucher_owner
    /// - read                          master_edition
    /// - read                          master_metadata
    /// - read                          mint
    /// - write                         source
    /// - read                          store
    /// - read                          rent
    /// - read                          system_program
    /// - read                          spl_token program
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

    /// Close the pack
    ///
    /// Set pack state to "ended", irreversible operation
    ///
    /// Accounts:
    /// - write            pack_set
    /// - signer           authority
    /// - read             clock
    ClosePack,

    /// ClaimPack
    ///
    /// Call this instruction with ProvingProcess and PackCard accounts and program will transfer
    /// MasterEdition to user account or return empty response depends successfully or not user open pack with specific MasterEdition.
    ///
    /// Accounts:
    /// - read              pack_set
    /// - read, write       proving_process (PDA, ['proving', pack, user_wallet])
    /// - signer            user_wallet
    /// - read, write       pack_card (PDA, ['card', pack, index])
    /// - write             user_token_acc (user token account ot hold new minted edition)
    /// - read              new_metadata_acc
    /// - read              new_edition_acc
    /// - read              master_edition_acc
    /// - read              new_mint_account
    /// - signer            new_mint_authority_acc
    /// - read              metadata_acc
    /// - read              metadata_mint_acc
    /// - read              edition_acc
    /// - read              rent program
    /// - read              mpl_token_metadata program
    /// - read              spl_token program
    /// - read              system program
    ///
    /// Parameters:
    /// - index             u32
    ClaimPack(ClaimPackArgs),

    /// TransferPackAuthority
    ///
    /// Change pack authority.
    ///
    /// Accounts:
    /// - write            pack_set
    /// - signer           current_authority
    /// - read             new_authority
    TransferPackAuthority,

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
    /// - write            token_account
    /// - read             program_authority
    /// - read             rent
    /// - read             spl_token program
    DeletePackCard,

    /// DeletePackVoucher
    ///
    /// Transfer all the SOL from pack voucher account to refunder account and thus remove it.
    ///
    /// Accounts:
    /// - write            pack_set
    /// - write            pack_voucher
    /// - signer           authority
    /// - write            refunder
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
    /// - description Option<String>
    /// - URI Option<String>
    /// - mutable	Option<bool> (only can be changed from true to false)
    EditPack(EditPackSetArgs),

    /// RequestCardForRedeem
    ///
    /// Count card index which user can redeem next
    ///
    /// Accounts:
    /// - read                     pack_set
    /// - read, write              pack_config (PDA, ['config', pack])
    /// - read                     store
    /// - read                     edition
    /// - read                     edition_mint
    /// - read                     pack_voucher
    /// - read, write              proving_process (PDA, ['proving', pack, user_wallet])
    /// - signer                   user_wallet
    /// - read                     recent_slothashes
    /// - read                     clock
    /// - read                     rent
    /// - read                     system_program
    /// - read                     user_token_account optional
    ///
    /// Parameters:
    /// - index    u32
    RequestCardForRedeem(RequestCardToRedeemArgs),

    /// CleanUp
    ///
    /// Sorts weights of all the cards and removes exhausted
    ///
    /// Accounts:
    /// - read                     pack_set
    /// - read, write              pack_config (PDA, ['config', pack])
    CleanUp,

    /// Delete PackConfig account
    ///
    /// Transfer all the SOL from pack card account to refunder account and thus remove it.
    ///
    /// Accounts:
    /// - read                pack_set
    /// - write               pack_config (PDA, ['config', pack])
    /// - write               refunder
    /// - signer              authority
    DeletePackConfig,
}

/// Create `InitPack` instruction
pub fn init_pack(
    program_id: &Pubkey,
    pack_set: &Pubkey,
    authority: &Pubkey,
    store: &Pubkey,
    whitelisted_creator: &Pubkey,
    args: InitPackSetArgs,
) -> Instruction {
    let accounts = vec![
        AccountMeta::new(*pack_set, false),
        AccountMeta::new_readonly(*authority, true),
        AccountMeta::new_readonly(*store, false),
        AccountMeta::new_readonly(sysvar::rent::id(), false),
        AccountMeta::new_readonly(sysvar::clock::id(), false),
        AccountMeta::new_readonly(*whitelisted_creator, false),
    ];

    Instruction::new_with_borsh(*program_id, &NFTPacksInstruction::InitPack(args), accounts)
}

/// Creates 'AddCardToPack' instruction.
#[allow(clippy::too_many_arguments)]
pub fn add_card_to_pack(
    program_id: &Pubkey,
    pack_set: &Pubkey,
    authority: &Pubkey,
    master_edition: &Pubkey,
    master_metadata: &Pubkey,
    mint: &Pubkey,
    source: &Pubkey,
    token_account: &Pubkey,
    store: &Pubkey,
    args: AddCardToPackArgs,
) -> Instruction {
    let (program_authority, _) = find_program_authority(program_id);
    let (pack_card, _) = find_pack_card_program_address(program_id, pack_set, args.index);
    let (pack_config, _) = find_pack_config_program_address(program_id, pack_set);

    let accounts = vec![
        AccountMeta::new(*pack_set, false),
        AccountMeta::new(pack_config, false),
        AccountMeta::new(pack_card, false),
        AccountMeta::new(*authority, true),
        AccountMeta::new_readonly(*master_edition, false),
        AccountMeta::new_readonly(*master_metadata, false),
        AccountMeta::new_readonly(*mint, false),
        AccountMeta::new(*source, false),
        AccountMeta::new(*token_account, false),
        AccountMeta::new(program_authority, false),
        AccountMeta::new_readonly(*store, false),
        AccountMeta::new_readonly(sysvar::rent::id(), false),
        AccountMeta::new_readonly(system_program::id(), false),
        AccountMeta::new_readonly(spl_token::id(), false),
    ];

    Instruction::new_with_borsh(
        *program_id,
        &NFTPacksInstruction::AddCardToPack(args),
        accounts,
    )
}

/// Creates `AddVoucherToPack` instruction
#[allow(clippy::too_many_arguments)]
pub fn add_voucher_to_pack(
    program_id: &Pubkey,
    pack_set: &Pubkey,
    pack_voucher: &Pubkey,
    authority: &Pubkey,
    voucher_owner: &Pubkey,
    master_edition: &Pubkey,
    master_metadata: &Pubkey,
    mint: &Pubkey,
    source: &Pubkey,
    store: &Pubkey,
) -> Instruction {
    let accounts = vec![
        AccountMeta::new(*pack_set, false),
        AccountMeta::new(*pack_voucher, false),
        AccountMeta::new(*authority, true),
        AccountMeta::new_readonly(*voucher_owner, true),
        AccountMeta::new_readonly(*master_edition, false),
        AccountMeta::new_readonly(*master_metadata, false),
        AccountMeta::new_readonly(*mint, false),
        AccountMeta::new(*source, false),
        AccountMeta::new_readonly(*store, false),
        AccountMeta::new_readonly(sysvar::rent::id(), false),
        AccountMeta::new_readonly(system_program::id(), false),
        AccountMeta::new_readonly(spl_token::id(), false),
    ];

    Instruction::new_with_borsh(
        *program_id,
        &NFTPacksInstruction::AddVoucherToPack,
        accounts,
    )
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

/// Create `ClosePack` instruction
pub fn close_pack(program_id: &Pubkey, pack_set: &Pubkey, authority: &Pubkey) -> Instruction {
    let accounts = vec![
        AccountMeta::new(*pack_set, false),
        AccountMeta::new_readonly(*authority, true),
        AccountMeta::new_readonly(sysvar::clock::id(), false),
    ];

    Instruction::new_with_borsh(*program_id, &NFTPacksInstruction::ClosePack, accounts)
}

/// Create `ClaimPack` instruction
#[allow(clippy::too_many_arguments)]
pub fn claim_pack(
    program_id: &Pubkey,
    pack_set: &Pubkey,
    user_wallet: &Pubkey,
    voucher_mint: &Pubkey,
    user_token: &Pubkey,
    new_metadata: &Pubkey,
    new_edition: &Pubkey,
    master_edition: &Pubkey,
    new_mint: &Pubkey,
    new_mint_authority: &Pubkey,
    metadata: &Pubkey,
    metadata_mint: &Pubkey,
    index: u32,
) -> Instruction {
    let (proving_process, _) =
        find_proving_process_program_address(program_id, pack_set, user_wallet, voucher_mint);
    let (pack_card, _) = find_pack_card_program_address(program_id, pack_set, index);
    let (program_authority, _) = find_program_authority(program_id);

    let edition_number = (index as u64)
        .checked_div(mpl_token_metadata::state::EDITION_MARKER_BIT_SIZE)
        .unwrap();
    let as_string = edition_number.to_string();
    let (edition_mark_pda, _) = Pubkey::find_program_address(
        &[
            mpl_token_metadata::state::PREFIX.as_bytes(),
            mpl_token_metadata::id().as_ref(),
            metadata_mint.as_ref(),
            mpl_token_metadata::state::EDITION.as_bytes(),
            as_string.as_bytes(),
        ],
        &mpl_token_metadata::id(),
    );

    let accounts = vec![
        AccountMeta::new_readonly(*pack_set, false),
        AccountMeta::new(proving_process, false),
        AccountMeta::new(*user_wallet, true),
        AccountMeta::new_readonly(program_authority, false),
        AccountMeta::new(pack_card, false),
        AccountMeta::new(*user_token, false),
        AccountMeta::new(*new_metadata, false),
        AccountMeta::new(*new_edition, false),
        AccountMeta::new(*master_edition, false),
        AccountMeta::new(*new_mint, false),
        AccountMeta::new(*new_mint_authority, true),
        AccountMeta::new(*metadata, false),
        AccountMeta::new(*metadata_mint, false),
        AccountMeta::new(edition_mark_pda, false),
        AccountMeta::new_readonly(sysvar::rent::id(), false),
        AccountMeta::new_readonly(mpl_token_metadata::id(), false),
        AccountMeta::new_readonly(spl_token::id(), false),
        AccountMeta::new_readonly(system_program::id(), false),
    ];

    Instruction::new_with_borsh(
        *program_id,
        &NFTPacksInstruction::ClaimPack(ClaimPackArgs { index }),
        accounts,
    )
}

/// Create `TransferPackAuthority` instruction
pub fn transfer_pack_authority(
    program_id: &Pubkey,
    pack_set: &Pubkey,
    authority: &Pubkey,
    new_authority: &Pubkey,
) -> Instruction {
    let accounts = vec![
        AccountMeta::new(*pack_set, false),
        AccountMeta::new_readonly(*authority, true),
        AccountMeta::new_readonly(*new_authority, false),
    ];

    Instruction::new_with_borsh(
        *program_id,
        &NFTPacksInstruction::TransferPackAuthority,
        accounts,
    )
}

/// Create `DeletePack` instruction
pub fn delete_pack(
    program_id: &Pubkey,
    pack_set: &Pubkey,
    authority: &Pubkey,
    refunder: &Pubkey,
) -> Instruction {
    let accounts = vec![
        AccountMeta::new(*pack_set, false),
        AccountMeta::new_readonly(*authority, true),
        AccountMeta::new(*refunder, false),
    ];

    Instruction::new_with_borsh(*program_id, &NFTPacksInstruction::DeletePack, accounts)
}

/// Create `DeletePackCard` instruction
pub fn delete_pack_card(
    program_id: &Pubkey,
    pack_set: &Pubkey,
    pack_card: &Pubkey,
    authority: &Pubkey,
    refunder: &Pubkey,
    new_master_edition_owner: &Pubkey,
    token_account: &Pubkey,
) -> Instruction {
    let (program_authority, _) = find_program_authority(program_id);

    let accounts = vec![
        AccountMeta::new(*pack_set, false),
        AccountMeta::new(*pack_card, false),
        AccountMeta::new_readonly(*authority, true),
        AccountMeta::new(*refunder, false),
        AccountMeta::new(*new_master_edition_owner, false),
        AccountMeta::new(*token_account, false),
        AccountMeta::new_readonly(program_authority, false),
        AccountMeta::new_readonly(sysvar::rent::id(), false),
        AccountMeta::new_readonly(spl_token::id(), false),
    ];

    Instruction::new_with_borsh(*program_id, &NFTPacksInstruction::DeletePackCard, accounts)
}

/// Create `DeletePackVoucher` instruction
pub fn delete_pack_voucher(
    program_id: &Pubkey,
    pack_set: &Pubkey,
    pack_voucher: &Pubkey,
    authority: &Pubkey,
    refunder: &Pubkey,
) -> Instruction {
    let accounts = vec![
        AccountMeta::new(*pack_set, false),
        AccountMeta::new(*pack_voucher, false),
        AccountMeta::new_readonly(*authority, true),
        AccountMeta::new(*refunder, false),
    ];

    Instruction::new_with_borsh(
        *program_id,
        &NFTPacksInstruction::DeletePackVoucher,
        accounts,
    )
}

/// Create `EditPack` instruction
pub fn edit_pack(
    program_id: &Pubkey,
    pack_set: &Pubkey,
    authority: &Pubkey,
    args: EditPackSetArgs,
) -> Instruction {
    let accounts = vec![
        AccountMeta::new(*pack_set, false),
        AccountMeta::new_readonly(*authority, true),
    ];

    Instruction::new_with_borsh(*program_id, &NFTPacksInstruction::EditPack(args), accounts)
}

/// Create `RequestCardForRedeem` instruction
#[allow(clippy::too_many_arguments)]
pub fn request_card_for_redeem(
    program_id: &Pubkey,
    pack_set: &Pubkey,
    store: &Pubkey,
    edition: &Pubkey,
    edition_mint: &Pubkey,
    user_wallet: &Pubkey,
    user_token_acc: &Option<Pubkey>,
    index: u32,
) -> Instruction {
    let (proving_process, _) =
        find_proving_process_program_address(program_id, pack_set, user_wallet, edition_mint);

    let (pack_config, _) = find_pack_config_program_address(program_id, pack_set);

    let (pack_voucher, _) = find_pack_voucher_program_address(program_id, pack_set, index);

    let mut accounts = vec![
        AccountMeta::new(*pack_set, false),
        AccountMeta::new(pack_config, false),
        AccountMeta::new_readonly(*store, false),
        AccountMeta::new_readonly(*edition, false),
        AccountMeta::new(*edition_mint, false),
        AccountMeta::new_readonly(pack_voucher, false),
        AccountMeta::new(proving_process, false),
        AccountMeta::new(*user_wallet, true),
        AccountMeta::new_readonly(sysvar::slot_hashes::id(), false),
        AccountMeta::new_readonly(sysvar::clock::id(), false),
        AccountMeta::new_readonly(sysvar::rent::id(), false),
        AccountMeta::new_readonly(spl_token::id(), false),
        AccountMeta::new_readonly(system_program::id(), false),
    ];
    if let Some(user_token_account) = user_token_acc {
        accounts.push(AccountMeta::new(*user_token_account, false))
    }

    Instruction::new_with_borsh(
        *program_id,
        &NFTPacksInstruction::RequestCardForRedeem(RequestCardToRedeemArgs { index }),
        accounts,
    )
}

/// Create `CleanUp` instruction
#[allow(clippy::too_many_arguments)]
pub fn clean_up(program_id: &Pubkey, pack_set: &Pubkey) -> Instruction {
    let (pack_config, _) = find_pack_config_program_address(program_id, pack_set);

    let accounts = vec![
        AccountMeta::new(*pack_set, false),
        AccountMeta::new(pack_config, false),
    ];

    Instruction::new_with_borsh(*program_id, &NFTPacksInstruction::CleanUp, accounts)
}

/// Create `DeletePackConfig` instruction
pub fn delete_pack_config(
    program_id: &Pubkey,
    pack_set: &Pubkey,
    authority: &Pubkey,
    refunder: &Pubkey,
) -> Instruction {
    let (pack_config, _) = find_pack_config_program_address(program_id, pack_set);

    let accounts = vec![
        AccountMeta::new_readonly(*pack_set, false),
        AccountMeta::new(pack_config, false),
        AccountMeta::new(*refunder, false),
        AccountMeta::new_readonly(*authority, true),
    ];

    Instruction::new_with_borsh(
        *program_id,
        &NFTPacksInstruction::DeletePackConfig,
        accounts,
    )
}
