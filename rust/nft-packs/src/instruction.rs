//! Instruction types
#![allow(missing_docs)]

use crate::{
    find_pack_card_program_address, find_program_authority, find_proving_process_program_address,
    state::{ActionOnProve, PackDistributionType},
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
    pub max_supply: Option<u32>,
    /// Probability value, required only if PackSet distribution type == Fixed
    pub probability: Option<u16>,
    /// Index
    pub index: u32,
}

#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct AddVoucherToPackArgs {
    /// How many vouchers of this type is required to open a pack
    pub number_to_open: u32,
    /// Burn / Redeem
    pub action_on_prove: ActionOnProve,
}

/// Initialize a PackSet arguments
#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct InitPackSetArgs {
    /// Name
    pub name: [u8; 32],
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
    /// If true authority can make changes at deactivated phase
    pub mutable: Option<bool>,
}

/// Edit a PackVoucher arguments
#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct EditPackVoucherArgs {
    /// How many vouchers of this type is required to open a pack
    pub number_to_open: Option<u32>,
    /// Burn / redeem
    pub action_on_prove: Option<ActionOnProve>,
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
    /// - read                           minting_authority
    /// - read                           Rent account
    /// - read                           Clock account
    ///
    /// Parameters:
    /// - name	[u8; 32]
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
    /// - write                         pack_card (PDA, [pack, 'card', index])
    /// - signer                        authority
    /// - read                          master_edition
    /// - read                          master_metadata
    /// - read                          mint
    /// - write                         source
    /// - write                         token_account (program account to hold MasterEdition token)
    /// - read                          program_authority
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
    /// - write                         pack_voucher (PDA, [pack, 'voucher', index])
    /// - signer, write                 authority
    /// - read                          master_edition
    /// - read                          master_metadata
    /// - read                          mint
    /// - write                         source
    /// - write                         token_account (program account to hold MasterEdition token)
    /// - read                          program_authority
    /// - read                          rent
    /// - read                          system_program
    /// - read                          spl_token program
    ///
    /// Parameters:
    /// - max_supply	Option<u32>
    /// - number_to_open	u32
    /// - action_on_prove	enum[burn, redeem]
    AddVoucherToPack(AddVoucherToPackArgs),

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
    /// - read             edition_data
    /// - write            edition_mint
    /// - write            voucher (PDA, [pack, 'voucher', index])
    /// - write            proving_process (PDA, [pack, 'proving', user_wallet])
    /// - signer           user_wallet
    /// - write            user_token_acc (account with edition token)
    /// - read             rent
    /// - read             spl_token program
    /// - read             system_program
    ProveOwnership,

    /// ClaimPack
    ///
    /// Call this instruction with ProvingProcess and PackCard accounts and program among with random oracle will transfer
    /// MasterEdition to user account or return empty response depends successfully or not user open pack with specific MasterEdition.
    ///
    /// Accounts:
    /// - read, write       pack_set
    /// - read, write       proving_process (PDA, [pack, 'proving', user_wallet])
    /// - signer            user_wallet
    /// - read, write       pack_card (PDA, [pack, 'card', index])
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
    /// - read              randomness oracle account
    /// - read              spl_token_metadata program
    /// - read              spl_token program
    /// - read              system program
    /// - read              clock program
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
    /// - write            token_account
    /// - read             program_authority
    /// - read             rent
    /// - read             spl_token program
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
    /// - write            token_account
    /// - read             program_authority
    /// - read             rent
    /// - read             spl_token program
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
    /// - mutable	Option<bool> (only can be changed from true to false)
    EditPack(EditPackSetArgs),

    /// EditPackVoucher
    ///
    /// Edit pack voucher data
    ///
    /// Accounts:
    /// - read             pack_set
    /// - signer           authority
    /// - write            pack_voucher
    /// - read             voucher_master
    ///
    /// Parameters:
    /// - number_to_open Option<u32>
    /// - action_on_prove Option<enum[burn, redeem]>
    EditPackVoucher(EditPackVoucherArgs),

    /// MintEditionWithVoucher
    ///
    /// Mint new editions from voucher master edition
    ///
    /// Accounts:
    /// - read                     pack_set
    /// - signer                   minting_authority
    /// - write                    pack_voucher
    /// - write                    new_metadata
    /// - write                    new_edition
    /// - write                    master_edition
    /// - write                    new_mint
    /// - signer                   new_mint_authority
    /// - signer                   payer
    /// - signer                   token_account_owner
    /// - read                     token_account
    /// - read                     new_metadata_update_authority
    /// - read                     metadata
    /// - read                     metadata_mint
    /// - write                    edition_mark_pda
    /// - read                     spl_token program
    /// - read                     system_program
    /// - read                     rent
    /// - read                     spl_token_metadata program
    MintEditionWithVoucher,

    /// RequestCardForRedeem
    ///
    /// Count card index which user can redeem next
    ///
    /// Accounts:
    /// - read                     pack_set
    /// - read, write              proving_process (PDA, [pack, 'proving', user_wallet])
    /// - signer                   user_wallet
    /// - read                     randomness_oracle
    /// - read                     clock
    RequestCardForRedeem,
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
        AccountMeta::new_readonly(sysvar::clock::id(), false),
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
    args: AddCardToPackArgs,
) -> Instruction {
    let (program_authority, _) = find_program_authority(program_id);
    let (pack_card, _) = find_pack_card_program_address(program_id, pack_set, args.index);

    let accounts = vec![
        AccountMeta::new(*pack_set, false),
        AccountMeta::new(pack_card, false),
        AccountMeta::new(*authority, true),
        AccountMeta::new_readonly(*master_edition, false),
        AccountMeta::new_readonly(*master_metadata, false),
        AccountMeta::new_readonly(*mint, false),
        AccountMeta::new(*source, false),
        AccountMeta::new(*token_account, false),
        AccountMeta::new(program_authority, false),
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
    master_edition: &Pubkey,
    master_metadata: &Pubkey,
    mint: &Pubkey,
    source: &Pubkey,
    token_account: &Pubkey,
    args: AddVoucherToPackArgs,
) -> Instruction {
    let (program_authority, _) = find_program_authority(program_id);

    let accounts = vec![
        AccountMeta::new(*pack_set, false),
        AccountMeta::new(*pack_voucher, false),
        AccountMeta::new(*authority, true),
        AccountMeta::new_readonly(*master_edition, false),
        AccountMeta::new_readonly(*master_metadata, false),
        AccountMeta::new_readonly(*mint, false),
        AccountMeta::new(*source, false),
        AccountMeta::new(*token_account, false),
        AccountMeta::new(program_authority, false),
        AccountMeta::new_readonly(sysvar::rent::id(), false),
        AccountMeta::new_readonly(system_program::id(), false),
        AccountMeta::new_readonly(spl_token::id(), false),
    ];

    Instruction::new_with_borsh(
        *program_id,
        &NFTPacksInstruction::AddVoucherToPack(args),
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
        AccountMeta::new(*user_wallet, true),
        AccountMeta::new(*user_token_acc, false),
        AccountMeta::new_readonly(sysvar::rent::id(), false),
        AccountMeta::new_readonly(spl_token::id(), false),
        AccountMeta::new_readonly(system_program::id(), false),
    ];

    Instruction::new_with_borsh(*program_id, &NFTPacksInstruction::ProveOwnership, accounts)
}

/// Create `ClaimPack` instruction
#[allow(clippy::too_many_arguments)]
pub fn claim_pack(
    program_id: &Pubkey,
    pack_set: &Pubkey,
    user_wallet: &Pubkey,
    user_token: &Pubkey,
    new_metadata: &Pubkey,
    new_edition: &Pubkey,
    master_edition: &Pubkey,
    new_mint: &Pubkey,
    new_mint_authority: &Pubkey,
    metadata: &Pubkey,
    metadata_mint: &Pubkey,
    randomness_oracle: &Pubkey,
    index: u32,
) -> Instruction {
    let (proving_process, _) =
        find_proving_process_program_address(program_id, pack_set, user_wallet);
    let (pack_card, _) = find_pack_card_program_address(program_id, pack_set, index);
    let (program_authority, _) = find_program_authority(program_id);

    let edition_number = (index as u64)
        .checked_div(spl_token_metadata::state::EDITION_MARKER_BIT_SIZE)
        .unwrap();
    let as_string = edition_number.to_string();
    let (edition_mark_pda, _) = Pubkey::find_program_address(
        &[
            spl_token_metadata::state::PREFIX.as_bytes(),
            spl_token_metadata::id().as_ref(),
            metadata_mint.as_ref(),
            spl_token_metadata::state::EDITION.as_bytes(),
            as_string.as_bytes(),
        ],
        &spl_token_metadata::id(),
    );

    let accounts = vec![
        AccountMeta::new(*pack_set, false),
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
        AccountMeta::new_readonly(*randomness_oracle, false),
        AccountMeta::new_readonly(spl_token_metadata::id(), false),
        AccountMeta::new_readonly(spl_token::id(), false),
        AccountMeta::new_readonly(system_program::id(), false),
        AccountMeta::new_readonly(sysvar::clock::id(), false),
    ];

    Instruction::new_with_borsh(*program_id, &NFTPacksInstruction::ClaimPack, accounts)
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

/// Create `TransferMintingAuthority` instruction
pub fn transfer_minting_authority(
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
        &NFTPacksInstruction::TransferMintingAuthority,
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
    new_master_edition_owner: &Pubkey,
    token_account: &Pubkey,
) -> Instruction {
    let (program_authority, _) = find_program_authority(program_id);

    let accounts = vec![
        AccountMeta::new(*pack_set, false),
        AccountMeta::new(*pack_voucher, false),
        AccountMeta::new_readonly(*authority, true),
        AccountMeta::new(*refunder, false),
        AccountMeta::new(*new_master_edition_owner, false),
        AccountMeta::new(*token_account, false),
        AccountMeta::new_readonly(program_authority, false),
        AccountMeta::new_readonly(sysvar::rent::id(), false),
        AccountMeta::new_readonly(spl_token::id(), false),
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

/// Create `EditPackVoucher` instruction
pub fn edit_pack_voucher(
    program_id: &Pubkey,
    pack_set: &Pubkey,
    pack_voucher: &Pubkey,
    authority: &Pubkey,
    voucher_master: &Pubkey,
    args: EditPackVoucherArgs,
) -> Instruction {
    let accounts = vec![
        AccountMeta::new_readonly(*pack_set, false),
        AccountMeta::new_readonly(*authority, true),
        AccountMeta::new(*pack_voucher, false),
        AccountMeta::new_readonly(*voucher_master, false),
    ];

    Instruction::new_with_borsh(
        *program_id,
        &NFTPacksInstruction::EditPackVoucher(args),
        accounts,
    )
}

/// Create `MintEditionWithVoucher` instruction
#[allow(clippy::too_many_arguments)]
pub fn mint_new_edition_from_voucher(
    program_id: &Pubkey,
    pack_set: &Pubkey,
    minting_authority: &Pubkey,
    pack_voucher: &Pubkey,
    new_metadata: &Pubkey,
    new_edition: &Pubkey,
    master_edition: &Pubkey,
    new_mint: &Pubkey,
    new_mint_authority: &Pubkey,
    payer: &Pubkey,
    token_account_owner: &Pubkey,
    token_account: &Pubkey,
    new_metadata_update_authority: &Pubkey,
    metadata: &Pubkey,
    metadata_mint: &Pubkey,
    index: u64,
) -> Instruction {
    let edition_number = index
        .checked_div(spl_token_metadata::state::EDITION_MARKER_BIT_SIZE)
        .unwrap();
    let as_string = edition_number.to_string();

    let (edition_mark_pda, _) = Pubkey::find_program_address(
        &[
            spl_token_metadata::state::PREFIX.as_bytes(),
            spl_token_metadata::id().as_ref(),
            metadata_mint.as_ref(),
            spl_token_metadata::state::EDITION.as_bytes(),
            as_string.as_bytes(),
        ],
        &spl_token_metadata::id(),
    );

    let accounts = vec![
        AccountMeta::new_readonly(*pack_set, false),
        AccountMeta::new_readonly(*minting_authority, true),
        AccountMeta::new(*pack_voucher, false),
        AccountMeta::new(*new_metadata, false),
        AccountMeta::new(*new_edition, false),
        AccountMeta::new(*master_edition, false),
        AccountMeta::new(*new_mint, false),
        AccountMeta::new_readonly(*new_mint_authority, true),
        AccountMeta::new(*payer, true),
        AccountMeta::new_readonly(*token_account_owner, false),
        AccountMeta::new_readonly(*token_account, false),
        AccountMeta::new_readonly(*new_metadata_update_authority, false),
        AccountMeta::new_readonly(*metadata, false),
        AccountMeta::new_readonly(*metadata_mint, false),
        AccountMeta::new(edition_mark_pda, false),
        AccountMeta::new_readonly(spl_token::id(), false),
        AccountMeta::new_readonly(system_program::id(), false),
        AccountMeta::new_readonly(sysvar::rent::id(), false),
        AccountMeta::new_readonly(spl_token_metadata::id(), false),
    ];

    Instruction::new_with_borsh(
        *program_id,
        &NFTPacksInstruction::MintEditionWithVoucher,
        accounts,
    )
}

/// Create `RequestCardForRedeem` instruction
#[allow(clippy::too_many_arguments)]
pub fn request_card_for_redeem(
    program_id: &Pubkey,
    pack_set: &Pubkey,
    user_wallet: &Pubkey,
    random_oracle: &Pubkey,
) -> Instruction {
    let (proving_process, _) =
        find_proving_process_program_address(program_id, pack_set, user_wallet);

    let accounts = vec![
        AccountMeta::new(*pack_set, false),
        AccountMeta::new(proving_process, false),
        AccountMeta::new_readonly(*user_wallet, true),
        AccountMeta::new_readonly(*random_oracle, false),
        AccountMeta::new_readonly(sysvar::clock::id(), false),
    ];

    Instruction::new_with_borsh(
        *program_id,
        &NFTPacksInstruction::RequestCardForRedeem,
        accounts,
    )
}
