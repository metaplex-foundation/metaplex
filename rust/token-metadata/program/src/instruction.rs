use {
    crate::state::{Creator, Data, Reservation},
    borsh::{BorshDeserialize, BorshSerialize},
    solana_program::{
        instruction::{AccountMeta, Instruction},
        pubkey::Pubkey,
        sysvar,
    },
};

#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
/// Args for update call
pub struct UpdateMetadataAccountArgs {
    pub data: Option<Data>,
    pub update_authority: Option<Pubkey>,
    pub primary_sale_happened: Option<bool>,
}

#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
/// Args for create call
pub struct CreateMetadataAccountArgs {
    /// Note that unique metadatas are disabled for now.
    pub data: Data,
    /// Whether you want your metadata to be updateable in the future.
    pub is_mutable: bool,
}

#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct CreateMasterEditionArgs {
    /// If set, means that no more than this number of editions can ever be minted. This is immutable.
    pub max_supply: Option<u64>,
}

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
}

/// Instructions supported by the Metadata program.
#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub enum MetadataInstruction {
    /// Create Metadata object.
    ///   0. `[writable]`  Metadata key (pda of ['metadata', program id, mint id])
    ///   1. `[]` Mint of token asset
    ///   2. `[signer]` Mint authority
    ///   3. `[signer]` payer
    ///   4. `[]` update authority info
    ///   5. `[]` System program
    ///   6. `[]` Rent info
    CreateMetadataAccount(CreateMetadataAccountArgs),

    /// Update a Metadata
    ///   0. `[writable]` Metadata account
    ///   1. `[signer]` Update authority key
    UpdateMetadataAccount(UpdateMetadataAccountArgs),

    /// Register a Metadata as a Master Edition, which means Editions can be minted.
    /// Henceforth, no further tokens will be mintable from this primary mint. Will throw an error if more than one
    /// token exists, and will throw an error if less than one token exists in this primary mint.
    ///   0. `[writable]` Unallocated edition account with address as pda of ['metadata', program id, mint, 'edition']
    ///   1. `[writable]` Metadata mint
    ///   2. `[writable]` Printing mint - A mint you control that can mint tokens that can be exchanged for limited editions of your
    ///       master edition via the MintNewEditionFromMasterEditionViaToken endpoint
    ///   3. `[writable]` One time authorization printing mint - A mint you control that prints tokens that gives the bearer permission to mint any
    ///                  number of tokens from the printing mint one time via an endpoint with the token-metadata program for your metadata. Also burns the token.
    ///   4. `[signer]` Current Update authority key on metadata
    ///   5. `[signer]`   Printing mint authority - THIS WILL TRANSFER AUTHORITY AWAY FROM THIS KEY.
    ///   6. `[signer]` Mint authority on the metadata's mint - THIS WILL TRANSFER AUTHORITY AWAY FROM THIS KEY
    ///   7. `[]` Metadata account
    ///   8. `[signer]` payer
    ///   9. `[]` Token program
    ///   10. `[]` System program
    ///   11. `[]` Rent info
    ///   13. `[signer]`   One time authorization printing mint authority - must be provided if using max supply. THIS WILL TRANSFER AUTHORITY AWAY FROM THIS KEY.
    CreateMasterEdition(CreateMasterEditionArgs),

    /// Given an authority token minted by the Printing mint of a master edition, and a brand new non-metadata-ed mint with one token
    /// make a new Metadata + Edition that is a child of the master edition denoted by this authority token.
    ///   0. `[writable]` New Metadata key (pda of ['metadata', program id, mint id])
    ///   1. `[writable]` New Edition (pda of ['metadata', program id, mint id, 'edition'])
    ///   2. `[writable]` Master Record Edition (pda of ['metadata', program id, Printing mint id, 'edition'])
    ///   3. `[writable]` Mint of new token - THIS WILL TRANSFER AUTHORITY AWAY FROM THIS KEY
    ///   4. `[signer]` Mint authority of new mint
    ///   5. `[writable]` Printing Mint of master record edition
    ///   6. `[writable]` Token account containing Printing mint token to be transferred
    ///   7. `[signer]` Burn authority for this token
    ///   8. `[signer]` payer
    ///   9. `[signer]` update authority info of master metadata account
    ///   10. `[]` Master record metadata account
    ///   11. `[]` Token program
    ///   12. `[]` System program
    ///   13. `[]` Rent info
    ///   14. `[optional/writable]` Reservation List - If present, and you are on this list, you can get
    ///        an edition number given by your position on the list.
    MintNewEditionFromMasterEditionViaToken,

    /// Allows updating the primary sale boolean on Metadata solely through owning an account
    /// containing a token from the metadata's mint and being a signer on this transaction.
    /// A sort of limited authority for limited update capability that is required for things like
    /// Metaplex to work without needing full authority passing.
    ///
    ///   0. `[writable]` Metadata key (pda of ['metadata', program id, mint id])
    ///   1. `[signer]` Owner on the token account
    ///   2. `[]` Account containing tokens from the metadata's mint
    UpdatePrimarySaleHappenedViaToken,

    /// Reserve up to 200 editions in sequence for up to 200 addresses in an existing reservation PDA, which can then be used later by
    /// redeemers who have printing tokens as a reservation to get a specific edition number
    /// as opposed to whatever one is currently listed on the master edition. Used by Auction Manager
    /// to guarantee printing order on bid redemption. AM will call whenever the first person redeems a
    /// printing bid to reserve the whole block
    /// of winners in order and then each winner when they get their token submits their mint and account
    /// with the pda that was created by that first bidder - the token metadata can then cross reference
    /// these people with the list and see that bidder A gets edition #2, so on and so forth.
    ///
    /// NOTE: If you have more than 30 addresses in a reservation list, this may be called multiple times to build up the list,
    /// otherwise, it simply wont fit in one transaction. Only provide a total_reservation argument on the first call, which will
    /// allocate the edition space, and in follow up calls this will specifically be unnecessary (and indeed will error.)
    ///
    ///   0. `[writable]` Master Edition key (pda of ['metadata', program id, mint id, 'edition'])
    ///   1. `[writable]` PDA for ReservationList of ['metadata', program id, master edition key, 'reservation', resource-key]
    ///   3. `[signer]` The resource you tied the reservation list too
    SetReservationList(SetReservationListArgs),

    /// Create an empty reservation list for a resource who can come back later as a signer and fill the reservation list
    /// with reservations to ensure that people who come to get editions get the number they expect. See SetReservationList for more.
    ///
    ///   0. `[writable]` PDA for ReservationList of ['metadata', program id, master edition key, 'reservation', resource-key]
    ///   1. `[signer]` Payer
    ///   2. `[signer]` Update authority
    ///   3. `[]` Master Edition key (pda of ['metadata', program id, mint id, 'edition'])
    ///   4. `[]` A resource you wish to tie the reservation list to. This is so your later visitors who come to
    ///       redeem can derive your reservation list PDA with something they can easily get at. You choose what this should be.
    ///   5. `[]` Metadata key (pda of ['metadata', program id, mint id])
    ///   6. `[]` System program
    ///   7. `[]` Rent info
    CreateReservationList,

    // Sign a piece of metadata that has you as an unverified creator so that it is now verified.
    //
    ///   0. `[writable]` Metadata (pda of ['metadata', program id, mint id])
    ///   1. `[signer]` Creator
    SignMetadata,

    /// Using a one time authorization token from a master edition, print any number of printing tokens from the printing_mint
    /// one time, burning the one time authorization token.
    ///
    ///   0. `[writable]` Destination account
    ///   1. `[writable]` Token account containing one time authorization token
    ///   2. `[writable]` One time authorization mint
    ///   3. `[writable]` Printing mint
    ///   4. `[signer]` Burn authority
    ///   5. `[]` Metadata key (pda of ['metadata', program id, mint id])
    ///   6. `[]` Master Edition key (pda of ['metadata', program id, mint id, 'edition'])
    ///   7. `[]` Token program
    ///   8. `[]` Rent
    MintPrintingTokensViaToken(MintPrintingTokensViaTokenArgs),

    /// Using your update authority, mint printing tokens for your master edition.
    ///
    ///   0. `[writable]` Destination account
    ///   1. `[writable]` Printing mint
    ///   2. `[signer]` Update authority
    ///   3. `[]` Metadata key (pda of ['metadata', program id, mint id])
    ///   4. `[]` Master Edition key (pda of ['metadata', program id, mint id, 'edition'])
    ///   5. `[]` Token program
    ///   6. `[]` Rent
    MintPrintingTokens(MintPrintingTokensViaTokenArgs),
}

/// Creates an CreateMetadataAccounts instruction
#[allow(clippy::too_many_arguments)]
pub fn create_metadata_accounts(
    program_id: Pubkey,
    metadata_account: Pubkey,
    mint: Pubkey,
    mint_authority: Pubkey,
    payer: Pubkey,
    update_authority: Pubkey,
    name: String,
    symbol: String,
    uri: String,
    creators: Option<Vec<Creator>>,
    seller_fee_basis_points: u16,
    update_authority_is_signer: bool,
    is_mutable: bool,
) -> Instruction {
    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(metadata_account, false),
            AccountMeta::new_readonly(mint, false),
            AccountMeta::new_readonly(mint_authority, true),
            AccountMeta::new_readonly(payer, true),
            AccountMeta::new_readonly(update_authority, update_authority_is_signer),
            AccountMeta::new_readonly(solana_program::system_program::id(), false),
            AccountMeta::new_readonly(sysvar::rent::id(), false),
        ],
        data: MetadataInstruction::CreateMetadataAccount(CreateMetadataAccountArgs {
            data: Data {
                name,
                symbol,
                uri,
                seller_fee_basis_points,
                creators,
            },
            is_mutable,
        })
        .try_to_vec()
        .unwrap(),
    }
}

/// update metadata account instruction
pub fn update_metadata_accounts(
    program_id: Pubkey,
    metadata_account: Pubkey,
    update_authority: Pubkey,
    new_update_authority: Option<Pubkey>,
    data: Option<Data>,
    primary_sale_happened: Option<bool>,
) -> Instruction {
    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(metadata_account, false),
            AccountMeta::new_readonly(update_authority, true),
        ],
        data: MetadataInstruction::UpdateMetadataAccount(UpdateMetadataAccountArgs {
            data,
            update_authority: new_update_authority,
            primary_sale_happened,
        })
        .try_to_vec()
        .unwrap(),
    }
}

/// creates a create_master_edition instruction
#[allow(clippy::too_many_arguments)]
pub fn create_master_edition(
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
        data: MetadataInstruction::CreateMasterEdition(CreateMasterEditionArgs { max_supply })
            .try_to_vec()
            .unwrap(),
    }
}

/// creates a mint_new_edition_from_master_edition instruction
#[allow(clippy::too_many_arguments)]
pub fn mint_new_edition_from_master_edition_via_token(
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
        data: MetadataInstruction::MintNewEditionFromMasterEditionViaToken
            .try_to_vec()
            .unwrap(),
    }
}

/// creates a update_primary_sale_happened_via_token instruction
#[allow(clippy::too_many_arguments)]
pub fn update_primary_sale_happened_via_token(
    program_id: Pubkey,
    metadata: Pubkey,
    owner: Pubkey,
    token: Pubkey,
) -> Instruction {
    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(metadata, false),
            AccountMeta::new_readonly(owner, true),
            AccountMeta::new_readonly(token, false),
        ],
        data: MetadataInstruction::UpdatePrimarySaleHappenedViaToken
            .try_to_vec()
            .unwrap(),
    }
}

/// creates an set_reservation_list instruction
#[allow(clippy::too_many_arguments)]
pub fn set_reservation_list(
    program_id: Pubkey,
    master_edition: Pubkey,
    reservation_list: Pubkey,
    resource: Pubkey,
    reservations: Vec<Reservation>,
    total_reservation_spots: Option<u64>,
) -> Instruction {
    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(master_edition, false),
            AccountMeta::new(reservation_list, false),
            AccountMeta::new_readonly(resource, true),
        ],
        data: MetadataInstruction::SetReservationList(SetReservationListArgs {
            reservations,
            total_reservation_spots,
        })
        .try_to_vec()
        .unwrap(),
    }
}

/// creates an create_reservation_list instruction
#[allow(clippy::too_many_arguments)]
pub fn create_reservation_list(
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
        data: MetadataInstruction::CreateReservationList
            .try_to_vec()
            .unwrap(),
    }
}

/// creates an mint_printing_tokens_via_token instruction
#[allow(clippy::too_many_arguments)]
pub fn mint_printing_tokens_via_token(
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
        data: MetadataInstruction::MintPrintingTokensViaToken(MintPrintingTokensViaTokenArgs {
            supply,
        })
        .try_to_vec()
        .unwrap(),
    }
}

/// creates an mint_printing_tokens instruction
#[allow(clippy::too_many_arguments)]
pub fn mint_printing_tokens(
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
        data: MetadataInstruction::MintPrintingTokens(MintPrintingTokensViaTokenArgs { supply })
            .try_to_vec()
            .unwrap(),
    }
}
