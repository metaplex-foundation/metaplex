use {
    crate::{TOKEN_PROGRAM_PUBKEY, VAULT_PROGRAM_PUBKEY},
    solana_client::rpc_client::RpcClient,
    solana_program::{borsh::try_from_slice_unchecked, program_pack::Pack},
    solana_sdk::{
        pubkey::Pubkey,
        signature::{Keypair, Signer},
        system_instruction::create_account,
        transaction::Transaction,
    },
    spl_token::{
        instruction::{approve, initialize_account, initialize_mint, mint_to},
        state::{Account, Mint},
    },
    spl_token_metadata::{
        instruction::{create_master_edition, create_metadata_accounts},
        state::EDITION,
    },
    spl_token_vault::{
        instruction::{
            create_activate_vault_instruction, create_add_token_to_inactive_vault_instruction,
            create_combine_vault_instruction, create_init_vault_instruction,
        },
        state::{ExternalPriceAccount, Vault, VaultState, MAX_VAULT_SIZE},
    },
    std::str::FromStr,
};

#[allow(clippy::clone_on_copy)]
#[allow(clippy::too_many_arguments)]
pub fn add_token_to_vault(
    vault_authority: &Keypair,
    vault_key: &Pubkey,
    payer: &Keypair,
    client: &RpcClient,
    amount: u64,
    existing_mint: Option<Pubkey>,
    existing_account: Option<Pubkey>,
    is_master_edition: bool,
    token_supply: Option<u64>,
    is_participation: bool,
) -> (Pubkey, Pubkey, Pubkey) {
    let program_key = Pubkey::from_str(VAULT_PROGRAM_PUBKEY).unwrap();
    let token_key = Pubkey::from_str(TOKEN_PROGRAM_PUBKEY).unwrap();

    let store = Keypair::new();
    let mut instructions = vec![];
    let signers = vec![payer, &store];
    let token_mint = Keypair::new();

    let mint_key = match existing_mint {
        None => {
            // Due to txn size limits, need to do this in a separate one.
            let create_signers = [&payer, &token_mint];
            let create_mint_instructions = [
                create_account(
                    &payer.pubkey(),
                    &token_mint.pubkey(),
                    client
                        .get_minimum_balance_for_rent_exemption(Mint::LEN)
                        .unwrap(),
                    Mint::LEN as u64,
                    &token_key,
                ),
                initialize_mint(
                    &token_key,
                    &token_mint.pubkey(),
                    &payer.pubkey(),
                    Some(&payer.pubkey()),
                    0,
                )
                .unwrap(),
            ];
            let mut transaction =
                Transaction::new_with_payer(&create_mint_instructions, Some(&payer.pubkey()));
            let recent_blockhash = client.get_recent_blockhash().unwrap().0;
            transaction.sign(&create_signers, recent_blockhash);
            client.send_and_confirm_transaction(&transaction).unwrap();
            token_mint.pubkey()
        }
        Some(val) => val,
    };

    // The Printing mint needs to be the store type if we're doing limited editions since we're actually
    // handing out authorization tokens
    let printing_mint = Keypair::new();
    let one_time_printing_authorization_mint = Keypair::new();
    let store_mint_key = match token_supply {
        Some(_) => printing_mint.pubkey(),
        None => mint_key,
    };

    let seeds = &[
        spl_token_vault::state::PREFIX.as_bytes(),
        &vault_key.as_ref(),
        &store_mint_key.as_ref(),
    ];
    let (safety_deposit_box, _) = Pubkey::find_program_address(seeds, &program_key);
    let seeds = &[
        spl_token_vault::state::PREFIX.as_bytes(),
        &program_key.as_ref(),
    ];
    let (authority, _) = Pubkey::find_program_address(seeds, &program_key);
    let token_metadata = spl_token_metadata::id();
    let metadata_seeds = &[
        spl_token_metadata::state::PREFIX.as_bytes(),
        &token_metadata.as_ref(),
        &mint_key.as_ref(),
    ];
    let (metadata_key, _) = Pubkey::find_program_address(metadata_seeds, &spl_token_metadata::id());

    let edition_seeds = &[
        spl_token_metadata::state::PREFIX.as_bytes(),
        &token_metadata.as_ref(),
        mint_key.as_ref(),
        EDITION.as_bytes(),
    ];
    let (edition_key, _) = Pubkey::find_program_address(edition_seeds, &spl_token_metadata::id());

    let token_account = Keypair::new();

    let token_account_key = match existing_account {
        None => {
            instructions.push(create_metadata_accounts(
                spl_token_metadata::id(),
                metadata_key,
                mint_key,
                payer.pubkey(),
                payer.pubkey(),
                payer.pubkey(),
                "no".to_owned(),
                "name".to_owned(),
                "www.none.com".to_owned(),
                None,
                0,
                true,
                false,
            ));
            if is_master_edition {
                let master_signers = [
                    &payer,
                    &printing_mint,
                    &one_time_printing_authorization_mint,
                ];
                let master_account_instructions = [
                    create_account(
                        &payer.pubkey(),
                        &printing_mint.pubkey(),
                        client
                            .get_minimum_balance_for_rent_exemption(Mint::LEN)
                            .unwrap(),
                        Mint::LEN as u64,
                        &token_key,
                    ),
                    initialize_mint(
                        &token_key,
                        &printing_mint.pubkey(),
                        &payer.pubkey(),
                        Some(&payer.pubkey()),
                        0,
                    )
                    .unwrap(),
                    create_account(
                        &payer.pubkey(),
                        &one_time_printing_authorization_mint.pubkey(),
                        client
                            .get_minimum_balance_for_rent_exemption(Mint::LEN)
                            .unwrap(),
                        Mint::LEN as u64,
                        &token_key,
                    ),
                    initialize_mint(
                        &token_key,
                        &one_time_printing_authorization_mint.pubkey(),
                        &payer.pubkey(),
                        Some(&payer.pubkey()),
                        0,
                    )
                    .unwrap(),
                ];

                let mut master_transaction = Transaction::new_with_payer(
                    &master_account_instructions,
                    Some(&payer.pubkey()),
                );
                let recent_blockhash = client.get_recent_blockhash().unwrap().0;
                master_transaction.sign(&master_signers, recent_blockhash);
                client
                    .send_and_confirm_transaction(&master_transaction)
                    .unwrap();
            }

            let token_account_mint = match token_supply {
                Some(_) => {
                    if is_participation {
                        one_time_printing_authorization_mint.pubkey()
                    } else {
                        printing_mint.pubkey()
                    }
                }
                None => mint_key,
            };

            // Due to txn size limits, need to do this in a separate one.
            let mut create_signers = vec![payer, &token_account];
            let mut create_account_instructions = vec![
                create_account(
                    &payer.pubkey(),
                    &token_account.pubkey(),
                    client
                        .get_minimum_balance_for_rent_exemption(Account::LEN)
                        .unwrap(),
                    Account::LEN as u64,
                    &token_key,
                ),
                initialize_account(
                    &token_key,
                    &token_account.pubkey(),
                    &token_account_mint,
                    &payer.pubkey(),
                )
                .unwrap(),
            ];

            let extra_real_token_acct = Keypair::new();
            if token_supply.is_some() {
                create_signers.push(&extra_real_token_acct);
                // means the token account above is actually a Printing mint account, we need a separate account to have
                // at least one of the main token type in it.
                create_account_instructions.push(create_account(
                    &payer.pubkey(),
                    &extra_real_token_acct.pubkey(),
                    client
                        .get_minimum_balance_for_rent_exemption(Account::LEN)
                        .unwrap(),
                    Account::LEN as u64,
                    &token_key,
                ));
                create_account_instructions.push(
                    initialize_account(
                        &token_key,
                        &extra_real_token_acct.pubkey(),
                        &mint_key,
                        &payer.pubkey(),
                    )
                    .unwrap(),
                );
                create_account_instructions.push(
                    mint_to(
                        &token_key,
                        &mint_key,
                        &extra_real_token_acct.pubkey(),
                        &payer.pubkey(),
                        &[&payer.pubkey()],
                        1,
                    )
                    .unwrap(),
                );
            } else {
                // we just need to mint the tokens to this account because we're going to transfer tokens
                // out of it.
                create_account_instructions.push(
                    mint_to(
                        &token_key,
                        &mint_key,
                        &token_account.pubkey(),
                        &payer.pubkey(),
                        &[&payer.pubkey()],
                        amount,
                    )
                    .unwrap(),
                );
            }
            let mut transaction =
                Transaction::new_with_payer(&create_account_instructions, Some(&payer.pubkey()));
            let recent_blockhash = client.get_recent_blockhash().unwrap().0;
            transaction.sign(&create_signers, recent_blockhash);
            client.send_and_confirm_transaction(&transaction).unwrap();
            if is_master_edition {
                let one_time_printing_authorization_mint_authority: Option<Pubkey> =
                    match token_supply {
                        Some(_) => Some(payer.pubkey()),
                        None => None,
                    };
                instructions.push(create_master_edition(
                    spl_token_metadata::id(),
                    edition_key,
                    mint_key,
                    printing_mint.pubkey(),
                    one_time_printing_authorization_mint.pubkey(),
                    payer.pubkey(),
                    payer.pubkey(),
                    payer.pubkey(),
                    metadata_key,
                    payer.pubkey(),
                    token_supply,
                    one_time_printing_authorization_mint_authority,
                ));
            }
            token_account.pubkey()
        }
        Some(val) => val,
    };
    instructions.push(create_account(
        &payer.pubkey(),
        &store.pubkey(),
        client
            .get_minimum_balance_for_rent_exemption(Account::LEN)
            .unwrap(),
        Account::LEN as u64,
        &token_key,
    ));

    instructions.push(
        initialize_account(&token_key, &store.pubkey(), &store_mint_key, &authority).unwrap(),
    );
    let mut transaction = Transaction::new_with_payer(&instructions, Some(&payer.pubkey()));
    let recent_blockhash = client.get_recent_blockhash().unwrap().0;

    transaction.sign(&signers, recent_blockhash);
    client.send_and_confirm_transaction(&transaction).unwrap();
    let transfer_authority = Keypair::new();
    let token_instructions = vec![
        approve(
            &token_key,
            &token_account_key,
            &transfer_authority.pubkey(),
            &payer.pubkey(),
            &[&payer.pubkey()],
            amount,
        )
        .unwrap(),
        create_add_token_to_inactive_vault_instruction(
            program_key,
            safety_deposit_box,
            token_account_key,
            store.pubkey(),
            vault_key.clone(),
            vault_authority.pubkey(),
            payer.pubkey(),
            transfer_authority.pubkey(),
            amount,
        ),
    ];

    let token_signers = vec![payer, &transfer_authority];

    let mut token_transaction =
        Transaction::new_with_payer(&token_instructions, Some(&payer.pubkey()));
    let recent_blockhash = client.get_recent_blockhash().unwrap().0;
    token_transaction.sign(&token_signers, recent_blockhash);
    client
        .send_and_confirm_transaction(&token_transaction)
        .unwrap();
    let _account = client.get_account(&safety_deposit_box).unwrap();
    (safety_deposit_box, mint_key, store.pubkey())
}

pub fn activate_vault(
    vault_authority: &Keypair,
    vault_key: &Pubkey,
    payer: &Keypair,
    client: &RpcClient,
) -> Option<Pubkey> {
    let program_key = Pubkey::from_str(VAULT_PROGRAM_PUBKEY).unwrap();

    let number_of_shares: u64 = 0;
    let vault_account = client.get_account(&vault_key).unwrap();
    let vault: Vault = try_from_slice_unchecked(&vault_account.data).unwrap();

    let seeds = &[
        spl_token_vault::state::PREFIX.as_bytes(),
        &program_key.as_ref(),
    ];
    let (mint_authority, _) = Pubkey::find_program_address(seeds, &program_key);

    let instructions = [create_activate_vault_instruction(
        program_key,
        *vault_key,
        vault.fraction_mint,
        vault.fraction_treasury,
        mint_authority,
        vault_authority.pubkey(),
        number_of_shares,
    )];

    let mut transaction = Transaction::new_with_payer(&instructions, Some(&payer.pubkey()));
    let recent_blockhash = client.get_recent_blockhash().unwrap().0;
    let signers = vec![payer, &vault_authority];

    transaction.sign(&signers, recent_blockhash);
    client.send_and_confirm_transaction(&transaction).unwrap();
    let updated_vault_data = client.get_account(&vault_key).unwrap();
    let updated_vault: Vault = try_from_slice_unchecked(&updated_vault_data.data).unwrap();
    if updated_vault.state == VaultState::Active {
        Some(*vault_key)
    } else {
        None
    }
}

pub fn combine_vault(
    vault_authority: &Keypair,
    new_vault_authority: &Pubkey,
    vault_key: &Pubkey,
    payer: &Keypair,
    client: &RpcClient,
) -> Option<Pubkey> {
    let program_key = Pubkey::from_str(VAULT_PROGRAM_PUBKEY).unwrap();
    let token_key = Pubkey::from_str(TOKEN_PROGRAM_PUBKEY).unwrap();

    let amount_of_money = 0;
    let vault_account = client.get_account(&vault_key).unwrap();
    let vault: Vault = try_from_slice_unchecked(&vault_account.data).unwrap();
    let external_price_account = client.get_account(&vault.pricing_lookup_address).unwrap();
    let external: ExternalPriceAccount =
        try_from_slice_unchecked(&external_price_account.data).unwrap();
    let payment_account = Keypair::new();

    let seeds = &[
        spl_token_vault::state::PREFIX.as_bytes(),
        &program_key.as_ref(),
    ];
    let (uncirculated_burn_authority, _) = Pubkey::find_program_address(seeds, &program_key);

    let transfer_authority = Keypair::new();
    let mut signers = vec![
        payer,
        &vault_authority,
        &payment_account,
        &transfer_authority,
    ];

    let mut instructions = vec![
        create_account(
            &payer.pubkey(),
            &payment_account.pubkey(),
            client
                .get_minimum_balance_for_rent_exemption(Account::LEN)
                .unwrap(),
            Account::LEN as u64,
            &token_key,
        ),
        initialize_account(
            &token_key,
            &payment_account.pubkey(),
            &external.price_mint,
            &payer.pubkey(),
        )
        .unwrap(),
        mint_to(
            &token_key,
            &external.price_mint,
            &payment_account.pubkey(),
            &payer.pubkey(),
            &[&payer.pubkey()],
            amount_of_money,
        )
        .unwrap(),
        approve(
            &token_key,
            &payment_account.pubkey(),
            &transfer_authority.pubkey(),
            &payer.pubkey(),
            &[&payer.pubkey()],
            amount_of_money,
        )
        .unwrap(),
    ];

    let shares_outstanding: u64 = 0;
    let outstanding_shares_account = Keypair::new();

    // We make an empty oustanding share account if one is not provided.
    instructions.push(create_account(
        &payer.pubkey(),
        &outstanding_shares_account.pubkey(),
        client
            .get_minimum_balance_for_rent_exemption(Account::LEN)
            .unwrap(),
        Account::LEN as u64,
        &token_key,
    ));
    instructions.push(
        initialize_account(
            &token_key,
            &outstanding_shares_account.pubkey(),
            &vault.fraction_mint,
            &payer.pubkey(),
        )
        .unwrap(),
    );

    signers.push(&outstanding_shares_account);

    instructions.push(
        approve(
            &token_key,
            &outstanding_shares_account.pubkey(),
            &transfer_authority.pubkey(),
            &payer.pubkey(),
            &[&payer.pubkey()],
            shares_outstanding,
        )
        .unwrap(),
    );

    instructions.push(create_combine_vault_instruction(
        program_key,
        *vault_key,
        outstanding_shares_account.pubkey(),
        payment_account.pubkey(),
        vault.fraction_mint,
        vault.fraction_treasury,
        vault.redeem_treasury,
        *new_vault_authority,
        vault_authority.pubkey(),
        transfer_authority.pubkey(),
        uncirculated_burn_authority,
        vault.pricing_lookup_address,
    ));

    let mut transaction = Transaction::new_with_payer(&instructions, Some(&payer.pubkey()));
    let recent_blockhash = client.get_recent_blockhash().unwrap().0;

    transaction.sign(&signers, recent_blockhash);
    client.send_and_confirm_transaction(&transaction).unwrap();
    let updated_vault_data = client.get_account(&vault_key).unwrap();
    let updated_vault: Vault = try_from_slice_unchecked(&updated_vault_data.data).unwrap();
    if updated_vault.state == VaultState::Combined {
        Some(*vault_key)
    } else {
        None
    }
}

pub fn initialize_vault(
    vault_authority: &Keypair,
    external_key: &Pubkey,
    payer: &Keypair,
    client: &RpcClient,
) -> Pubkey {
    let program_key = Pubkey::from_str(VAULT_PROGRAM_PUBKEY).unwrap();
    let token_key = Pubkey::from_str(TOKEN_PROGRAM_PUBKEY).unwrap();
    let external_account = client.get_account(&external_key).unwrap();
    let external: ExternalPriceAccount = try_from_slice_unchecked(&external_account.data).unwrap();
    let fraction_mint = Keypair::new();
    let redeem_mint = external.price_mint;
    let redeem_treasury = Keypair::new();
    let fraction_treasury = Keypair::new();
    let vault = Keypair::new();
    let allow_further_share_creation = false;

    let seeds = &[
        spl_token_vault::state::PREFIX.as_bytes(),
        &program_key.as_ref(),
    ];
    let (authority, _) = Pubkey::find_program_address(seeds, &program_key);

    let instructions = [
        create_account(
            &payer.pubkey(),
            &fraction_mint.pubkey(),
            client
                .get_minimum_balance_for_rent_exemption(Mint::LEN)
                .unwrap(),
            Mint::LEN as u64,
            &token_key,
        ),
        create_account(
            &payer.pubkey(),
            &redeem_treasury.pubkey(),
            client
                .get_minimum_balance_for_rent_exemption(Account::LEN)
                .unwrap(),
            Account::LEN as u64,
            &token_key,
        ),
        create_account(
            &payer.pubkey(),
            &fraction_treasury.pubkey(),
            client
                .get_minimum_balance_for_rent_exemption(Account::LEN)
                .unwrap(),
            Account::LEN as u64,
            &token_key,
        ),
        create_account(
            &payer.pubkey(),
            &vault.pubkey(),
            client
                .get_minimum_balance_for_rent_exemption(MAX_VAULT_SIZE)
                .unwrap(),
            MAX_VAULT_SIZE as u64,
            &program_key,
        ),
        initialize_mint(
            &token_key,
            &fraction_mint.pubkey(),
            &authority,
            Some(&authority),
            0,
        )
        .unwrap(),
        initialize_account(
            &token_key,
            &redeem_treasury.pubkey(),
            &redeem_mint,
            &authority,
        )
        .unwrap(),
        initialize_account(
            &token_key,
            &fraction_treasury.pubkey(),
            &fraction_mint.pubkey(),
            &authority,
        )
        .unwrap(),
        create_init_vault_instruction(
            program_key,
            fraction_mint.pubkey(),
            redeem_treasury.pubkey(),
            fraction_treasury.pubkey(),
            vault.pubkey(),
            vault_authority.pubkey(),
            *external_key,
            allow_further_share_creation,
        ),
    ];
    let mut transaction = Transaction::new_with_payer(&instructions, Some(&payer.pubkey()));
    let recent_blockhash = client.get_recent_blockhash().unwrap().0;
    let signers = vec![
        payer,
        &redeem_treasury,
        &fraction_treasury,
        &fraction_mint,
        &vault,
    ];

    transaction.sign(&signers, recent_blockhash);
    client.send_and_confirm_transaction(&transaction).unwrap();
    let _account = client.get_account(&vault.pubkey()).unwrap();
    vault.pubkey()
}
