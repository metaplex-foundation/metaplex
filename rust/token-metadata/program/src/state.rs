use {
    crate::{error::MetadataError, utils::try_from_slice_checked},
    borsh::{BorshDeserialize, BorshSerialize},
    solana_program::{
        account_info::AccountInfo, entrypoint::ProgramResult, program_error::ProgramError,
        pubkey::Pubkey,
    },
};
/// prefix used for PDAs to avoid certain collision attacks (https://en.wikipedia.org/wiki/Collision_attack#Chosen-prefix_collision_attack)
pub const PREFIX: &str = "metadata";

/// Used in seeds to make Edition model pda address
pub const EDITION: &str = "edition";

pub const RESERVATION: &str = "reservation";

pub const MAX_NAME_LENGTH: usize = 32;

pub const MAX_SYMBOL_LENGTH: usize = 10;

pub const MAX_URI_LENGTH: usize = 200;

pub const MAX_METADATA_LEN: usize = 1
    + 32
    + 32
    + MAX_NAME_LENGTH
    + MAX_SYMBOL_LENGTH
    + MAX_URI_LENGTH
    + MAX_CREATOR_LIMIT * MAX_CREATOR_LEN
    + 2
    + 1
    + 1
    + 198;

pub const MAX_EDITION_LEN: usize = 1 + 32 + 8 + 200;

pub const MAX_MASTER_EDITION_LEN: usize = 1 + 9 + 8 + 32 + 32 + 200;

pub const MAX_CREATOR_LIMIT: usize = 5;

pub const MAX_CREATOR_LEN: usize = 32 + 1 + 1;

pub const MAX_RESERVATIONS: usize = 200;

// can hold up to 200 keys per reservation, note: the extra 8 is for number of elements in the vec
pub const MAX_RESERVATION_LIST_V1_SIZE: usize = 1 + 32 + 8 + 8 + MAX_RESERVATIONS * 34 + 100;

// can hold up to 200 keys per reservation, note: the extra 8 is for number of elements in the vec
pub const MAX_RESERVATION_LIST_SIZE: usize = 1 + 32 + 8 + 8 + MAX_RESERVATIONS * 48 + 8 + 92;

#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub enum Key {
    Uninitialized,
    EditionV1,
    MasterEditionV1,
    ReservationListV1,
    MetadataV1,
    ReservationListV2,
}
#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct Data {
    /// The name of the asset
    pub name: String,
    /// The symbol for the asset
    pub symbol: String,
    /// URI pointing to JSON representing the asset
    pub uri: String,
    /// Royalty basis points that goes to creators in secondary sales (0-10000)
    pub seller_fee_basis_points: u16,
    /// Array of creators, optional
    pub creators: Option<Vec<Creator>>,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug)]
pub struct Metadata {
    pub key: Key,
    pub update_authority: Pubkey,
    pub mint: Pubkey,
    pub data: Data,
    // Immutable, once flipped, all sales of this metadata are considered secondary.
    pub primary_sale_happened: bool,
    // Whether or not the data struct is mutable, default is not
    pub is_mutable: bool,
}

impl Metadata {
    pub fn from_account_info(a: &AccountInfo) -> Result<Metadata, ProgramError> {
        let md: Metadata =
            try_from_slice_checked(&a.data.borrow_mut(), Key::MetadataV1, MAX_METADATA_LEN)?;

        Ok(md)
    }
}

#[repr(C)]
#[derive(Clone, Debug, PartialEq, BorshSerialize, BorshDeserialize)]
pub struct MasterEdition {
    pub key: Key,

    pub supply: u64,

    pub max_supply: Option<u64>,

    /// Can be used to mint tokens that give one-time permission to mint a single limited edition.
    pub printing_mint: Pubkey,

    /// If you don't know how many printing tokens you are going to need, but you do know
    /// you are going to need some amount in the future, you can use a token from this mint.
    /// Coming back to token metadata with one of these tokens allows you to mint (one time)
    /// any number of printing tokens you want. This is used for instance by Auction Manager
    /// with participation NFTs, where we dont know how many people will bid and need participation
    /// printing tokens to redeem, so we give it ONE of these tokens to use after the auction is over,
    /// because when the auction begins we just dont know how many printing tokens we will need,
    /// but at the end we will. At the end it then burns this token with token-metadata to
    /// get the printing tokens it needs to give to bidders. Each bidder then redeems a printing token
    /// to get their limited editions.
    pub one_time_printing_authorization_mint: Pubkey,
}

impl MasterEdition {
    pub fn from_account_info(a: &AccountInfo) -> Result<MasterEdition, ProgramError> {
        let me: MasterEdition = try_from_slice_checked(
            &a.data.borrow_mut(),
            Key::MasterEditionV1,
            MAX_MASTER_EDITION_LEN,
        )?;

        Ok(me)
    }
}

#[repr(C)]
#[derive(Clone, Debug, PartialEq, BorshSerialize, BorshDeserialize)]
/// All Editions should never have a supply greater than 1.
/// To enforce this, a transfer mint authority instruction will happen when
/// a normal token is turned into an Edition, and in order for a Metadata update authority
/// to do this transaction they will also need to sign the transaction as the Mint authority.
pub struct Edition {
    pub key: Key,

    /// Points at MasterEdition struct
    pub parent: Pubkey,

    /// Starting at 0 for master record, this is incremented for each edition minted.
    pub edition: u64,
}

impl Edition {
    pub fn from_account_info(a: &AccountInfo) -> Result<Edition, ProgramError> {
        let ed: Edition =
            try_from_slice_checked(&a.data.borrow_mut(), Key::EditionV1, MAX_EDITION_LEN)?;

        Ok(ed)
    }
}

#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct Creator {
    pub address: Pubkey,
    pub verified: bool,
    // In percentages, NOT basis points ;) Watch out!
    pub share: u8,
}

pub trait ReservationList {
    fn master_edition(&self) -> Pubkey;
    fn supply_snapshot(&self) -> Option<u64>;
    fn reservations(&self) -> Vec<Reservation>;
    fn total_reservation_spots(&self) -> u64;
    fn set_master_edition(&mut self, key: Pubkey);
    fn set_supply_snapshot(&mut self, supply: Option<u64>);
    fn set_reservations(&mut self, reservations: Vec<Reservation>);
    fn add_reservations(&mut self, reservations: Vec<Reservation>);
    fn set_total_reservation_spots(&mut self, total_reservation_spots: u64);
    fn save(&self, account: &AccountInfo) -> ProgramResult;
}

pub fn get_reservation_list(
    account: &AccountInfo,
) -> Result<Box<dyn ReservationList>, ProgramError> {
    let version = account.data.borrow()[0];

    // For some reason when converting Key to u8 here, it becomes unreachable. Use direct constant instead.
    match version {
        3 => return Ok(Box::new(ReservationListV1::from_account_info(account)?)),
        5 => return Ok(Box::new(ReservationListV2::from_account_info(account)?)),
        _ => return Err(MetadataError::DataTypeMismatch.into()),
    };
}

#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct ReservationListV2 {
    pub key: Key,
    /// Present for reverse lookups
    pub master_edition: Pubkey,

    /// What supply counter was on master_edition when this reservation was created.
    pub supply_snapshot: Option<u64>,
    pub reservations: Vec<Reservation>,
    /// How many reservations there are going to be, given on first set_reservation call
    pub total_reservation_spots: u64,
}

impl ReservationList for ReservationListV2 {
    fn master_edition(&self) -> Pubkey {
        self.master_edition
    }

    fn supply_snapshot(&self) -> Option<u64> {
        self.supply_snapshot
    }

    fn reservations(&self) -> Vec<Reservation> {
        self.reservations.clone()
    }

    fn set_master_edition(&mut self, key: Pubkey) {
        self.master_edition = key
    }

    fn set_supply_snapshot(&mut self, supply: Option<u64>) {
        self.supply_snapshot = supply;
    }

    fn add_reservations(&mut self, mut reservations: Vec<Reservation>) {
        self.reservations.append(&mut reservations)
    }

    fn set_reservations(&mut self, reservations: Vec<Reservation>) {
        self.reservations = reservations
    }

    fn save(&self, account: &AccountInfo) -> ProgramResult {
        self.serialize(&mut *account.data.borrow_mut())?;
        Ok(())
    }

    fn total_reservation_spots(&self) -> u64 {
        self.total_reservation_spots
    }

    fn set_total_reservation_spots(&mut self, total_reservation_spots: u64) {
        self.total_reservation_spots = total_reservation_spots;
    }
}

impl ReservationListV2 {
    pub fn from_account_info(a: &AccountInfo) -> Result<ReservationListV2, ProgramError> {
        let res: ReservationListV2 = try_from_slice_checked(
            &a.data.borrow_mut(),
            Key::ReservationListV2,
            MAX_RESERVATION_LIST_SIZE,
        )?;

        Ok(res)
    }
}

#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct Reservation {
    pub address: Pubkey,
    pub spots_remaining: u64,
    pub total_spots: u64,
}

// Legacy Reservation List with u8s
#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct ReservationListV1 {
    pub key: Key,
    /// Present for reverse lookups
    pub master_edition: Pubkey,

    /// What supply counter was on master_edition when this reservation was created.
    pub supply_snapshot: Option<u64>,
    pub reservations: Vec<ReservationV1>,
}

impl ReservationList for ReservationListV1 {
    fn master_edition(&self) -> Pubkey {
        self.master_edition
    }

    fn supply_snapshot(&self) -> Option<u64> {
        self.supply_snapshot
    }

    fn reservations(&self) -> Vec<Reservation> {
        self.reservations
            .iter()
            .map(|r| Reservation {
                address: r.address,
                spots_remaining: r.spots_remaining as u64,
                total_spots: r.total_spots as u64,
            })
            .collect()
    }

    fn set_master_edition(&mut self, key: Pubkey) {
        self.master_edition = key
    }

    fn set_supply_snapshot(&mut self, supply: Option<u64>) {
        self.supply_snapshot = supply;
    }

    fn add_reservations(&mut self, reservations: Vec<Reservation>) {
        self.reservations = reservations
            .iter()
            .map(|r| ReservationV1 {
                address: r.address,
                spots_remaining: r.spots_remaining as u8,
                total_spots: r.total_spots as u8,
            })
            .collect();
    }

    fn set_reservations(&mut self, reservations: Vec<Reservation>) {
        self.add_reservations(reservations);
    }

    fn save(&self, account: &AccountInfo) -> ProgramResult {
        self.serialize(&mut *account.data.borrow_mut())?;
        Ok(())
    }

    fn total_reservation_spots(&self) -> u64 {
        self.reservations.len() as u64
    }

    fn set_total_reservation_spots(&mut self, _: u64) {}
}

impl ReservationListV1 {
    pub fn from_account_info(a: &AccountInfo) -> Result<ReservationListV1, ProgramError> {
        let res: ReservationListV1 = try_from_slice_checked(
            &a.data.borrow_mut(),
            Key::ReservationListV1,
            MAX_RESERVATION_LIST_V1_SIZE,
        )?;

        Ok(res)
    }
}

#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct ReservationV1 {
    pub address: Pubkey,
    pub spots_remaining: u8,
    pub total_spots: u8,
}
