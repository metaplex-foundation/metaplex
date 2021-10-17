use {
    solana_program::{
        program_error::ProgramError,
        account_info::AccountInfo,
        pubkey::Pubkey
    },
    borsh::{BorshDeserialize, BorshSerialize},
    crate::utils::try_from_slice_checked
};

pub const MAX_STORE_SIZE: usize = 2 + 32 + 32 + 32 + 32 + 100;

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq, Debug, Copy)]
pub enum Key {
    Uninitialized,
    OriginalAuthorityLookupV1,
    BidRedemptionTicketV1,
    StoreV1,
    WhitelistedCreatorV1,
    PayoutTicketV1,
    SafetyDepositValidationTicketV1,
    AuctionManagerV1,
    PrizeTrackingTicketV1,
    SafetyDepositConfigV1,
    AuctionManagerV2,
    BidRedemptionTicketV2,
    AuctionWinnerTokenTypeTrackerV1,
    StoreIndexerV1,
    AuctionCacheV1,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Copy)]
pub struct Store {
    pub key: Key,
    pub public: bool,
    pub auction_program: Pubkey,
    pub token_vault_program: Pubkey,
    pub token_metadata_program: Pubkey,
    pub token_program: Pubkey,
    pub gatekeeper_network: Option<Pubkey>
}

impl Store {
    pub fn from_account_info(a: &AccountInfo) -> Result<Store, ProgramError> {
        let store: Store =
            try_from_slice_checked(&a.data.borrow_mut(), Key::StoreV1, MAX_STORE_SIZE)?;

        Ok(store)
    }
}
