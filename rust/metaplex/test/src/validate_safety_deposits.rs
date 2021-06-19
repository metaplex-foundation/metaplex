use {
    crate::{settings_utils::parse_metadata_keys, PROGRAM_PUBKEY, VAULT_PROGRAM_PUBKEY},
    arrayref::array_ref,
    clap::ArgMatches,
    solana_clap_utils::input_parsers::pubkey_of,
    solana_client::rpc_client::RpcClient,
    solana_program::borsh::try_from_slice_unchecked,
    solana_sdk::{
        pubkey::Pubkey,
        signature::{read_keypair_file, Keypair, Signer},
        transaction::Transaction,
    },
    spl_metaplex::{
        instruction::create_validate_safety_deposit_box_instruction,
        state::{AuctionManager, WinningConfig},
    },
    spl_token_metadata::state::{Key, MasterEdition, EDITION},
    spl_token_vault::state::{Key as VaultKey, SafetyDepositBox},
    std::{collections::HashMap, str::FromStr},
};

pub fn validate_safety_deposits(app_matches: &ArgMatches, payer: Keypair, client: RpcClient) {
    let program_key = Pubkey::from_str(PROGRAM_PUBKEY).unwrap();
    let vault_program_key = Pubkey::from_str(VAULT_PROGRAM_PUBKEY).unwrap();
    let token_metadata_key = spl_token_metadata::id();
    let admin = read_keypair_file(
        app_matches
            .value_of("admin")
            .unwrap_or_else(|| app_matches.value_of("keypair").unwrap()),
    )
    .unwrap();

    let admin_key = admin.pubkey();
    let store_seeds = &[
        spl_metaplex::state::PREFIX.as_bytes(),
        &program_key.as_ref(),
        &admin_key.as_ref(),
    ];
    let (store_key, _) = Pubkey::find_program_address(store_seeds, &program_key);

    let authority = read_keypair_file(
        app_matches
            .value_of("authority")
            .unwrap_or_else(|| app_matches.value_of("keypair").unwrap()),
    )
    .unwrap();
    let metadata_authority = read_keypair_file(
        app_matches
            .value_of("metadata_authority")
            .unwrap_or_else(|| app_matches.value_of("keypair").unwrap()),
    )
    .unwrap();
    let auction_manager_key = pubkey_of(app_matches, "auction_manager").unwrap();
    let mint_map = parse_metadata_keys(&(auction_manager_key.to_string() + ".json"));

    let account = client.get_account(&auction_manager_key).unwrap();
    let manager: AuctionManager = try_from_slice_unchecked(&account.data).unwrap();
    let all_vault_accounts = client.get_program_accounts(&vault_program_key).unwrap();

    let mut safety_deposits = HashMap::new();

    for acc in &all_vault_accounts {
        let obj = &acc.1;
        let obj_key = &acc.0;
        let type_of_obj = obj.data[0];

        if type_of_obj == VaultKey::SafetyDepositBoxV1 as u8 {
            let pubkey_arr = array_ref![obj.data, 1, 32];
            let pubkey = Pubkey::new_from_array(*pubkey_arr);
            if pubkey == manager.vault {
                let safety_deposit: SafetyDepositBox = try_from_slice_unchecked(&obj.data).unwrap();
                safety_deposits.insert(safety_deposit.order, (safety_deposit, *obj_key));
            }
        }
    }

    let winner_config_slot = app_matches
        .value_of("winner_config_slot")
        .unwrap_or("-1")
        .parse::<i64>()
        .unwrap();

    let mut configs_to_validate: Vec<&WinningConfig> = vec![];

    if winner_config_slot == -1 {
        for config in &manager.settings.winning_configs {
            configs_to_validate.push(config);
        }
    } else {
        configs_to_validate.push(&manager.settings.winning_configs[winner_config_slot as usize]);
    }

    for n in 0..configs_to_validate.len() {
        let config = &configs_to_validate[n];
        for item in &config.items {
            let (config_box, box_key) =
                safety_deposits.get(&item.safety_deposit_box_index).unwrap();

            let metadata_seeds = &[
                spl_token_metadata::state::PREFIX.as_bytes(),
                &token_metadata_key.as_ref(),
                &mint_map[n].as_ref(),
            ];
            let (metadata_key, _) =
                Pubkey::find_program_address(metadata_seeds, &token_metadata_key);

            let edition_seeds = &[
                spl_token_metadata::state::PREFIX.as_bytes(),
                &token_metadata_key.as_ref(),
                mint_map[n].as_ref(),
                EDITION.as_bytes(),
            ];
            let (edition_key, _) = Pubkey::find_program_address(edition_seeds, &token_metadata_key);

            let original_authority_seeds = &[
                spl_metaplex::state::PREFIX.as_bytes(),
                manager.auction.as_ref(),
                metadata_key.as_ref(),
            ];
            let (original_authority_key, _) =
                Pubkey::find_program_address(original_authority_seeds, &program_key);

            let master_edition_account = client.get_account(&edition_key);
            let edition_printing_mint: Option<Pubkey>;
            let edition_printing_mint_authority: Option<Pubkey>;
            match master_edition_account {
                Ok(acct) => {
                    if acct.data[0] == Key::MasterEditionV1 as u8 {
                        let master_edition: MasterEdition =
                            try_from_slice_unchecked(&acct.data).unwrap();
                        edition_printing_mint = Some(master_edition.printing_mint);
                        edition_printing_mint_authority = Some(payer.pubkey());
                    } else {
                        edition_printing_mint = None;
                        edition_printing_mint_authority = None;
                    }
                }
                Err(_) => {
                    edition_printing_mint = None;
                    edition_printing_mint_authority = None;
                }
            }

            let instructions = [create_validate_safety_deposit_box_instruction(
                program_key,
                auction_manager_key,
                metadata_key,
                original_authority_key,
                solana_program::system_program::id(),
                store_key,
                *box_key,
                config_box.store,
                config_box.token_mint,
                edition_key,
                manager.vault,
                authority.pubkey(),
                metadata_authority.pubkey(),
                payer.pubkey(),
                edition_printing_mint,
                edition_printing_mint_authority,
            )];

            let signers = [&payer, &authority, &metadata_authority];
            let mut transaction = Transaction::new_with_payer(&instructions, Some(&payer.pubkey()));
            let recent_blockhash = client.get_recent_blockhash().unwrap().0;

            transaction.sign(&signers, recent_blockhash);
            client.send_and_confirm_transaction(&transaction).unwrap();

            println!("Validated safety deposit box {:?} which contained token account {:?} in winning slot {:?}", box_key, config_box.store, n);
        }
    }
}
