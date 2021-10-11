use crate::config::Config;
use console::Emoji;
use serde::{Deserialize, Serialize};
use solana_account_decoder::parse_token::{UiMint, UiTokenAmount};
use solana_cli_output::{display::writeln_name_value, OutputFormat, QuietDisplay, VerboseDisplay};
use std::fmt;

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
