use {
    crate::{
        settings_utils::parse_metadata_keys, PROGRAM_PUBKEY, TOKEN_PROGRAM_PUBKEY,
        VAULT_PROGRAM_PUBKEY,
    },
    arrayref::array_ref,
    clap::ArgMatches,
    solana_clap_utils::input_parsers::pubkey_of,
    solana_client::rpc_client::RpcClient,
    solana_program::{
        borsh::try_from_slice_unchecked, instruction::Instruction, program_pack::Pack,
        system_instruction::create_account,
    },
    solana_sdk::{
        pubkey::Pubkey,
        signature::{read_keypair_file, Keypair, Signer},
        transaction::Transaction,
    },
    spl_auction::processor::{AuctionData, BidderMetadata},
    spl_metaplex::{
        instruction::{
            create_redeem_bid_instruction, create_redeem_full_rights_transfer_bid_instruction,
            create_redeem_participation_bid_instruction,
        },
        state::{AuctionManager, Store, WinningConfigItem, WinningConfigType},
    },
    spl_token::{
        instruction::{approve, initialize_account, mint_to},
        state::Account,
    },
    spl_token_metadata::state::{MasterEdition, EDITION},
    spl_token_vault::state::{Key, SafetyDepositBox, Vault},
    std::{collections::HashMap, str::FromStr},
};

struct BaseAccountList {
    auction_manager: Pubkey,
    store: Pubkey,
    destination: Pubkey,
    bid_redemption: Pubkey,
    safety_deposit_box: Pubkey,
    fraction_mint: Pubkey,
    vault: Pubkey,
    auction: Pubkey,
    bidder_metadata: Pubkey,
    bidder: Pubkey,
    payer: Pubkey,
    token_vault_program: Pubkey,
}

#[allow(clippy::too_many_arguments)]
fn redeem_bid_token_only_type<'a>(
    base_account_list: BaseAccountList,
    manager: &AuctionManager,
    winning_config_item: &WinningConfigItem,
    safety_deposit: &SafetyDepositBox,
    program_id: &Pubkey,
    token_program: &Pubkey,
    instructions: &'a mut Vec<Instruction>,
    client: &RpcClient,
) -> Vec<Instruction> {
    println!("You are redeeming a normal token.");

    let BaseAccountList {
        auction_manager,
        store,
        destination,
        bid_redemption,
        safety_deposit_box,
        fraction_mint,
        vault,
        auction,
        bidder_metadata,
        bidder,
        payer,
        token_vault_program,
    } = base_account_list;
    let transfer_seeds = [
        spl_token_vault::state::PREFIX.as_bytes(),
        token_vault_program.as_ref(),
    ];
    let (transfer_authority, _) =
        Pubkey::find_program_address(&transfer_seeds, &token_vault_program);

    instructions.push(create_account(
        &payer,
        &destination,
        client
            .get_minimum_balance_for_rent_exemption(Account::LEN)
            .unwrap(),
        Account::LEN as u64,
        &token_program,
    ));
    // For limited editions, we need owner to be payer to be used in token metadata
    let owner_key = match winning_config_item.winning_config_type {
        spl_metaplex::state::WinningConfigType::TokenOnlyTransfer => &bidder,
        spl_metaplex::state::WinningConfigType::Printing => &payer,
        _ => &bidder,
    };
    instructions.push(
        initialize_account(
            &token_program,
            &destination,
            &safety_deposit.token_mint,
            owner_key,
        )
        .unwrap(),
    );

    instructions.push(
        approve(
            token_program,
            &base_account_list.destination,
            &transfer_authority,
            &owner_key,
            &[owner_key],
            winning_config_item.amount.into(),
        )
        .unwrap(),
    );

    instructions.push(create_redeem_bid_instruction(
        *program_id,
        auction_manager,
        store,
        destination,
        bid_redemption,
        safety_deposit_box,
        vault,
        fraction_mint,
        auction,
        bidder_metadata,
        bidder,
        payer,
        manager.store,
        transfer_authority,
    ));

    let mut new_instructions: Vec<Instruction> = vec![];
    for instr in instructions.iter() {
        new_instructions.push(instr.clone());
    }
    new_instructions
}

#[allow(clippy::too_many_arguments)]
fn redeem_bid_open_edition_type<'a>(
    base_account_list: BaseAccountList,
    manager: &AuctionManager,
    safety_deposit: &SafetyDepositBox,
    program_id: &Pubkey,
    token_program: &Pubkey,
    instructions: &'a mut Vec<Instruction>,
    token_metadata_key: &Pubkey,
    transfer_authority: &Keypair,
    client: &RpcClient,
    app_matches: &ArgMatches,
    bidding_metadata_obj: BidderMetadata,
) -> Vec<Instruction> {
    println!("You are redeeming an open edition.");

    let BaseAccountList {
        auction_manager,
        store,
        destination,
        bid_redemption,
        safety_deposit_box,
        fraction_mint,
        vault,
        auction,
        bidder_metadata,
        bidder,
        payer,
        token_vault_program: _t,
    } = base_account_list;

    let master_edition_seeds = &[
        spl_token_metadata::state::PREFIX.as_bytes(),
        &token_metadata_key.as_ref(),
        safety_deposit.token_mint.as_ref(),
        EDITION.as_bytes(),
    ];
    let (master_edition_key, _) =
        Pubkey::find_program_address(master_edition_seeds, &token_metadata_key);
    let master_edition_account = client.get_account(&master_edition_key).unwrap();
    let master_edition: MasterEdition =
        try_from_slice_unchecked(&master_edition_account.data).unwrap();

    let mut price = bidding_metadata_obj.last_bid;
    if let Some(config) = &manager.settings.participation_config {
        if let Some(fixed_price) = config.fixed_price {
            price = fixed_price
        }
    }

    if app_matches.is_present("mint_it") {
        let auction_acct = client.get_account(&auction).unwrap();
        let auction: AuctionData = try_from_slice_unchecked(&auction_acct.data).unwrap();

        instructions.push(
            mint_to(
                token_program,
                &auction.token_mint,
                &base_account_list.bidder,
                &payer,
                &[&payer],
                price + 2,
            )
            .unwrap(),
        );
    }

    instructions.push(
        approve(
            token_program,
            &base_account_list.bidder,
            &transfer_authority.pubkey(),
            &payer,
            &[&payer],
            price,
        )
        .unwrap(),
    );

    instructions.push(create_account(
        &payer,
        &destination,
        client
            .get_minimum_balance_for_rent_exemption(Account::LEN)
            .unwrap(),
        Account::LEN as u64,
        &token_program,
    ));
    instructions.push(
        initialize_account(
            &token_program,
            &destination,
            &master_edition.printing_mint,
            &payer,
        )
        .unwrap(),
    );

    let state = manager.state.participation_state.clone();

    instructions.push(create_redeem_participation_bid_instruction(
        *program_id,
        auction_manager,
        store,
        destination,
        bid_redemption,
        safety_deposit_box,
        vault,
        fraction_mint,
        auction,
        bidder_metadata,
        bidder,
        payer,
        manager.store,
        transfer_authority.pubkey(),
        manager.accept_payment,
        bidder,
        state.unwrap().printing_authorization_token_account.unwrap(),
    ));

    let mut new_instructions: Vec<Instruction> = vec![];
    for instr in instructions.iter() {
        new_instructions.push(instr.clone());
    }

    new_instructions
}

#[allow(clippy::too_many_arguments)]
fn redeem_bid_rights_transfer<'a>(
    base_account_list: BaseAccountList,
    manager: &AuctionManager,
    safety_deposit: &SafetyDepositBox,
    program_id: &Pubkey,
    token_program: &Pubkey,
    instructions: &'a mut Vec<Instruction>,
    token_metadata_key: &Pubkey,
    client: &RpcClient,
) -> Vec<Instruction> {
    println!("You are redeeming a master edition.");
    let BaseAccountList {
        auction_manager,
        store,
        destination,
        bid_redemption,
        safety_deposit_box,
        fraction_mint,
        vault,
        auction,
        bidder_metadata,
        bidder,
        payer,
        token_vault_program,
    } = base_account_list;

    let master_metadata_seeds = &[
        spl_token_metadata::state::PREFIX.as_bytes(),
        &token_metadata_key.as_ref(),
        &safety_deposit.token_mint.as_ref(),
    ];
    let (master_metadata_key, _) =
        Pubkey::find_program_address(master_metadata_seeds, &token_metadata_key);

    let transfer_seeds = [
        spl_token_vault::state::PREFIX.as_bytes(),
        token_vault_program.as_ref(),
    ];
    let (transfer_authority, _) =
        Pubkey::find_program_address(&transfer_seeds, &token_vault_program);

    instructions.push(create_account(
        &payer,
        &destination,
        client
            .get_minimum_balance_for_rent_exemption(Account::LEN)
            .unwrap(),
        Account::LEN as u64,
        &token_program,
    ));
    instructions.push(
        initialize_account(
            &token_program,
            &destination,
            &safety_deposit.token_mint,
            &bidder,
        )
        .unwrap(),
    );
    instructions.push(
        approve(
            token_program,
            &base_account_list.destination,
            &transfer_authority,
            &base_account_list.bidder,
            &[&base_account_list.bidder],
            1,
        )
        .unwrap(),
    );

    instructions.push(create_redeem_full_rights_transfer_bid_instruction(
        *program_id,
        auction_manager,
        store,
        destination,
        bid_redemption,
        safety_deposit_box,
        vault,
        fraction_mint,
        auction,
        bidder_metadata,
        bidder,
        payer,
        manager.store,
        master_metadata_key,
        bidder,
        transfer_authority,
    ));

    let mut new_instructions: Vec<Instruction> = vec![];
    for instr in instructions.iter() {
        new_instructions.push(instr.clone());
    }
    new_instructions
}

pub fn redeem_bid_wrapper(app_matches: &ArgMatches, payer: Keypair, client: RpcClient) {
    let program_key = Pubkey::from_str(PROGRAM_PUBKEY).unwrap();
    let token_key = Pubkey::from_str(TOKEN_PROGRAM_PUBKEY).unwrap();
    let token_metadata_key = spl_token_metadata::id();

    let token_vault_program = Pubkey::from_str(VAULT_PROGRAM_PUBKEY).unwrap();

    let wallet = read_keypair_file(
        app_matches
            .value_of("wallet")
            .unwrap_or_else(|| app_matches.value_of("keypair").unwrap()),
    )
    .unwrap();

    let auction_manager_key = pubkey_of(app_matches, "auction_manager").unwrap();
    let mint_map = parse_metadata_keys(&(auction_manager_key.to_string() + ".json"));

    let account = client.get_account(&auction_manager_key).unwrap();
    let manager: AuctionManager = try_from_slice_unchecked(&account.data).unwrap();

    let store_account = client.get_account(&manager.store).unwrap();
    let store: Store = try_from_slice_unchecked(&store_account.data).unwrap();
    let all_vault_accounts = client.get_program_accounts(&token_vault_program).unwrap();

    let mut safety_deposits = HashMap::new();

    for acc in &all_vault_accounts {
        let obj = &acc.1;
        let obj_key = &acc.0;
        let type_of_obj = obj.data[0];

        if type_of_obj == Key::SafetyDepositBoxV1 as u8 {
            let pubkey_arr = array_ref![obj.data, 1, 32];
            let pubkey = Pubkey::new_from_array(*pubkey_arr);
            if pubkey == manager.vault {
                let safety_deposit: SafetyDepositBox = try_from_slice_unchecked(&obj.data).unwrap();
                safety_deposits.insert(safety_deposit.order, (safety_deposit, obj_key));
            }
        }
    }
    let wallet_key = wallet.pubkey();
    let meta_path = [
        spl_auction::PREFIX.as_bytes(),
        store.auction_program.as_ref(),
        manager.auction.as_ref(),
        wallet_key.as_ref(),
        "metadata".as_bytes(),
    ];

    let (meta_key, _) = Pubkey::find_program_address(&meta_path, &store.auction_program);
    let bidding_metadata = client.get_account(&meta_key).unwrap();
    let auction_data = client.get_account(&manager.auction).unwrap();
    let vault_data = client.get_account(&manager.vault).unwrap();
    let auction: AuctionData = try_from_slice_unchecked(&auction_data.data).unwrap();
    let bid: BidderMetadata = try_from_slice_unchecked(&bidding_metadata.data).unwrap();
    let vault: Vault = try_from_slice_unchecked(&vault_data.data).unwrap();

    let redemption_path = [
        spl_metaplex::state::PREFIX.as_bytes(),
        manager.auction.as_ref(),
        &meta_key.as_ref(),
    ];
    let (bid_redemption_key, _) = Pubkey::find_program_address(&redemption_path, &program_key);

    if let Some(winning_index) = auction.is_winner(&bid.bidder_pubkey) {
        let destination = Keypair::new();
        let winning_config = &manager.settings.winning_configs[winning_index];
        for item in &winning_config.items {
            let safety_deposit_result =
                safety_deposits.get(&item.safety_deposit_box_index).unwrap();
            let safety_deposit = &safety_deposit_result.0;
            let safety_deposit_key = safety_deposit_result.1;
            let signers: Vec<&Keypair> = vec![&wallet, &payer, &destination];
            let mut instructions: Vec<Instruction> = vec![];

            let base_account_list = BaseAccountList {
                auction_manager: auction_manager_key,
                store: safety_deposit.store,
                destination: destination.pubkey(),
                bid_redemption: bid_redemption_key,
                safety_deposit_box: *safety_deposit_key,
                fraction_mint: vault.fraction_mint,
                vault: manager.vault,
                auction: manager.auction,
                bidder_metadata: meta_key,
                bidder: wallet.pubkey(),
                payer: payer.pubkey(),
                token_vault_program,
            };

            let instructions = match item.winning_config_type {
                WinningConfigType::TokenOnlyTransfer | WinningConfigType::Printing => {
                    redeem_bid_token_only_type(
                        base_account_list,
                        &manager,
                        item,
                        safety_deposit,
                        &program_key,
                        &token_key,
                        &mut instructions,
                        &client,
                    )
                }
                WinningConfigType::FullRightsTransfer => redeem_bid_rights_transfer(
                    base_account_list,
                    &manager,
                    safety_deposit,
                    &program_key,
                    &token_key,
                    &mut instructions,
                    &token_metadata_key,
                    &client,
                ),
            };

            let mut transaction = Transaction::new_with_payer(&instructions, Some(&payer.pubkey()));
            let recent_blockhash = client.get_recent_blockhash().unwrap().0;

            transaction.sign(&signers, recent_blockhash);
            client.send_and_confirm_transaction(&transaction).unwrap();

            println!(
            "Sent prize to {:?}. If this is a Limited Edition, this is actually an authorization token to receive your prize from token metadata. To get it, you can run the following:  Ex: ./target/debug/spl-token-metadata-test-client mint_new_edition_from_master_edition_via_token --mint {:?} --account {:?}. Now let's see if you have an open edition to redeem...",
            destination.pubkey(), mint_map[safety_deposit.order as usize], destination.pubkey()
        )
        }
    } else {
        println!("You are not a winner, but lets see if you have open editions to redeem...");
    }

    if let Some(participation_config) = &manager.settings.participation_config {
        println!("This auction has an open edition. Submitting!");
        let safety_deposit_result = safety_deposits
            .get(&participation_config.safety_deposit_box_index)
            .unwrap();
        let destination = Keypair::new();
        let safety_deposit = &safety_deposit_result.0;
        let safety_deposit_key = safety_deposit_result.1;
        let transfer_authority = Keypair::new();
        let signers = vec![&wallet, &transfer_authority, &payer, &destination];
        let mut instructions: Vec<Instruction> = vec![];
        let base_account_list = BaseAccountList {
            auction_manager: auction_manager_key,
            store: safety_deposit.store,
            destination: destination.pubkey(),
            bid_redemption: bid_redemption_key,
            safety_deposit_box: *safety_deposit_key,
            fraction_mint: vault.fraction_mint,
            vault: manager.vault,
            auction: manager.auction,
            bidder_metadata: meta_key,
            bidder: wallet.pubkey(),
            payer: payer.pubkey(),
            token_vault_program,
        };

        let instructions = redeem_bid_open_edition_type(
            base_account_list,
            &manager,
            safety_deposit,
            &program_key,
            &token_key,
            &mut instructions,
            &token_metadata_key,
            &transfer_authority,
            &client,
            &app_matches,
            bid,
        );

        let mut transaction = Transaction::new_with_payer(&instructions, Some(&payer.pubkey()));
        let recent_blockhash = client.get_recent_blockhash().unwrap().0;

        transaction.sign(&signers, recent_blockhash);
        client.send_and_confirm_transaction(&transaction).unwrap();
        println!("Open edition authorization token sent to {:?}. To receive your open edition, you can call token metadata now with it.  Ex: ./target/debug/spl-token-metadata-test-client mint_new_edition_from_master_edition_via_token --mint {:?} --account {:?}", destination.pubkey(), safety_deposit.token_mint, destination.pubkey());
    }
}
