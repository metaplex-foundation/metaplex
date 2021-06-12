use {
    serde::{Deserialize, Serialize},
    solana_program::pubkey::Pubkey,
    spl_metaplex::state::{
        AuctionManagerSettings, NonWinningConstraint, ParticipationConfig, WinningConfig,
        WinningConfigItem, WinningConfigType, WinningConstraint,
    },
    std::fs::File,
};
#[derive(Serialize, Deserialize, Clone)]
pub struct JsonWinningConfig {
    pub items: Vec<JsonWinningConfigItem>,
}
#[derive(Serialize, Deserialize, Clone)]
pub struct JsonWinningConfigItem {
    pub safety_deposit_box_index: u8,
    pub amount: u8,
    pub winning_config_type: u8,
    pub desired_supply: Option<u64>,
    pub mint: Option<String>,
    pub account: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct JsonParticipationConfig {
    pub safety_deposit_box_index: u8,
    pub mint: Option<String>,
    pub account: Option<String>,
    pub winner_constraint: u8,
    pub non_winning_constraint: u8,
    pub fixed_price: Option<u64>,
}

#[derive(Serialize, Deserialize)]
pub struct JsonAuctionManagerSettings {
    pub winning_configs: Vec<JsonWinningConfig>,

    pub participation_config: Option<JsonParticipationConfig>,
}

pub fn parse_metadata_keys(settings_file: &str) -> Vec<Pubkey> {
    let file = File::open(settings_file).unwrap();
    let json: Vec<[u8; 32]> = serde_json::from_reader(file).unwrap();
    json.iter().map(|x| Pubkey::new(x)).collect::<Vec<_>>()
}

pub fn parse_settings(settings_file: &str) -> (AuctionManagerSettings, JsonAuctionManagerSettings) {
    let file = File::open(settings_file).unwrap();
    let json_settings: JsonAuctionManagerSettings = serde_json::from_reader(file).unwrap();
    let mut parsed_winning_configs: Vec<WinningConfig> = vec![];

    for n in 0..json_settings.winning_configs.len() {
        let json_box = json_settings.winning_configs[n].clone();
        let mut items: Vec<WinningConfigItem> = vec![];
        for item in &json_box.items {
            items.push(WinningConfigItem {
                safety_deposit_box_index: item.safety_deposit_box_index,
                amount: item.amount,
                winning_config_type: match item.winning_config_type {
                    0 => WinningConfigType::TokenOnlyTransfer,
                    1 => WinningConfigType::FullRightsTransfer,
                    2 => WinningConfigType::Printing,
                    _ => WinningConfigType::TokenOnlyTransfer,
                },
            })
        }
        parsed_winning_configs.push(WinningConfig { items })
    }

    let settings = AuctionManagerSettings {
        winning_configs: parsed_winning_configs,
        participation_config: match &json_settings.participation_config {
            Some(val) => Some(ParticipationConfig {
                winner_constraint: match val.winner_constraint {
                    0 => WinningConstraint::NoParticipationPrize,
                    1 => WinningConstraint::ParticipationPrizeGiven,
                    _ => WinningConstraint::NoParticipationPrize,
                },
                non_winning_constraint: match val.non_winning_constraint {
                    0 => NonWinningConstraint::NoParticipationPrize,
                    1 => NonWinningConstraint::GivenForFixedPrice,
                    2 => NonWinningConstraint::GivenForBidPrice,
                    _ => NonWinningConstraint::NoParticipationPrize,
                },
                safety_deposit_box_index: val.safety_deposit_box_index,
                fixed_price: val.fixed_price,
            }),
            None => None,
        },
    };

    (settings, json_settings)
}
