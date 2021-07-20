use {
    crate::{
        instruction::{CreateMasterEditionArgs, MetadataInstruction},
        state::Reservation,
    },
    borsh::{BorshDeserialize, BorshSerialize},
    solana_program::{
        instruction::{AccountMeta, Instruction},
        pubkey::Pubkey,
        sysvar,
    },
};

#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct MintPrintingTokensViaTokenArgs {
    pub supply: u64,
}

#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct SetReservationListArgs {
    /// If set, means that no more than this number of editions can ever be minted. This is immutable.
    pub reservations: Vec<Reservation>,
    /// should only be present on the very first call to set reservation list.
    pub total_reservation_spots: Option<u64>,
    /// Where in the reservation list you want to insert this slice of reservations
    pub offset: u64,
    /// What the total spot offset is in the reservation list from the beginning to your slice of reservations.
    /// So if is going to be 4 total editions eventually reserved between your slice and the beginning of the array,
    /// split between 2 reservation entries, the offset variable above would be "2" since you start at entry 2 in 0 indexed array
    /// (first 2 taking 0 and 1) and because they each have 2 spots taken, this variable would be 4.
    pub total_spot_offset: u64,
}

/// creates a create_master_edition instruction
#[allow(clippy::too_many_arguments)]
pub fn deprecated_create_master_edition(
    program_id: Pubkey,
    edition: Pubkey,
    mint: Pubkey,
    printing_mint: Pubkey,
    one_time_printing_authorization_mint: Pubkey,
    update_authority: Pubkey,
    printing_mint_authority: Pubkey,
    mint_authority: Pubkey,
    metadata: Pubkey,
    payer: Pubkey,
    max_supply: Option<u64>,
    one_time_printing_authorization_mint_authority: Option<Pubkey>,
) -> Instruction {
    let mut accounts = vec![
        AccountMeta::new(edition, false),
        AccountMeta::new(mint, false),
        AccountMeta::new(printing_mint, false),
        AccountMeta::new(one_time_printing_authorization_mint, false),
        AccountMeta::new_readonly(update_authority, true),
        AccountMeta::new_readonly(printing_mint_authority, true),
        AccountMeta::new_readonly(mint_authority, true),
        AccountMeta::new_readonly(metadata, false),
        AccountMeta::new_readonly(payer, false),
        AccountMeta::new_readonly(spl_token::id(), false),
        AccountMeta::new_readonly(solana_program::system_program::id(), false),
        AccountMeta::new_readonly(sysvar::rent::id(), false),
    ];

    if let Some(auth) = one_time_printing_authorization_mint_authority {
        accounts.push(AccountMeta::new_readonly(auth, true));
    }

    Instruction {
        program_id,
        accounts,
        data: MetadataInstruction::DeprecatedCreateMasterEdition(CreateMasterEditionArgs {
            max_supply,
        })
        .try_to_vec()
        .unwrap(),
    }
}

/// creates a mint_new_edition_from_master_edition instruction
#[allow(clippy::too_many_arguments)]
pub fn deprecated_mint_new_edition_from_master_edition_via_printing_token(
    program_id: Pubkey,
    metadata: Pubkey,
    edition: Pubkey,
    master_edition: Pubkey,
    mint: Pubkey,
    mint_authority: Pubkey,
    printing_mint: Pubkey,
    master_token_account: Pubkey,
    burn_authority: Pubkey,
    payer: Pubkey,
    master_update_authority: Pubkey,
    master_metadata: Pubkey,
    reservation_list: Option<Pubkey>,
) -> Instruction {
    let mut accounts = vec![
        AccountMeta::new(metadata, false),
        AccountMeta::new(edition, false),
        AccountMeta::new(master_edition, false),
        AccountMeta::new(mint, false),
        AccountMeta::new_readonly(mint_authority, true),
        AccountMeta::new(printing_mint, false),
        AccountMeta::new(master_token_account, false),
        AccountMeta::new_readonly(burn_authority, true),
        AccountMeta::new(payer, true),
        AccountMeta::new_readonly(master_update_authority, true),
        AccountMeta::new_readonly(master_metadata, false),
        AccountMeta::new_readonly(spl_token::id(), false),
        AccountMeta::new_readonly(solana_program::system_program::id(), false),
        AccountMeta::new_readonly(sysvar::rent::id(), false),
    ];

    if let Some(list) = reservation_list {
        accounts.push(AccountMeta::new_readonly(list, false))
    }

    Instruction {
        program_id,
        accounts,
        data: MetadataInstruction::DeprecatedMintNewEditionFromMasterEditionViaPrintingToken
            .try_to_vec()
            .unwrap(),
    }
}

/// creates an set_reservation_list instruction
#[allow(clippy::too_many_arguments)]
pub fn deprecated_set_reservation_list(
    program_id: Pubkey,
    master_edition: Pubkey,
    reservation_list: Pubkey,
    resource: Pubkey,
    reservations: Vec<Reservation>,
    total_reservation_spots: Option<u64>,
    offset: u64,
    total_spot_offset: u64,
) -> Instruction {
    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(master_edition, false),
            AccountMeta::new(reservation_list, false),
            AccountMeta::new_readonly(resource, true),
        ],
        data: MetadataInstruction::DeprecatedSetReservationList(SetReservationListArgs {
            reservations,
            total_reservation_spots,
            offset,
            total_spot_offset,
        })
        .try_to_vec()
        .unwrap(),
    }
}

/// creates an create_reservation_list instruction
#[allow(clippy::too_many_arguments)]
pub fn deprecated_create_reservation_list(
    program_id: Pubkey,
    reservation_list: Pubkey,
    payer: Pubkey,
    update_authority: Pubkey,
    master_edition: Pubkey,
    resource: Pubkey,
    metadata: Pubkey,
) -> Instruction {
    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(reservation_list, false),
            AccountMeta::new_readonly(payer, true),
            AccountMeta::new_readonly(update_authority, true),
            AccountMeta::new_readonly(master_edition, false),
            AccountMeta::new_readonly(resource, false),
            AccountMeta::new_readonly(metadata, false),
            AccountMeta::new_readonly(solana_program::system_program::id(), false),
            AccountMeta::new_readonly(sysvar::rent::id(), false),
        ],
        data: MetadataInstruction::DeprecatedCreateReservationList
            .try_to_vec()
            .unwrap(),
    }
}

/// creates an mint_printing_tokens_via_token instruction
#[allow(clippy::too_many_arguments)]
pub fn deprecated_mint_printing_tokens_via_token(
    program_id: Pubkey,
    destination: Pubkey,
    token: Pubkey,
    one_time_printing_authorization_mint: Pubkey,
    printing_mint: Pubkey,
    burn_authority: Pubkey,
    metadata: Pubkey,
    master_edition: Pubkey,
    supply: u64,
) -> Instruction {
    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(destination, false),
            AccountMeta::new(token, false),
            AccountMeta::new(one_time_printing_authorization_mint, false),
            AccountMeta::new(printing_mint, false),
            AccountMeta::new_readonly(burn_authority, true),
            AccountMeta::new_readonly(metadata, false),
            AccountMeta::new_readonly(master_edition, false),
            AccountMeta::new_readonly(spl_token::id(), false),
            AccountMeta::new_readonly(sysvar::rent::id(), false),
        ],
        data: MetadataInstruction::DeprecatedMintPrintingTokensViaToken(
            MintPrintingTokensViaTokenArgs { supply },
        )
        .try_to_vec()
        .unwrap(),
    }
}

/// creates an mint_printing_tokens instruction
#[allow(clippy::too_many_arguments)]
pub fn deprecated_mint_printing_tokens(
    program_id: Pubkey,
    destination: Pubkey,
    printing_mint: Pubkey,
    update_authority: Pubkey,
    metadata: Pubkey,
    master_edition: Pubkey,
    supply: u64,
) -> Instruction {
    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(destination, false),
            AccountMeta::new(printing_mint, false),
            AccountMeta::new_readonly(update_authority, true),
            AccountMeta::new_readonly(metadata, false),
            AccountMeta::new_readonly(master_edition, false),
            AccountMeta::new_readonly(spl_token::id(), false),
            AccountMeta::new_readonly(sysvar::rent::id(), false),
        ],
        data: MetadataInstruction::DeprecatedMintPrintingTokens(MintPrintingTokensViaTokenArgs {
            supply,
        })
        .try_to_vec()
        .unwrap(),
    }
}
