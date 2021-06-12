use {
    crate::{
        settings_utils::{parse_settings, JsonAuctionManagerSettings},
        vault_utils::{activate_vault, add_token_to_vault, combine_vault, initialize_vault},
        AUCTION_PROGRAM_PUBKEY, PROGRAM_PUBKEY, TOKEN_PROGRAM_PUBKEY, VAULT_PROGRAM_PUBKEY,
    },
    clap::ArgMatches,
    solana_clap_utils::input_parsers::pubkey_of,
    solana_client::rpc_client::RpcClient,
    solana_program::{
        borsh::try_from_slice_unchecked, instruction::Instruction, program_pack::Pack,
    },
    solana_sdk::{
        pubkey::Pubkey,
        signature::{read_keypair_file, Keypair, Signer},
        system_instruction::create_account,
        transaction::Transaction,
    },
    spl_auction::{
        instruction::create_auction_instruction,
        processor::{create_auction::CreateAuctionArgs, PriceFloor, WinnerLimit},
    },
    spl_metaplex::{
        instruction::create_init_auction_manager_instruction,
        instruction::create_set_store_instruction,
        instruction::create_validate_participation_instruction, state::AuctionManager,
    },
    spl_token::{
        instruction::{initialize_account, initialize_mint},
        state::{Account, Mint},
    },
    spl_token_metadata::state::{MasterEdition, Metadata, EDITION},
    spl_token_vault::{
        instruction::create_update_external_price_account_instruction,
        state::MAX_EXTERNAL_ACCOUNT_SIZE,
    },
    std::{convert::TryInto, fs::File, io::Write, str::FromStr},
};

fn find_or_initialize_external_account<'a>(
    app_matches: &ArgMatches,
    payer: &Keypair,
    vault_program_key: &Pubkey,
    token_key: &Pubkey,
    client: &RpcClient,
    payer_mint_key: &'a Keypair,
    external_keypair: &'a Keypair,
) -> Pubkey {
    let external_key: Pubkey;
    if !app_matches.is_present("external_price_account") {
        let mut instructions: Vec<Instruction> = vec![];
        let mut signers: Vec<&Keypair> = vec![&payer, &external_keypair];
        instructions.push(create_account(
            &payer.pubkey(),
            &payer_mint_key.pubkey(),
            client
                .get_minimum_balance_for_rent_exemption(Mint::LEN)
                .unwrap(),
            Mint::LEN as u64,
            &token_key,
        ));
        instructions.push(
            initialize_mint(
                &token_key,
                &payer_mint_key.pubkey(),
                &payer.pubkey(),
                Some(&payer.pubkey()),
                0,
            )
            .unwrap(),
        );
        instructions.push(create_account(
            &payer.pubkey(),
            &external_keypair.pubkey(),
            client
                .get_minimum_balance_for_rent_exemption(MAX_EXTERNAL_ACCOUNT_SIZE)
                .unwrap(),
            MAX_EXTERNAL_ACCOUNT_SIZE as u64,
            &vault_program_key,
        ));
        instructions.push(create_update_external_price_account_instruction(
            *vault_program_key,
            external_keypair.pubkey(),
            0,
            payer_mint_key.pubkey(),
            true,
        ));

        signers.push(&payer_mint_key);
        signers.push(&external_keypair);

        let mut transaction = Transaction::new_with_payer(&instructions, Some(&payer.pubkey()));
        let recent_blockhash = client.get_recent_blockhash().unwrap().0;

        transaction.sign(&signers, recent_blockhash);
        client.send_and_confirm_transaction(&transaction).unwrap();
        external_key = external_keypair.pubkey();
    } else {
        external_key = pubkey_of(app_matches, "external_price_account").unwrap();
    }

    external_key
}

fn find_or_initialize_store(
    app_matches: &ArgMatches,
    payer: &Keypair,
    client: &RpcClient,
) -> Pubkey {
    let admin = read_keypair_file(
        app_matches
            .value_of("admin")
            .unwrap_or_else(|| app_matches.value_of("keypair").unwrap()),
    )
    .unwrap();

    let program_key = Pubkey::from_str(PROGRAM_PUBKEY).unwrap();
    let admin_key = admin.pubkey();

    let seeds = &[
        spl_metaplex::state::PREFIX.as_bytes(),
        &program_key.as_ref(),
        &admin_key.as_ref(),
    ];
    let (store_key, _) = Pubkey::find_program_address(seeds, &program_key);

    let instructions = [create_set_store_instruction(
        program_key,
        store_key,
        admin.pubkey(),
        payer.pubkey(),
        true,
    )];

    let mut transaction = Transaction::new_with_payer(&instructions, Some(&payer.pubkey()));
    let recent_blockhash = client.get_recent_blockhash().unwrap().0;

    transaction.sign(&[&admin, &payer], recent_blockhash);
    client.send_and_confirm_transaction(&transaction).unwrap();
    println!("Store created {:?}", store_key);
    store_key
}

fn find_or_initialize_auction(
    app_matches: &ArgMatches,
    vault_key: &Pubkey,
    program_key: &Pubkey,
    auction_program_key: &Pubkey,
    payer_mint_key: &Pubkey,
    payer: &Keypair,
    client: &RpcClient,
) -> Pubkey {
    let auction_key: Pubkey;
    if !app_matches.is_present("auction") {
        let signers: Vec<&Keypair> = vec![&payer];

        let winner_limit = app_matches
            .value_of("winner_limit")
            .unwrap_or("0")
            .parse::<u64>()
            .unwrap();

        let gap_time = app_matches
            .value_of("gap_time")
            .unwrap_or("1200")
            .parse::<u64>()
            .unwrap();

        let end_time = app_matches
            .value_of("end_time")
            .unwrap_or("1200")
            .parse::<u64>()
            .unwrap();

        let auction_path = [
            spl_auction::PREFIX.as_bytes(),
            auction_program_key.as_ref(),
            &vault_key.to_bytes(),
        ];

        // Derive the address we'll store the auction in, and confirm it matches what we expected the
        // user to provide.
        let (actual_auction_key, _) =
            Pubkey::find_program_address(&auction_path, auction_program_key);

        // You'll notice that the authority IS what will become the auction manager ;)
        let authority_seeds = &[
            spl_metaplex::state::PREFIX.as_bytes(),
            &actual_auction_key.as_ref(),
        ];
        let (auction_manager_key, _) = Pubkey::find_program_address(authority_seeds, &program_key);

        let instructions = [create_auction_instruction(
            *auction_program_key,
            payer.pubkey(),
            CreateAuctionArgs {
                resource: *vault_key,
                authority: auction_manager_key,
                end_auction_at: Some(end_time.try_into().unwrap()),
                end_auction_gap: Some(gap_time.try_into().unwrap()),
                winners: match winner_limit {
                    0 => WinnerLimit::Unlimited(0),
                    val => WinnerLimit::Capped(val.try_into().unwrap()),
                },
                token_mint: *payer_mint_key,
                price_floor: PriceFloor::None([0; 32]),
            },
        )];

        let mut transaction = Transaction::new_with_payer(&instructions, Some(&payer.pubkey()));
        let recent_blockhash = client.get_recent_blockhash().unwrap().0;

        transaction.sign(&signers, recent_blockhash);
        client.send_and_confirm_transaction(&transaction).unwrap();
        auction_key = actual_auction_key;
    } else {
        auction_key = pubkey_of(app_matches, "auction").unwrap();
    }

    auction_key
}

fn add_tokens_to_vault_activate_and_return_mints_and_open_edition(
    app_matches: &ArgMatches,
    json_settings: &JsonAuctionManagerSettings,
    vault_key: &Pubkey,
    payer: &Keypair,
    auction_manager_key: &Pubkey,
    client: &RpcClient,
) -> (Vec<Pubkey>, Option<Pubkey>, Option<Pubkey>, Option<Pubkey>) {
    let mut mint_keys: Vec<Pubkey> = vec![];
    let open_edition_mint_key: Option<Pubkey>;
    let mut open_edition_safety_deposit: Option<Pubkey> = None;
    let mut open_edition_safety_deposit_store: Option<Pubkey> = None;
    if !app_matches.is_present("vault") {
        for config in &json_settings.winning_configs {
            for item in &config.items {
                let (_, actual_mint, _) = add_token_to_vault(
                    &payer,
                    vault_key,
                    &payer,
                    client,
                    item.amount.into(),
                    match &item.mint {
                        Some(val) => Some(Pubkey::from_str(&val).unwrap()),
                        None => None,
                    },
                    match &item.account {
                        Some(val) => Some(Pubkey::from_str(&val).unwrap()),
                        None => None,
                    },
                    !matches!(item.winning_config_type, 0),
                    item.desired_supply,
                    false,
                );
                mint_keys.push(actual_mint);
            }
        }
        if let Some(config) = &json_settings.participation_config {
            let (safety_deposit_box, actual_open_edition_mint, store) = add_token_to_vault(
                &payer,
                vault_key,
                &payer,
                client,
                1,
                match &config.mint {
                    Some(val) => Some(Pubkey::from_str(&val).unwrap()),
                    None => None,
                },
                match &config.account {
                    Some(val) => Some(Pubkey::from_str(&val).unwrap()),
                    None => None,
                },
                true,
                None,
                true,
            );
            open_edition_mint_key = Some(actual_open_edition_mint);
            open_edition_safety_deposit = Some(safety_deposit_box);
            open_edition_safety_deposit_store = Some(store);
        } else {
            open_edition_mint_key = None; // Return nothing, it wont be used
        }

        activate_vault(&payer, vault_key, &payer, client);

        combine_vault(&payer, auction_manager_key, vault_key, &payer, client);
    } else {
        open_edition_mint_key = match &json_settings.participation_config {
            Some(val) => match &val.mint {
                Some(mint) => Some(Pubkey::from_str(&mint).unwrap()),
                None => None, // If a config was provided for existing vault but no mint, cant do anything here.
            },
            None => None, // Return nothing, it wont be used
        }
    }

    (
        mint_keys,
        open_edition_mint_key,
        open_edition_safety_deposit,
        open_edition_safety_deposit_store,
    )
}

pub fn initialize_auction_manager(
    app_matches: &ArgMatches,
    payer: Keypair,
    client: RpcClient,
) -> (Pubkey, AuctionManager) {
    let program_key = Pubkey::from_str(PROGRAM_PUBKEY).unwrap();
    let vault_program_key = Pubkey::from_str(VAULT_PROGRAM_PUBKEY).unwrap();
    let auction_program_key = Pubkey::from_str(AUCTION_PROGRAM_PUBKEY).unwrap();
    let accept_payment_account_key = Keypair::new();
    let printing_token_account_key = Keypair::new();
    let token_key = Pubkey::from_str(TOKEN_PROGRAM_PUBKEY).unwrap();
    let authority = pubkey_of(app_matches, "authority").unwrap_or_else(|| payer.pubkey());
    let store_key = find_or_initialize_store(app_matches, &payer, &client);

    let (settings, json_settings) = parse_settings(app_matches.value_of("settings_file").unwrap());

    let vault_key: Pubkey;
    let mut instructions: Vec<Instruction> = vec![];
    let mut signers: Vec<&Keypair> = vec![&payer, &accept_payment_account_key];

    let payer_mint_key = Keypair::new();
    let external_keypair = Keypair::new();
    let external_key = find_or_initialize_external_account(
        app_matches,
        &payer,
        &vault_program_key,
        &token_key,
        &client,
        &payer_mint_key,
        &external_keypair,
    );

    // Create vault first, so we can use it to make auction, then add stuff to vault.
    if !app_matches.is_present("vault") {
        vault_key = initialize_vault(&payer, &external_key, &payer, &client);
    } else {
        vault_key = pubkey_of(app_matches, "vault").unwrap();
    }

    let auction_key = find_or_initialize_auction(
        app_matches,
        &vault_key,
        &program_key,
        &auction_program_key,
        &payer_mint_key.pubkey(),
        &payer,
        &client,
    );
    let seeds = &[
        spl_metaplex::state::PREFIX.as_bytes(),
        &auction_key.as_ref(),
    ];
    let (auction_manager_key, _) = Pubkey::find_program_address(seeds, &program_key);

    let (actual_mints, open_edition_mint_key, open_edition_safety_deposit, open_edition_store) =
        add_tokens_to_vault_activate_and_return_mints_and_open_edition(
            app_matches,
            &json_settings,
            &vault_key,
            &payer,
            &auction_manager_key,
            &client,
        );

    let actual_mints_to_json = serde_json::to_string(&actual_mints).unwrap();
    let mut file = File::create(auction_manager_key.to_string() + ".json").unwrap();
    file.write_all(&actual_mints_to_json.as_bytes()).unwrap();
    println!("Printed mints to file {:?}.json", auction_manager_key);

    let token_metadata = spl_token_metadata::id();

    instructions.push(create_account(
        &payer.pubkey(),
        &accept_payment_account_key.pubkey(),
        client
            .get_minimum_balance_for_rent_exemption(Account::LEN)
            .unwrap(),
        Account::LEN as u64,
        &token_key,
    ));
    instructions.push(
        initialize_account(
            &token_key,
            &accept_payment_account_key.pubkey(),
            &payer_mint_key.pubkey(),
            &auction_manager_key,
        )
        .unwrap(),
    );

    instructions.push(create_init_auction_manager_instruction(
        program_key,
        auction_manager_key,
        vault_key,
        auction_key,
        authority,
        payer.pubkey(),
        accept_payment_account_key.pubkey(),
        store_key,
        settings,
    ));

    if let Some(mint_key) = open_edition_mint_key {
        let metadata_seeds = &[
            spl_token_metadata::state::PREFIX.as_bytes(),
            &token_metadata.as_ref(),
            &mint_key.as_ref(),
        ];
        let (metadata_key, _) =
            Pubkey::find_program_address(metadata_seeds, &spl_token_metadata::id());
        let metadata_account = client.get_account(&metadata_key).unwrap();
        let metadata: Metadata = try_from_slice_unchecked(&metadata_account.data).unwrap();

        let metadata_authority = metadata.update_authority;

        let edition_seeds = &[
            spl_token_metadata::state::PREFIX.as_bytes(),
            token_metadata.as_ref(),
            mint_key.as_ref(),
            EDITION.as_bytes(),
        ];
        let (edition_key, _) = Pubkey::find_program_address(edition_seeds, &token_metadata);
        let master_edition_account = client.get_account(&edition_key).unwrap();
        let master_edition: MasterEdition =
            try_from_slice_unchecked(&master_edition_account.data).unwrap();
        let open_edition_printing_mint = master_edition.printing_mint;

        instructions.push(create_account(
            &payer.pubkey(),
            &printing_token_account_key.pubkey(),
            client
                .get_minimum_balance_for_rent_exemption(Account::LEN)
                .unwrap(),
            Account::LEN as u64,
            &token_key,
        ));
        instructions.push(
            initialize_account(
                &token_key,
                &printing_token_account_key.pubkey(),
                &open_edition_printing_mint,
                &auction_manager_key,
            )
            .unwrap(),
        );
        signers.push(&printing_token_account_key);

        instructions.push(create_validate_participation_instruction(
            program_key,
            auction_manager_key,
            metadata_key,
            edition_key,
            printing_token_account_key.pubkey(),
            authority,
            metadata_authority,
            store_key,
            open_edition_safety_deposit.unwrap(),
            open_edition_store.unwrap(),
            vault_key,
        ));
    }

    let mut transaction = Transaction::new_with_payer(&instructions, Some(&payer.pubkey()));
    let recent_blockhash = client.get_recent_blockhash().unwrap().0;

    transaction.sign(&signers, recent_blockhash);
    client.send_and_confirm_transaction(&transaction).unwrap();
    let account = client.get_account(&auction_manager_key).unwrap();
    let manager: AuctionManager = try_from_slice_unchecked(&account.data).unwrap();

    (auction_manager_key, manager)
}
