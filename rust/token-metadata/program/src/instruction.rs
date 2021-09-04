use {
    crate::{
        deprecated_instruction::{MintPrintingTokensViaTokenArgs, SetReservationListArgs},
        state::{Creator, Data, EDITION, EDITION_MARKER_BIT_SIZE, PREFIX},
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
pub struct MintNewEditionFromMasterEditionViaTokenArgs {
    pub edition: u64,
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

    /// Register a Metadata as a Master Edition V1, which means Editions can be minted.
    /// Henceforth, no further tokens will be mintable from this primary mint. Will throw an error if more than one
    /// token exists, and will throw an error if less than one token exists in this primary mint.
    ///   0. `[writable]` Unallocated edition V1 account with address as pda of ['metadata', program id, mint, 'edition']
    ///   1. `[writable]` Metadata mint
    ///   2. `[writable]` Printing mint - A mint you control that can mint tokens that can be exchanged for limited editions of your
    ///       master edition via the MintNewEditionFromMasterEditionViaToken endpoint
    ///   3. `[writable]` One time authorization printing mint - A mint you control that prints tokens that gives the bearer permission to mint any
    ///                  number of tokens from the printing mint one time via an endpoint with the token-metadata program for your metadata. Also burns the token.
    ///   4. `[signer]` Current Update authority key
    ///   5. `[signer]`   Printing mint authority - THIS WILL TRANSFER AUTHORITY AWAY FROM THIS KEY.
    ///   6. `[signer]` Mint authority on the metadata's mint - THIS WILL TRANSFER AUTHORITY AWAY FROM THIS KEY
    ///   7. `[]` Metadata account
    ///   8. `[signer]` payer
    ///   9. `[]` Token program
    ///   10. `[]` System program
    ///   11. `[]` Rent info
    ///   13. `[signer]`   One time authorization printing mint authority - must be provided if using max supply. THIS WILL TRANSFER AUTHORITY AWAY FROM THIS KEY.
    DeprecatedCreateMasterEdition(CreateMasterEditionArgs),

    /// Given an authority token minted by the Printing mint of a master edition, and a brand new non-metadata-ed mint with one token
    /// make a new Metadata + Edition that is a child of the master edition denoted by this authority token.
    ///   0. `[writable]` New Metadata key (pda of ['metadata', program id, mint id])
    ///   1. `[writable]` New Edition V1 (pda of ['metadata', program id, mint id, 'edition'])
    ///   2. `[writable]` Master Record Edition V1 (pda of ['metadata', program id, master metadata mint id, 'edition'])
    ///   3. `[writable]` Mint of new token - THIS WILL TRANSFER AUTHORITY AWAY FROM THIS KEY
    ///   4. `[signer]` Mint authority of new mint
    ///   5. `[writable]` Printing Mint of master record edition
    ///   6. `[writable]` Token account containing Printing mint token to be transferred
    ///   7. `[writable]` Edition pda to mark creation - will be checked for pre-existence. (pda of ['metadata', program id, master mint id, edition_number])
    ///   8. `[signer]` Burn authority for this token
    ///   9. `[signer]` payer
    ///   10. `[]` update authority info for new metadata account
    ///   11. `[]` Master record metadata account
    ///   12. `[]` Token program
    ///   13. `[]` System program
    ///   14. `[]` Rent info
    ///   15. `[optional/writable]` Reservation List - If present, and you are on this list, you can get
    ///        an edition number given by your position on the list.
    DeprecatedMintNewEditionFromMasterEditionViaPrintingToken,

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
    /// NOTE: If you have more than 20 addresses in a reservation list, this may be called multiple times to build up the list,
    /// otherwise, it simply wont fit in one transaction. Only provide a total_reservation argument on the first call, which will
    /// allocate the edition space, and in follow up calls this will specifically be unnecessary (and indeed will error.)
    ///
    ///   0. `[writable]` Master Edition V1 key (pda of ['metadata', program id, mint id, 'edition'])
    ///   1. `[writable]` PDA for ReservationList of ['metadata', program id, master edition key, 'reservation', resource-key]
    ///   2. `[signer]` The resource you tied the reservation list too
    DeprecatedSetReservationList(SetReservationListArgs),

    /// Create an empty reservation list for a resource who can come back later as a signer and fill the reservation list
    /// with reservations to ensure that people who come to get editions get the number they expect. See SetReservationList for more.
    ///
    ///   0. `[writable]` PDA for ReservationList of ['metadata', program id, master edition key, 'reservation', resource-key]
    ///   1. `[signer]` Payer
    ///   2. `[signer]` Update authority
    ///   3. `[]` Master Edition V1 key (pda of ['metadata', program id, mint id, 'edition'])
    ///   4. `[]` A resource you wish to tie the reservation list to. This is so your later visitors who come to
    ///       redeem can derive your reservation list PDA with something they can easily get at. You choose what this should be.
    ///   5. `[]` Metadata key (pda of ['metadata', program id, mint id])
    ///   6. `[]` System program
    ///   7. `[]` Rent info
    DeprecatedCreateReservationList,

    // Sign a piece of metadata that has you as an unverified creator so that it is now verified.
    //
    ///   0. `[writable]` Metadata (pda of ['metadata', program id, mint id])
    ///   1. `[signer]` Creator
    SignMetadata,

    /// Using a one time authorization token from a master edition v1, print any number of printing tokens from the printing_mint
    /// one time, burning the one time authorization token.
    ///
    ///   0. `[writable]` Destination account
    ///   1. `[writable]` Token account containing one time authorization token
    ///   2. `[writable]` One time authorization mint
    ///   3. `[writable]` Printing mint
    ///   4. `[signer]` Burn authority
    ///   5. `[]` Metadata key (pda of ['metadata', program id, mint id])
    ///   6. `[]` Master Edition V1 key (pda of ['metadata', program id, mint id, 'edition'])
    ///   7. `[]` Token program
    ///   8. `[]` Rent
    DeprecatedMintPrintingTokensViaToken(MintPrintingTokensViaTokenArgs),

    /// Using your update authority, mint printing tokens for your master edition.
    ///
    ///   0. `[writable]` Destination account
    ///   1. `[writable]` Printing mint
    ///   2. `[signer]` Update authority
    ///   3. `[]` Metadata key (pda of ['metadata', program id, mint id])
    ///   4. `[]` Master Edition V1 key (pda of ['metadata', program id, mint id, 'edition'])
    ///   5. `[]` Token program
    ///   6. `[]` Rent
    DeprecatedMintPrintingTokens(MintPrintingTokensViaTokenArgs),

    /// Register a Metadata as a Master Edition V2, which means Edition V2s can be minted.
    /// Henceforth, no further tokens will be mintable from this primary mint. Will throw an error if more than one
    /// token exists, and will throw an error if less than one token exists in this primary mint.
    ///   0. `[writable]` Unallocated edition V2 account with address as pda of ['metadata', program id, mint, 'edition']
    ///   1. `[writable]` Metadata mint
    ///   2. `[signer]` Update authority
    ///   3. `[signer]` Mint authority on the metadata's mint - THIS WILL TRANSFER AUTHORITY AWAY FROM THIS KEY
    ///   4. `[signer]` payer
    ///   5. `[]` Metadata account
    ///   6. `[]` Token program
    ///   7. `[]` System program
    ///   8. `[]` Rent info
    CreateMasterEdition(CreateMasterEditionArgs),

    /// Given a token account containing the master edition token to prove authority, and a brand new non-metadata-ed mint with one token
    /// make a new Metadata + Edition that is a child of the master edition denoted by this authority token.
    ///   0. `[writable]` New Metadata key (pda of ['metadata', program id, mint id])
    ///   1. `[writable]` New Edition (pda of ['metadata', program id, mint id, 'edition'])
    ///   2. `[writable]` Master Record Edition V2 (pda of ['metadata', program id, master metadata mint id, 'edition'])
    ///   3. `[writable]` Mint of new token - THIS WILL TRANSFER AUTHORITY AWAY FROM THIS KEY
    ///   4. `[writable]` Edition pda to mark creation - will be checked for pre-existence. (pda of ['metadata', program id, master metadata mint id, 'edition', edition_number])
    ///   where edition_number is NOT the edition number you pass in args but actually edition_number = floor(edition/EDITION_MARKER_BIT_SIZE).
    ///   5. `[signer]` Mint authority of new mint
    ///   6. `[signer]` payer
    ///   7. `[signer]` owner of token account containing master token (#8)
    ///   8. `[]` token account containing token from master metadata mint
    ///   9. `[]` Update authority info for new metadata
    ///   10. `[]` Master record metadata account
    ///   11. `[]` Token program
    ///   12. `[]` System program
    ///   13. `[]` Rent info
    MintNewEditionFromMasterEditionViaToken(MintNewEditionFromMasterEditionViaTokenArgs),

    /// Converts the Master Edition V1 to a Master Edition V2, draining lamports from the two printing mints
    /// to the owner of the token account holding the master edition token. Permissionless.
    /// Can only be called if there are currenly no printing tokens or one time authorization tokens in circulation.
    ///
    ///   0. `[writable]` Master Record Edition V1 (pda of ['metadata', program id, master metadata mint id, 'edition'])
    ///   1. `[writable]` One time authorization mint
    ///   2. `[writable]` Printing mint
    ConvertMasterEditionV1ToV2,

    /// Proxy Call to Mint Edition using a Store Token Account as a Vault Authority.
    ///
    ///   0. `[writable]` New Metadata key (pda of ['metadata', program id, mint id])
    ///   1. `[writable]` New Edition (pda of ['metadata', program id, mint id, 'edition'])
    ///   2. `[writable]` Master Record Edition V2 (pda of ['metadata', program id, master metadata mint id, 'edition']
    ///   3. `[writable]` Mint of new token - THIS WILL TRANSFER AUTHORITY AWAY FROM THIS KEY
    ///   4. `[writable]` Edition pda to mark creation - will be checked for pre-existence. (pda of ['metadata', program id, master metadata mint id, 'edition', edition_number])
    ///   where edition_number is NOT the edition number you pass in args but actually edition_number = floor(edition/EDITION_MARKER_BIT_SIZE).
    ///   5. `[signer]` Mint authority of new mint
    ///   6. `[signer]` payer
    ///   7. `[signer]` Vault authority
    ///   8. `[]` Safety deposit token store account
    ///   9. `[]` Safety deposit box
    ///   10. `[]` Vault
    ///   11. `[]` Update authority info for new metadata
    ///   12. `[]` Master record metadata account
    ///   13. `[]` Token program
    ///   14. `[]` Token vault program
    ///   15. `[]` System program
    ///   16. `[]` Rent info
    MintNewEditionFromMasterEditionViaVaultProxy(MintNewEditionFromMasterEditionViaTokenArgs),

    /// Puff a Metadata - make all of it's variable length fields (name/uri/symbol) a fixed length using a null character
    /// so that it can be found using offset searches by the RPC to make client lookups cheaper.
    ///   0. `[writable]` Metadata account
    PuffMetadata,
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
            AccountMeta::new(payer, true),
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

/// puff metadata account instruction
pub fn puff_metadata_account(program_id: Pubkey, metadata_account: Pubkey) -> Instruction {
    Instruction {
        program_id,
        accounts: vec![AccountMeta::new(metadata_account, false)],
        data: MetadataInstruction::PuffMetadata.try_to_vec().unwrap(),
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

/// creates a create_master_edition instruction
#[allow(clippy::too_many_arguments)]
pub fn create_master_edition(
    program_id: Pubkey,
    edition: Pubkey,
    mint: Pubkey,
    update_authority: Pubkey,
    mint_authority: Pubkey,
    metadata: Pubkey,
    payer: Pubkey,
    max_supply: Option<u64>,
) -> Instruction {
    let accounts = vec![
        AccountMeta::new(edition, false),
        AccountMeta::new(mint, false),
        AccountMeta::new_readonly(update_authority, true),
        AccountMeta::new_readonly(mint_authority, true),
        AccountMeta::new(payer, true),
        AccountMeta::new_readonly(metadata, false),
        AccountMeta::new_readonly(spl_token::id(), false),
        AccountMeta::new_readonly(solana_program::system_program::id(), false),
        AccountMeta::new_readonly(sysvar::rent::id(), false),
    ];

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
    new_metadata: Pubkey,
    new_edition: Pubkey,
    master_edition: Pubkey,
    new_mint: Pubkey,
    new_mint_authority: Pubkey,
    payer: Pubkey,
    token_account_owner: Pubkey,
    token_account: Pubkey,
    new_metadata_update_authority: Pubkey,
    metadata: Pubkey,
    metadata_mint: Pubkey,
    edition: u64,
) -> Instruction {
    let edition_number = edition.checked_div(EDITION_MARKER_BIT_SIZE).unwrap();
    let as_string = edition_number.to_string();
    let (edition_mark_pda, _) = Pubkey::find_program_address(
        &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            metadata_mint.as_ref(),
            EDITION.as_bytes(),
            as_string.as_bytes(),
        ],
        &program_id,
    );

    let accounts = vec![
        AccountMeta::new(new_metadata, false),
        AccountMeta::new(new_edition, false),
        AccountMeta::new(master_edition, false),
        AccountMeta::new(new_mint, false),
        AccountMeta::new(edition_mark_pda, false),
        AccountMeta::new_readonly(new_mint_authority, true),
        AccountMeta::new(payer, true),
        AccountMeta::new_readonly(token_account_owner, true),
        AccountMeta::new_readonly(token_account, false),
        AccountMeta::new_readonly(new_metadata_update_authority, false),
        AccountMeta::new_readonly(metadata, false),
        AccountMeta::new_readonly(spl_token::id(), false),
        AccountMeta::new_readonly(solana_program::system_program::id(), false),
        AccountMeta::new_readonly(sysvar::rent::id(), false),
    ];

    Instruction {
        program_id,
        accounts,
        data: MetadataInstruction::MintNewEditionFromMasterEditionViaToken(
            MintNewEditionFromMasterEditionViaTokenArgs { edition },
        )
        .try_to_vec()
        .unwrap(),
    }
}

/// Sign Metadata
#[allow(clippy::too_many_arguments)]
pub fn sign_metadata(
    program_id: Pubkey,
    metadata: Pubkey,
    creator: Pubkey,
) -> Instruction {
    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(metadata, false),
            AccountMeta::new_readonly(creator, true),
        ],
        data: MetadataInstruction::SignMetadata
            .try_to_vec()
            .unwrap(),
    }
}

/// Converts a master edition v1 to v2
#[allow(clippy::too_many_arguments)]
pub fn convert_master_edition_v1_to_v2(
    program_id: Pubkey,
    master_edition: Pubkey,
    one_time_auth: Pubkey,
    printing_mint: Pubkey,
) -> Instruction {
    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(master_edition, false),
            AccountMeta::new(one_time_auth, false),
            AccountMeta::new(printing_mint, false),
        ],
        data: MetadataInstruction::ConvertMasterEditionV1ToV2
            .try_to_vec()
            .unwrap(),
    }
}

/// creates a mint_edition_proxy instruction
#[allow(clippy::too_many_arguments)]
pub fn mint_edition_from_master_edition_via_vault_proxy(
    program_id: Pubkey,
    new_metadata: Pubkey,
    new_edition: Pubkey,
    master_edition: Pubkey,
    new_mint: Pubkey,
    edition_mark_pda: Pubkey,
    new_mint_authority: Pubkey,
    payer: Pubkey,
    vault_authority: Pubkey,
    safety_deposit_store: Pubkey,
    safety_deposit_box: Pubkey,
    vault: Pubkey,
    new_metadata_update_authority: Pubkey,
    metadata: Pubkey,
    token_program: Pubkey,
    token_vault_program_info: Pubkey,
    edition: u64,
) -> Instruction {
    let accounts = vec![
        AccountMeta::new(new_metadata, false),
        AccountMeta::new(new_edition, false),
        AccountMeta::new(master_edition, false),
        AccountMeta::new(new_mint, false),
        AccountMeta::new(edition_mark_pda, false),
        AccountMeta::new_readonly(new_mint_authority, true),
        AccountMeta::new(payer, true),
        AccountMeta::new_readonly(vault_authority, true),
        AccountMeta::new_readonly(safety_deposit_store, false),
        AccountMeta::new_readonly(safety_deposit_box, false),
        AccountMeta::new_readonly(vault, false),
        AccountMeta::new_readonly(new_metadata_update_authority, false),
        AccountMeta::new_readonly(metadata, false),
        AccountMeta::new_readonly(token_program, false),
        AccountMeta::new_readonly(token_vault_program_info, false),
        AccountMeta::new_readonly(solana_program::system_program::id(), false),
        AccountMeta::new_readonly(sysvar::rent::id(), false),
    ];

    Instruction {
        program_id,
        accounts,
        data: MetadataInstruction::MintNewEditionFromMasterEditionViaVaultProxy(
            MintNewEditionFromMasterEditionViaTokenArgs { edition },
        )
        .try_to_vec()
        .unwrap(),
    }
}
