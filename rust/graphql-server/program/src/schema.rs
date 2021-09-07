use solana_program::pubkey::Pubkey;
use juniper::{FieldResult, FieldError, EmptySubscription, EmptyMutation, RootNode };
use {
    crate::state::SharedState
};
use juniper::{GraphQLEnum, GraphQLObject};
use std::str::FromStr;

pub struct Ctx(SharedState);


impl Ctx {
    pub fn new() -> Ctx {
        let state = SharedState::new();
        Ctx(state)
    }
    pub fn preload(&mut self) {
      self.0.preload()
    }
    pub fn find_vault(&self, key: &str) -> Option<&spl_token_vault::state::Vault> {
      match Pubkey::from_str(key) {
        Ok(id) => self.0.vaults.get(&id),
        Err(_) => Option::None
      }
    }
    pub fn vaults(&self) -> Vec<Vault> {
      self.0.vaults.values().map(|v| Vault::from(v)).collect()
    }
}

impl juniper::Context for Ctx {}


#[derive(GraphQLEnum, Debug, Copy, Clone)]
pub enum VaultState {
  Inactive,
  Active,
  Combined,
  Deactivated,
}

impl From<&spl_token_vault::state::VaultState> for VaultState {
  fn from(val: &spl_token_vault::state::VaultState) -> Self {
    match val {
      spl_token_vault::state::VaultState::Inactive => VaultState::Inactive,
      spl_token_vault::state::VaultState::Active => VaultState::Active,
      spl_token_vault::state::VaultState::Combined => VaultState::Combined,
      spl_token_vault::state::VaultState::Deactivated => VaultState::Deactivated
    }
  }
}


#[derive(GraphQLEnum, Debug, Copy, Clone)]
pub enum Key {
  Uninitialized,
  SafetyDepositBoxV1,
  ExternalAccountKeyV1,
  VaultV1,
}

impl From<&spl_token_vault::state::Key> for Key {
  fn from(val: &spl_token_vault::state::Key) -> Self {
    match val {
      spl_token_vault::state::Key::Uninitialized => Key::Uninitialized,
      spl_token_vault::state::Key::SafetyDepositBoxV1 => Key::SafetyDepositBoxV1,
      spl_token_vault::state::Key::ExternalAccountKeyV1 => Key::ExternalAccountKeyV1,
      spl_token_vault::state::Key::VaultV1 => Key::VaultV1,
    }
  }
}


#[derive(GraphQLObject)]
#[graphql(description = "A Vault")]
pub struct Vault {
  pub key: Key,
  /// Store token program used
  pub token_program: String,
  /// Mint that produces the fractional shares
  pub fraction_mint: String,
  /// Authority who can make changes to the vault
  pub authority: String,
  /// treasury where fractional shares are held for redemption by authority
  pub fraction_treasury: String,
  /// treasury where monies are held for fractional share holders to redeem(burn) shares once buyout is made
  pub redeem_treasury: String,
  /// Can authority mint more shares from fraction_mint after activation
  pub allow_further_share_creation: bool,

  /// Must point at an ExternalPriceAccount, which gives permission and price for buyout.
  pub pricing_lookup_address: String,
  /// In inactive state, we use this to set the order key on Safety Deposit Boxes being added and
  /// then we increment it and save so the next safety deposit box gets the next number.
  /// In the Combined state during token redemption by authority, we use it as a decrementing counter each time
  /// The authority of the vault withdrawals a Safety Deposit contents to count down how many
  /// are left to be opened and closed down. Once this hits zero, and the fraction mint has zero shares,
  /// then we can deactivate the vault.
  //pub token_type_count: u8,

  pub state: VaultState,

  // Once combination happens, we copy price per share to vault so that if something nefarious happens
  // to external price account, like price change, we still have the math 'saved' for use in our calcs
  // pub locked_price_per_share: u64,
}

impl From<&spl_token_vault::state::Vault> for Vault {
  fn from(v: &spl_token_vault::state::Vault) -> Self {
    Vault {
      key: Key::from(&v.key),
      token_program: v.token_program.to_string(),
      fraction_mint: v.fraction_mint.to_string(),
      authority: v.authority.to_string(),
      fraction_treasury: v.fraction_treasury.to_string(),
      redeem_treasury: v.redeem_treasury.to_string(),
      allow_further_share_creation: v.allow_further_share_creation,
      pricing_lookup_address: v.pricing_lookup_address.to_string(),
      state: VaultState::from(&v.state)
    }
  }
}

pub struct QueryRoot;

#[juniper::graphql_object(
    Context = Ctx
)]
impl QueryRoot {
  /// get vault by id
  fn vault(context: &Ctx, id: String) -> FieldResult<Vault> {
    let result = context.find_vault(&id).map(|v| Vault::from(v));
    if let Some(v) = result {
      Ok(v)
    } else {
      Err(FieldError::from("Not found"))
    }
  }

  /// get list of all vaults
  fn vaults(context: &Ctx) -> FieldResult<Vec<Vault>> {
    Ok(context.vaults())
  }
}

pub type Schema = RootNode<'static, QueryRoot, EmptyMutation<Ctx>, EmptySubscription<Ctx>>;

pub fn create_schema() -> Schema {
    Schema::new(QueryRoot {}, EmptyMutation::new(), EmptySubscription::new())
}
