use crate::utils::try_from_slice_checked;
use borsh::{BorshDeserialize, BorshSerialize};
use shank::ShankAccount;
use solana_program::{account_info::AccountInfo, program_error::ProgramError, pubkey::Pubkey};
/// prefix used for PDAs to avoid certain collision attacks (https://en.wikipedia.org/wiki/Collision_attack#Chosen-prefix_collision_attack)
pub const PREFIX: &str = "vault";

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq)]
pub enum Key {
    Uninitialized,
    SafetyDepositBoxV1,
    ExternalAccountKeyV1,
    VaultV1,
}

pub const MAX_SAFETY_DEPOSIT_SIZE: usize = 1 + 32 + 32 + 32 + 1;
pub const MAX_VAULT_SIZE: usize = 1 + 32 + 32 + 32 + 32 + 1 + 32 + 1 + 32 + 1 + 1 + 8;
pub const MAX_EXTERNAL_ACCOUNT_SIZE: usize = 1 + 8 + 32 + 1;
#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq)]
pub enum VaultState {
    Inactive,
    Active,
    Combined,
    Deactivated,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, ShankAccount)]
pub struct Vault {
    pub key: Key,
    /// Store token program used
    pub token_program: Pubkey,
    /// Mint that produces the fractional shares
    pub fraction_mint: Pubkey,
    /// Authority who can make changes to the vault
    pub authority: Pubkey,
    /// treasury where fractional shares are held for redemption by authority
    pub fraction_treasury: Pubkey,
    /// treasury where monies are held for fractional share holders to redeem(burn) shares once buyout is made
    pub redeem_treasury: Pubkey,
    /// Can authority mint more shares from fraction_mint after activation
    pub allow_further_share_creation: bool,

    /// Must point at an ExternalPriceAccount, which gives permission and price for buyout.
    pub pricing_lookup_address: Pubkey,
    /// In inactive state, we use this to set the order key on Safety Deposit Boxes being added and
    /// then we increment it and save so the next safety deposit box gets the next number.
    /// In the Combined state during token redemption by authority, we use it as a decrementing counter each time
    /// The authority of the vault withdrawals a Safety Deposit contents to count down how many
    /// are left to be opened and closed down. Once this hits zero, and the fraction mint has zero shares,
    /// then we can deactivate the vault.
    pub token_type_count: u8,
    pub state: VaultState,

    /// Once combination happens, we copy price per share to vault so that if something nefarious happens
    /// to external price account, like price change, we still have the math 'saved' for use in our calcs
    pub locked_price_per_share: u64,

    /// The [MAX_VAULT_SIZE] indicates an extra byte for a field which is actually no longer
    /// present. Therefore we include a place holder here in order to have the struct size match
    /// the indicated size.
    _extra_byte: u8,
}

impl Vault {
    pub fn from_account_info(a: &AccountInfo) -> Result<Vault, ProgramError> {
        let vt: Vault = try_from_slice_checked(&a.data.borrow_mut(), Key::VaultV1, MAX_VAULT_SIZE)?;

        Ok(vt)
    }

    pub fn get_token_type_count(a: &AccountInfo) -> u8 {
        return a.data.borrow()[194];
    }
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, ShankAccount)]
pub struct SafetyDepositBox {
    // Please note if you change this struct, be careful as we read directly off it
    // in Metaplex to avoid serialization costs...
    /// Each token type in a vault has it's own box that contains it's mint and a look-back
    pub key: Key,
    /// Key pointing to the parent vault
    pub vault: Pubkey,
    /// This particular token's mint
    pub token_mint: Pubkey,
    /// Account that stores the tokens under management
    pub store: Pubkey,
    /// the order in the array of registries
    pub order: u8,
}

impl SafetyDepositBox {
    pub fn from_account_info(a: &AccountInfo) -> Result<SafetyDepositBox, ProgramError> {
        let sd: SafetyDepositBox = try_from_slice_checked(
            &a.data.borrow_mut(),
            Key::SafetyDepositBoxV1,
            MAX_SAFETY_DEPOSIT_SIZE,
        )?;

        Ok(sd)
    }

    pub fn get_order(a: &AccountInfo) -> u8 {
        a.data.borrow()[97]
    }
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, ShankAccount)]
pub struct ExternalPriceAccount {
    pub key: Key,
    pub price_per_share: u64,
    /// Mint of the currency we are pricing the shares against, should be same as redeem_treasury.
    /// Most likely will be USDC mint most of the time.
    pub price_mint: Pubkey,
    /// Whether or not combination has been allowed for this vault.
    pub allowed_to_combine: bool,
}

impl ExternalPriceAccount {
    pub fn from_account_info(a: &AccountInfo) -> Result<ExternalPriceAccount, ProgramError> {
        let sd: ExternalPriceAccount = try_from_slice_checked(
            &a.data.borrow_mut(),
            Key::ExternalAccountKeyV1,
            MAX_EXTERNAL_ACCOUNT_SIZE,
        )?;

        Ok(sd)
    }
}
