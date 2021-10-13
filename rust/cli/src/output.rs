use crate::config::Config;
use console::Emoji;
use serde::{Deserialize, Serialize};
use solana_account_decoder::parse_token::{UiMint, UiTokenAmount};
use solana_cli_output::{display::writeln_name_value, OutputFormat, QuietDisplay, VerboseDisplay};
use spl_token_metadata::state::{Creator, Data, Key, Metadata};
use std::fmt;

pub type StringAmount = String;

#[allow(dead_code)]
static WARNING: Emoji = Emoji("⚠️", "!");

pub(crate) fn println_display(config: &Config, message: String) {
    match config.output_format {
        OutputFormat::Display | OutputFormat::DisplayVerbose => {
            println!("{}", message);
        }
        _ => {}
    }
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CliTokenAmount {
    #[serde(flatten)]
    pub(crate) amount: UiTokenAmount,
}

impl QuietDisplay for CliTokenAmount {}
impl VerboseDisplay for CliTokenAmount {
    fn write_str(&self, w: &mut dyn fmt::Write) -> fmt::Result {
        writeln!(w, "ui amount: {}", self.amount.real_number_string_trimmed())?;
        writeln!(w, "decimals: {}", self.amount.decimals)?;
        writeln!(w, "amount: {}", self.amount.amount)
    }
}

impl fmt::Display for CliTokenAmount {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        writeln!(f, "{}", self.amount.real_number_string_trimmed())
    }
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CliMint {
    pub(crate) address: String,
    #[serde(flatten)]
    pub(crate) mint: UiMint,
}

impl QuietDisplay for CliMint {}
impl VerboseDisplay for CliMint {}

impl fmt::Display for CliMint {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        writeln_name_value(f, "Address:", &self.address)?;
        writeln_name_value(
            f,
            "Mint Authority:",
            &self
                .mint
                .mint_authority
                .as_ref()
                .unwrap_or(&String::from("")),
        )?;
        writeln!(f, "Supply: {}", self.mint.supply)?;
        writeln!(f, "Decimals: {}", self.mint.decimals)?;
        writeln_name_value(
            f,
            "Freeze Authority:",
            &self
                .mint
                .freeze_authority
                .as_ref()
                .unwrap_or(&String::from("")),
        )?;
        Ok(())
    }
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CliMetadata {
    pub address: String,
    pub metadata: UiMetadata,
}

impl QuietDisplay for CliMetadata {}
impl VerboseDisplay for CliMetadata {}
impl fmt::Display for CliMetadata {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        writeln!(f, "Address: {}", self.address)?;
        writeln!(f, "{}", self.metadata)?;
        Ok(())
    }
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct UiMetadata {
    pub key: String,
    pub update_authority: String,
    pub mint: String,
    #[serde(flatten)]
    pub data: UiData,
    pub primary_sale_happened: bool,
    pub is_mutable: bool,
    pub edition_nonce: Option<StringAmount>,
}

// Consider moving this to token-metadata::program::src::state with Key struct
fn key_to_string(value: &Key) -> String {
    match value {
        Key::EditionMarker => "EditionMarker".to_string(),
        Key::EditionV1 => "EditionV1".to_string(),
        Key::MasterEditionV1 => "MasterEditionV1".to_string(),
        Key::MasterEditionV2 => "MasterEditionV2".to_string(),
        Key::MetadataV1 => "MetadataV1".to_string(),
        Key::ReservationListV1 => "ReservationListV1".to_string(),
        Key::ReservationListV2 => "ReservationListV2".to_string(),
        Key::Uninitialized => "Uninitialized".to_string(),
    }
}

impl From<Metadata> for UiMetadata {
    fn from(metadata: Metadata) -> Self {
        Self {
            key: key_to_string(&metadata.key),
            update_authority: metadata.update_authority.to_string(),
            mint: metadata.mint.to_string(),
            data: UiData::from(metadata.data),
            primary_sale_happened: metadata.primary_sale_happened,
            is_mutable: metadata.is_mutable,
            edition_nonce: metadata.edition_nonce.map(|n| n.to_string()),
        }
    }
}

impl fmt::Display for UiMetadata {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        writeln!(f, "Key: {}", self.key)?;
        writeln!(f, "Update Authority: {}", self.update_authority)?;
        writeln!(f, "Mint: {}", self.mint)?;
        writeln!(f, "{}", self.data)?;
        writeln!(f, "Primary Sale Happened: {}", self.primary_sale_happened)?;
        writeln!(f, "Is Mutable: {}", self.is_mutable)?;
        writeln_name_value(
            f,
            "Edition Nonce:",
            &self.edition_nonce.as_ref().unwrap_or(&String::from("")),
        )?;
        Ok(())
    }
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct UiData {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub seller_fee_basis_points: StringAmount,
    pub creators: Option<Vec<UiCreator>>,
}

impl From<Data> for UiData {
    fn from(data: Data) -> Self {
        Self {
            name: data.name.trim_end_matches(char::from(0)).to_string(),
            symbol: data.symbol.trim_end_matches(char::from(0)).to_string(),
            uri: data.uri.trim_end_matches(char::from(0)).to_string(),
            seller_fee_basis_points: data.seller_fee_basis_points.to_string(),
            creators: data
                .creators
                .map(|c_vec| c_vec.iter().map(|c| UiCreator::from(c)).collect()),
        }
    }
}

impl fmt::Display for UiData {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        writeln!(f, "Name: {}", self.name)?;
        writeln!(f, "Symbol: {}", self.symbol)?;
        writeln!(f, "Uri: {}", self.uri)?;
        writeln!(
            f,
            "Seller Fee Basis Points: {}",
            self.seller_fee_basis_points
        )?;
        if let Some(creators) = &self.creators {
            writeln!(f, "Creators: {}", creators.len())?;
            for (i, c) in creators.iter().enumerate() {
                writeln!(f, "  [{}] {}", i, c)?;
            }
        };
        Ok(())
    }
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct UiCreator {
    pub address: String,
    pub verified: bool,
    // In percentages, NOT basis points ;) Watch out!
    pub share: StringAmount,
}

impl From<&Creator> for UiCreator {
    fn from(creator: &Creator) -> Self {
        Self {
            address: creator.address.to_string(),
            verified: creator.verified,
            share: creator.share.to_string(),
        }
    }
}

impl fmt::Display for UiCreator {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        writeln!(f, "Address: {}", self.address)?;
        writeln!(f, "Verified: {}", self.verified)?;
        writeln!(f, "Share: {}", self.share)?;
        Ok(())
    }
}
