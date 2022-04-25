use solana_program::pubkey::Pubkey;

use crate::state::{BURN, COLLECTION_AUTHORITY, EDITION, PREFIX, USER};

pub fn find_edition_account(mint: &Pubkey, edition_number: String) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            PREFIX.as_bytes(),
            crate::id().as_ref(),
            mint.as_ref(),
            EDITION.as_bytes(),
            edition_number.as_bytes(),
        ],
        &crate::id(),
    )
}
pub fn find_master_edition_account(mint: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            PREFIX.as_bytes(),
            crate::id().as_ref(),
            mint.as_ref(),
            EDITION.as_bytes(),
        ],
        &crate::id(),
    )
}

pub fn find_metadata_account(mint: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[PREFIX.as_bytes(), crate::id().as_ref(), mint.as_ref()],
        &crate::id(),
    )
}

pub fn find_use_authority_account(mint: &Pubkey, authority: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            PREFIX.as_bytes(),
            crate::id().as_ref(),
            mint.as_ref(),
            USER.as_bytes(),
            authority.as_ref(),
        ],
        &crate::id(),
    )
}

pub fn find_collection_authority_account(mint: &Pubkey, authority: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            PREFIX.as_bytes(),
            crate::id().as_ref(),
            mint.as_ref(),
            COLLECTION_AUTHORITY.as_bytes(),
            authority.as_ref(),
        ],
        &crate::id(),
    )
}

pub fn find_program_as_burner_account() -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[PREFIX.as_bytes(), crate::id().as_ref(), BURN.as_bytes()],
        &crate::id(),
    )
}
