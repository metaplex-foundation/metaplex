mod utils;

#[cfg(feature = "test-bpf")]
mod buy {
    use crate::{
        setup_context,
        utils::{
            helpers::{
                airdrop, create_collection, create_master_nft, create_mint, create_token_account,
                mint_to,
            },
            setup_functions::{setup_selling_resource, setup_store},
        },
    };
    use anchor_lang::{
        error::ERROR_CODE_OFFSET, AccountDeserialize, InstructionData, ToAccountMetas,
    };
    use mpl_fixed_price_sale::{
        accounts as mpl_fixed_price_sale_accounts,
        error::ErrorCode,
        instruction as mpl_fixed_price_sale_instruction,
        state::{GatingConfig, SellingResource, TradeHistory},
        utils::{
            find_trade_history_address, find_treasury_owner_address, find_vault_owner_address,
        },
    };
    use solana_program::{clock::Clock, instruction::AccountMeta};
    use solana_program_test::*;
    use solana_sdk::{
        instruction::{Instruction, InstructionError},
        program_pack::Pack,
        pubkey::Pubkey,
        signature::Keypair,
        signer::Signer,
        system_program, sysvar,
        transaction::{Transaction, TransactionError},
        transport::TransportError,
    };

    #[tokio::test]
    async fn success() {
        setup_context!(context, mpl_fixed_price_sale, mpl_token_metadata);
        let (admin_wallet, store_keypair) = setup_store(&mut context).await;

        let (selling_resource_keypair, selling_resource_owner_keypair, _vault) =
            setup_selling_resource(
                &mut context,
                &admin_wallet,
                &store_keypair,
                100,
                None,
                true,
                false,
            )
            .await;

        airdrop(
            &mut context,
            &selling_resource_owner_keypair.pubkey(),
            10_000_000_000,
        )
        .await;

        let market_keypair = Keypair::new();

        let treasury_mint_keypair = Keypair::new();
        create_mint(
            &mut context,
            &treasury_mint_keypair,
            &admin_wallet.pubkey(),
            0,
        )
        .await;

        let (treasury_owner, treasyry_owner_bump) = find_treasury_owner_address(
            &treasury_mint_keypair.pubkey(),
            &selling_resource_keypair.pubkey(),
        );

        let treasury_holder_keypair = Keypair::new();
        create_token_account(
            &mut context,
            &treasury_holder_keypair,
            &treasury_mint_keypair.pubkey(),
            &treasury_owner,
        )
        .await;

        let start_date = context
            .banks_client
            .get_sysvar::<Clock>()
            .await
            .unwrap()
            .unix_timestamp
            + 1;

        let name = "Marktname".to_string();
        let description = "Marktbeschreibung".to_string();
        let mutable = true;
        let price = 1_000_000;
        let pieces_in_one_wallet = Some(1);

        // CreateMarket
        let accounts = mpl_fixed_price_sale_accounts::CreateMarket {
            market: market_keypair.pubkey(),
            store: store_keypair.pubkey(),
            selling_resource_owner: selling_resource_owner_keypair.pubkey(),
            selling_resource: selling_resource_keypair.pubkey(),
            mint: treasury_mint_keypair.pubkey(),
            treasury_holder: treasury_holder_keypair.pubkey(),
            owner: treasury_owner,
            system_program: system_program::id(),
        }
        .to_account_metas(None);

        let data = mpl_fixed_price_sale_instruction::CreateMarket {
            _treasury_owner_bump: treasyry_owner_bump,
            name: name.to_owned(),
            description: description.to_owned(),
            mutable,
            price,
            pieces_in_one_wallet,
            start_date: start_date as u64,
            end_date: None,
            gating_config: None,
        }
        .data();

        let instruction = Instruction {
            program_id: mpl_fixed_price_sale::id(),
            data,
            accounts,
        };

        let tx = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&context.payer.pubkey()),
            &[
                &context.payer,
                &market_keypair,
                &selling_resource_owner_keypair,
            ],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await.unwrap();

        let clock = context.banks_client.get_sysvar::<Clock>().await.unwrap();
        context.warp_to_slot(clock.slot + 1500).unwrap();

        // Buy setup
        let selling_resource_data = context
            .banks_client
            .get_account(selling_resource_keypair.pubkey())
            .await
            .unwrap()
            .unwrap()
            .data;
        let selling_resource =
            SellingResource::try_deserialize(&mut selling_resource_data.as_ref()).unwrap();

        let (trade_history, trade_history_bump) =
            find_trade_history_address(&context.payer.pubkey(), &market_keypair.pubkey());
        let (owner, vault_owner_bump) =
            find_vault_owner_address(&selling_resource.resource, &selling_resource.store);

        let payer_pubkey = context.payer.pubkey();

        let user_token_account = Keypair::new();
        create_token_account(
            &mut context,
            &user_token_account,
            &treasury_mint_keypair.pubkey(),
            &payer_pubkey,
        )
        .await;

        mint_to(
            &mut context,
            &treasury_mint_keypair.pubkey(),
            &user_token_account.pubkey(),
            &admin_wallet,
            1_000_000,
        )
        .await;

        let new_mint_keypair = Keypair::new();
        create_mint(&mut context, &new_mint_keypair, &payer_pubkey, 0).await;

        let new_mint_token_account = Keypair::new();
        create_token_account(
            &mut context,
            &new_mint_token_account,
            &new_mint_keypair.pubkey(),
            &payer_pubkey,
        )
        .await;

        let payer_keypair = Keypair::from_bytes(&context.payer.to_bytes()).unwrap();
        mint_to(
            &mut context,
            &new_mint_keypair.pubkey(),
            &new_mint_token_account.pubkey(),
            &payer_keypair,
            1,
        )
        .await;

        let (master_edition_metadata, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
            ],
            &mpl_token_metadata::id(),
        );

        let (master_edition, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
            ],
            &mpl_token_metadata::id(),
        );

        let (edition_marker, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
                selling_resource.supply.to_string().as_bytes(),
            ],
            &mpl_token_metadata::id(),
        );

        let (new_metadata, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                new_mint_keypair.pubkey().as_ref(),
            ],
            &mpl_token_metadata::id(),
        );

        let (new_edition, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                new_mint_keypair.pubkey().as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
            ],
            &mpl_token_metadata::id(),
        );

        // Buy
        let accounts = mpl_fixed_price_sale_accounts::Buy {
            market: market_keypair.pubkey(),
            selling_resource: selling_resource_keypair.pubkey(),
            user_token_account: user_token_account.pubkey(),
            user_wallet: context.payer.pubkey(),
            trade_history,
            treasury_holder: treasury_holder_keypair.pubkey(),
            new_metadata,
            new_edition,
            master_edition,
            new_mint: new_mint_keypair.pubkey(),
            edition_marker,
            vault: selling_resource.vault,
            owner,
            new_token_account: new_mint_token_account.pubkey(),
            master_edition_metadata,
            clock: sysvar::clock::id(),
            rent: sysvar::rent::id(),
            token_metadata_program: mpl_token_metadata::id(),
            token_program: spl_token::id(),
            system_program: system_program::id(),
        }
        .to_account_metas(None);

        let data = mpl_fixed_price_sale_instruction::Buy {
            _trade_history_bump: trade_history_bump,
            vault_owner_bump,
        }
        .data();

        let instruction = Instruction {
            program_id: mpl_fixed_price_sale::id(),
            data,
            accounts,
        };

        let tx = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await.unwrap();

        let clock = context.banks_client.get_sysvar::<Clock>().await.unwrap();
        context.warp_to_slot(clock.slot + 3).unwrap();

        // Checks
        let selling_resource_acc = context
            .banks_client
            .get_account(selling_resource_keypair.pubkey())
            .await
            .unwrap()
            .unwrap();
        let selling_resource_data =
            SellingResource::try_deserialize(&mut selling_resource_acc.data.as_ref()).unwrap();

        let trade_history_acc = context
            .banks_client
            .get_account(trade_history)
            .await
            .unwrap()
            .unwrap();
        let trade_history_data =
            TradeHistory::try_deserialize(&mut trade_history_acc.data.as_ref()).unwrap();

        assert_eq!(selling_resource_data.supply, 1);
        assert_eq!(trade_history_data.already_bought, 1);
    }

    #[tokio::test]
    async fn success_native_sol() {
        setup_context!(context, mpl_fixed_price_sale, mpl_token_metadata);
        let (admin_wallet, store_keypair) = setup_store(&mut context).await;

        let (selling_resource_keypair, selling_resource_owner_keypair, _vault) =
            setup_selling_resource(
                &mut context,
                &admin_wallet,
                &store_keypair,
                100,
                None,
                true,
                false,
            )
            .await;

        airdrop(
            &mut context,
            &selling_resource_owner_keypair.pubkey(),
            10_000_000_000,
        )
        .await;

        let market_keypair = Keypair::new();

        let treasury_mint = anchor_lang::solana_program::system_program::id();

        let (treasury_owner, treasyry_owner_bump) =
            find_treasury_owner_address(&treasury_mint, &selling_resource_keypair.pubkey());

        let start_date = context
            .banks_client
            .get_sysvar::<Clock>()
            .await
            .unwrap()
            .unix_timestamp
            + 1;

        let name = "Marktname".to_string();
        let description = "Marktbeschreibung".to_string();
        let mutable = true;
        let price = 1_000_000;
        let pieces_in_one_wallet = Some(1);

        // CreateMarket
        let accounts = mpl_fixed_price_sale_accounts::CreateMarket {
            market: market_keypair.pubkey(),
            store: store_keypair.pubkey(),
            selling_resource_owner: selling_resource_owner_keypair.pubkey(),
            selling_resource: selling_resource_keypair.pubkey(),
            mint: treasury_mint,
            treasury_holder: treasury_owner,
            owner: treasury_owner,
            system_program: system_program::id(),
        }
        .to_account_metas(None);

        let data = mpl_fixed_price_sale_instruction::CreateMarket {
            _treasury_owner_bump: treasyry_owner_bump,
            name: name.to_owned(),
            description: description.to_owned(),
            mutable,
            price,
            pieces_in_one_wallet,
            start_date: start_date as u64,
            end_date: None,
            gating_config: None,
        }
        .data();

        let instruction = Instruction {
            program_id: mpl_fixed_price_sale::id(),
            data,
            accounts,
        };

        let tx = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&context.payer.pubkey()),
            &[
                &context.payer,
                &market_keypair,
                &selling_resource_owner_keypair,
            ],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await.unwrap();

        let clock = context.banks_client.get_sysvar::<Clock>().await.unwrap();
        context.warp_to_slot(clock.slot + 1500).unwrap();

        // Buy setup
        let selling_resource_data = context
            .banks_client
            .get_account(selling_resource_keypair.pubkey())
            .await
            .unwrap()
            .unwrap()
            .data;
        let selling_resource =
            SellingResource::try_deserialize(&mut selling_resource_data.as_ref()).unwrap();

        let user_wallet = Keypair::new();
        airdrop(&mut context, &user_wallet.pubkey(), 1_000_000_000).await;

        let (trade_history, trade_history_bump) =
            find_trade_history_address(&user_wallet.pubkey(), &market_keypair.pubkey());
        let (owner, vault_owner_bump) =
            find_vault_owner_address(&selling_resource.resource, &selling_resource.store);

        let payer_pubkey = user_wallet.pubkey();

        let new_mint_keypair = Keypair::new();
        create_mint(&mut context, &new_mint_keypair, &payer_pubkey, 0).await;

        let new_mint_token_account = Keypair::new();
        create_token_account(
            &mut context,
            &new_mint_token_account,
            &new_mint_keypair.pubkey(),
            &payer_pubkey,
        )
        .await;

        let _payer_keypair = Keypair::from_bytes(&context.payer.to_bytes()).unwrap();
        mint_to(
            &mut context,
            &new_mint_keypair.pubkey(),
            &new_mint_token_account.pubkey(),
            &user_wallet,
            1,
        )
        .await;

        let (master_edition_metadata, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
            ],
            &mpl_token_metadata::id(),
        );

        let (master_edition, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
            ],
            &mpl_token_metadata::id(),
        );

        let (edition_marker, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
                selling_resource.supply.to_string().as_bytes(),
            ],
            &mpl_token_metadata::id(),
        );

        let (new_metadata, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                new_mint_keypair.pubkey().as_ref(),
            ],
            &mpl_token_metadata::id(),
        );

        let (new_edition, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                new_mint_keypair.pubkey().as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
            ],
            &mpl_token_metadata::id(),
        );

        // Buy
        let accounts = mpl_fixed_price_sale_accounts::Buy {
            market: market_keypair.pubkey(),
            selling_resource: selling_resource_keypair.pubkey(),
            user_token_account: user_wallet.pubkey(),
            user_wallet: user_wallet.pubkey(),
            trade_history,
            treasury_holder: treasury_owner,
            new_metadata,
            new_edition,
            master_edition,
            new_mint: new_mint_keypair.pubkey(),
            edition_marker,
            vault: selling_resource.vault,
            owner,
            new_token_account: new_mint_token_account.pubkey(),
            master_edition_metadata,
            clock: sysvar::clock::id(),
            rent: sysvar::rent::id(),
            token_metadata_program: mpl_token_metadata::id(),
            token_program: spl_token::id(),
            system_program: system_program::id(),
        }
        .to_account_metas(None);

        let data = mpl_fixed_price_sale_instruction::Buy {
            _trade_history_bump: trade_history_bump,
            vault_owner_bump,
        }
        .data();

        let instruction = Instruction {
            program_id: mpl_fixed_price_sale::id(),
            data,
            accounts,
        };

        let tx = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&context.payer.pubkey()),
            &[&context.payer, &user_wallet],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await.unwrap();

        let clock = context.banks_client.get_sysvar::<Clock>().await.unwrap();
        context.warp_to_slot(clock.slot + 3).unwrap();

        // Checks
        let selling_resource_acc = context
            .banks_client
            .get_account(selling_resource_keypair.pubkey())
            .await
            .unwrap()
            .unwrap();
        let selling_resource_data =
            SellingResource::try_deserialize(&mut selling_resource_acc.data.as_ref()).unwrap();

        let trade_history_acc = context
            .banks_client
            .get_account(trade_history)
            .await
            .unwrap()
            .unwrap();
        let trade_history_data =
            TradeHistory::try_deserialize(&mut trade_history_acc.data.as_ref()).unwrap();

        assert_eq!(selling_resource_data.supply, 1);
        assert_eq!(trade_history_data.already_bought, 1);
    }

    #[tokio::test]
    async fn fail_market_is_not_started() {
        setup_context!(context, mpl_fixed_price_sale, mpl_token_metadata);
        let (admin_wallet, store_keypair) = setup_store(&mut context).await;

        let (selling_resource_keypair, selling_resource_owner_keypair, _vault) =
            setup_selling_resource(
                &mut context,
                &admin_wallet,
                &store_keypair,
                100,
                None,
                true,
                false,
            )
            .await;

        airdrop(
            &mut context,
            &selling_resource_owner_keypair.pubkey(),
            10_000_000_000,
        )
        .await;

        let market_keypair = Keypair::new();

        let treasury_mint_keypair = Keypair::new();
        create_mint(
            &mut context,
            &treasury_mint_keypair,
            &admin_wallet.pubkey(),
            0,
        )
        .await;

        let (treasury_owner, treasyry_owner_bump) = find_treasury_owner_address(
            &treasury_mint_keypair.pubkey(),
            &selling_resource_keypair.pubkey(),
        );

        let treasury_holder_keypair = Keypair::new();
        create_token_account(
            &mut context,
            &treasury_holder_keypair,
            &treasury_mint_keypair.pubkey(),
            &treasury_owner,
        )
        .await;

        let start_date = context
            .banks_client
            .get_sysvar::<Clock>()
            .await
            .unwrap()
            .unix_timestamp
            + 1;

        let name = "Marktname".to_string();
        let description = "Marktbeschreibung".to_string();
        let mutable = true;
        let price = 1_000_000;
        let pieces_in_one_wallet = Some(1);

        // CreateMarket
        let accounts = mpl_fixed_price_sale_accounts::CreateMarket {
            market: market_keypair.pubkey(),
            store: store_keypair.pubkey(),
            selling_resource_owner: selling_resource_owner_keypair.pubkey(),
            selling_resource: selling_resource_keypair.pubkey(),
            mint: treasury_mint_keypair.pubkey(),
            treasury_holder: treasury_holder_keypair.pubkey(),
            owner: treasury_owner,
            system_program: system_program::id(),
        }
        .to_account_metas(None);

        let data = mpl_fixed_price_sale_instruction::CreateMarket {
            _treasury_owner_bump: treasyry_owner_bump,
            name: name.to_owned(),
            description: description.to_owned(),
            mutable,
            price,
            pieces_in_one_wallet,
            start_date: start_date as u64,
            end_date: None,
            gating_config: None,
        }
        .data();

        let instruction = Instruction {
            program_id: mpl_fixed_price_sale::id(),
            data,
            accounts,
        };

        let tx = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&context.payer.pubkey()),
            &[
                &context.payer,
                &market_keypair,
                &selling_resource_owner_keypair,
            ],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await.unwrap();

        // Buy setup
        let selling_resource_data = context
            .banks_client
            .get_account(selling_resource_keypair.pubkey())
            .await
            .unwrap()
            .unwrap()
            .data;
        let selling_resource =
            SellingResource::try_deserialize(&mut selling_resource_data.as_ref()).unwrap();

        let (trade_history, trade_history_bump) =
            find_trade_history_address(&context.payer.pubkey(), &market_keypair.pubkey());
        let (owner, vault_owner_bump) =
            find_vault_owner_address(&selling_resource.resource, &selling_resource.store);

        let payer_pubkey = context.payer.pubkey();

        let user_token_account = Keypair::new();
        create_token_account(
            &mut context,
            &user_token_account,
            &treasury_mint_keypair.pubkey(),
            &payer_pubkey,
        )
        .await;

        mint_to(
            &mut context,
            &treasury_mint_keypair.pubkey(),
            &user_token_account.pubkey(),
            &admin_wallet,
            1_000_000,
        )
        .await;

        let new_mint_keypair = Keypair::new();
        create_mint(&mut context, &new_mint_keypair, &payer_pubkey, 0).await;

        let new_mint_token_account = Keypair::new();
        create_token_account(
            &mut context,
            &new_mint_token_account,
            &new_mint_keypair.pubkey(),
            &payer_pubkey,
        )
        .await;

        let payer_keypair = Keypair::from_bytes(&context.payer.to_bytes()).unwrap();
        mint_to(
            &mut context,
            &new_mint_keypair.pubkey(),
            &new_mint_token_account.pubkey(),
            &payer_keypair,
            1,
        )
        .await;

        let (master_edition_metadata, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
            ],
            &mpl_token_metadata::id(),
        );

        let (master_edition, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
            ],
            &mpl_token_metadata::id(),
        );

        let (edition_marker, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
                selling_resource.supply.to_string().as_bytes(),
            ],
            &mpl_token_metadata::id(),
        );

        let (new_metadata, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                new_mint_keypair.pubkey().as_ref(),
            ],
            &mpl_token_metadata::id(),
        );

        let (new_edition, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                new_mint_keypair.pubkey().as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
            ],
            &mpl_token_metadata::id(),
        );

        // Buy
        let accounts = mpl_fixed_price_sale_accounts::Buy {
            market: market_keypair.pubkey(),
            selling_resource: selling_resource_keypair.pubkey(),
            user_token_account: user_token_account.pubkey(),
            user_wallet: context.payer.pubkey(),
            trade_history,
            treasury_holder: treasury_holder_keypair.pubkey(),
            new_metadata,
            new_edition,
            master_edition,
            new_mint: new_mint_keypair.pubkey(),
            edition_marker,
            vault: selling_resource.vault,
            owner,
            new_token_account: new_mint_token_account.pubkey(),
            master_edition_metadata,
            clock: sysvar::clock::id(),
            rent: sysvar::rent::id(),
            token_metadata_program: mpl_token_metadata::id(),
            token_program: spl_token::id(),
            system_program: system_program::id(),
        }
        .to_account_metas(None);

        let data = mpl_fixed_price_sale_instruction::Buy {
            _trade_history_bump: trade_history_bump,
            vault_owner_bump,
        }
        .data();

        let instruction = Instruction {
            program_id: mpl_fixed_price_sale::id(),
            data,
            accounts,
        };

        let tx = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );

        let err = context
            .banks_client
            .process_transaction(tx)
            .await
            .unwrap_err();

        match err {
            TransportError::Custom(_) => assert!(true),
            TransportError::TransactionError(_) => assert!(true),
            _ => assert!(false),
        }
    }

    #[tokio::test]
    async fn fail_market_is_ended() {
        setup_context!(context, mpl_fixed_price_sale, mpl_token_metadata);
        let (admin_wallet, store_keypair) = setup_store(&mut context).await;

        let (selling_resource_keypair, selling_resource_owner_keypair, _vault) =
            setup_selling_resource(
                &mut context,
                &admin_wallet,
                &store_keypair,
                100,
                None,
                true,
                false,
            )
            .await;

        airdrop(
            &mut context,
            &selling_resource_owner_keypair.pubkey(),
            10_000_000_000,
        )
        .await;

        let market_keypair = Keypair::new();

        let treasury_mint_keypair = Keypair::new();
        create_mint(
            &mut context,
            &treasury_mint_keypair,
            &admin_wallet.pubkey(),
            0,
        )
        .await;

        let (treasury_owner, treasyry_owner_bump) = find_treasury_owner_address(
            &treasury_mint_keypair.pubkey(),
            &selling_resource_keypair.pubkey(),
        );

        let treasury_holder_keypair = Keypair::new();
        create_token_account(
            &mut context,
            &treasury_holder_keypair,
            &treasury_mint_keypair.pubkey(),
            &treasury_owner,
        )
        .await;

        let start_date = context
            .banks_client
            .get_sysvar::<Clock>()
            .await
            .unwrap()
            .unix_timestamp
            + 1;

        let end_date = start_date + 2;

        let name = "Marktname".to_string();
        let description = "Marktbeschreibung".to_string();
        let mutable = true;
        let price = 1_000_000;
        let pieces_in_one_wallet = Some(1);

        // CreateMarket
        let accounts = mpl_fixed_price_sale_accounts::CreateMarket {
            market: market_keypair.pubkey(),
            store: store_keypair.pubkey(),
            selling_resource_owner: selling_resource_owner_keypair.pubkey(),
            selling_resource: selling_resource_keypair.pubkey(),
            mint: treasury_mint_keypair.pubkey(),
            treasury_holder: treasury_holder_keypair.pubkey(),
            owner: treasury_owner,
            system_program: system_program::id(),
        }
        .to_account_metas(None);

        let data = mpl_fixed_price_sale_instruction::CreateMarket {
            _treasury_owner_bump: treasyry_owner_bump,
            name: name.to_owned(),
            description: description.to_owned(),
            mutable,
            price,
            pieces_in_one_wallet,
            start_date: start_date as u64,
            end_date: Some(end_date as u64),
            gating_config: None,
        }
        .data();

        let instruction = Instruction {
            program_id: mpl_fixed_price_sale::id(),
            data,
            accounts,
        };

        let tx = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&context.payer.pubkey()),
            &[
                &context.payer,
                &market_keypair,
                &selling_resource_owner_keypair,
            ],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await.unwrap();

        let clock = context.banks_client.get_sysvar::<Clock>().await.unwrap();
        context.warp_to_slot(clock.slot + 3000).unwrap();

        // Buy setup
        let selling_resource_data = context
            .banks_client
            .get_account(selling_resource_keypair.pubkey())
            .await
            .unwrap()
            .unwrap()
            .data;
        let selling_resource =
            SellingResource::try_deserialize(&mut selling_resource_data.as_ref()).unwrap();

        let (trade_history, trade_history_bump) =
            find_trade_history_address(&context.payer.pubkey(), &market_keypair.pubkey());
        let (owner, vault_owner_bump) =
            find_vault_owner_address(&selling_resource.resource, &selling_resource.store);

        let payer_pubkey = context.payer.pubkey();

        let user_token_account = Keypair::new();
        create_token_account(
            &mut context,
            &user_token_account,
            &treasury_mint_keypair.pubkey(),
            &payer_pubkey,
        )
        .await;

        mint_to(
            &mut context,
            &treasury_mint_keypair.pubkey(),
            &user_token_account.pubkey(),
            &admin_wallet,
            1_000_000,
        )
        .await;

        let new_mint_keypair = Keypair::new();
        create_mint(&mut context, &new_mint_keypair, &payer_pubkey, 0).await;

        let new_mint_token_account = Keypair::new();
        create_token_account(
            &mut context,
            &new_mint_token_account,
            &new_mint_keypair.pubkey(),
            &payer_pubkey,
        )
        .await;

        let payer_keypair = Keypair::from_bytes(&context.payer.to_bytes()).unwrap();
        mint_to(
            &mut context,
            &new_mint_keypair.pubkey(),
            &new_mint_token_account.pubkey(),
            &payer_keypair,
            1,
        )
        .await;

        let (master_edition_metadata, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
            ],
            &mpl_token_metadata::id(),
        );

        let (master_edition, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
            ],
            &mpl_token_metadata::id(),
        );

        let (edition_marker, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
                selling_resource.supply.to_string().as_bytes(),
            ],
            &mpl_token_metadata::id(),
        );

        let (new_metadata, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                new_mint_keypair.pubkey().as_ref(),
            ],
            &mpl_token_metadata::id(),
        );

        let (new_edition, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                new_mint_keypair.pubkey().as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
            ],
            &mpl_token_metadata::id(),
        );

        // Buy
        let accounts = mpl_fixed_price_sale_accounts::Buy {
            market: market_keypair.pubkey(),
            selling_resource: selling_resource_keypair.pubkey(),
            user_token_account: user_token_account.pubkey(),
            user_wallet: context.payer.pubkey(),
            trade_history,
            treasury_holder: treasury_holder_keypair.pubkey(),
            new_metadata,
            new_edition,
            master_edition,
            new_mint: new_mint_keypair.pubkey(),
            edition_marker,
            vault: selling_resource.vault,
            owner,
            new_token_account: new_mint_token_account.pubkey(),
            master_edition_metadata,
            clock: sysvar::clock::id(),
            rent: sysvar::rent::id(),
            token_metadata_program: mpl_token_metadata::id(),
            token_program: spl_token::id(),
            system_program: system_program::id(),
        }
        .to_account_metas(None);

        let data = mpl_fixed_price_sale_instruction::Buy {
            _trade_history_bump: trade_history_bump,
            vault_owner_bump,
        }
        .data();

        let instruction = Instruction {
            program_id: mpl_fixed_price_sale::id(),
            data,
            accounts,
        };

        let tx = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );

        let err = context
            .banks_client
            .process_transaction(tx)
            .await
            .unwrap_err();

        match err {
            TransportError::Custom(_) => assert!(true),
            TransportError::TransactionError(_) => assert!(true),
            _ => assert!(false),
        }
    }

    #[tokio::test]
    async fn fail_market_is_ended_unlimited_duration() {
        setup_context!(context, mpl_fixed_price_sale, mpl_token_metadata);
        let (admin_wallet, store_keypair) = setup_store(&mut context).await;

        let (selling_resource_keypair, selling_resource_owner_keypair, _vault) =
            setup_selling_resource(
                &mut context,
                &admin_wallet,
                &store_keypair,
                100,
                None,
                true,
                false,
            )
            .await;

        airdrop(
            &mut context,
            &selling_resource_owner_keypair.pubkey(),
            10_000_000_000,
        )
        .await;

        let market_keypair = Keypair::new();

        let treasury_mint_keypair = Keypair::new();
        create_mint(
            &mut context,
            &treasury_mint_keypair,
            &admin_wallet.pubkey(),
            0,
        )
        .await;

        let (treasury_owner, treasyry_owner_bump) = find_treasury_owner_address(
            &treasury_mint_keypair.pubkey(),
            &selling_resource_keypair.pubkey(),
        );

        let treasury_holder_keypair = Keypair::new();
        create_token_account(
            &mut context,
            &treasury_holder_keypair,
            &treasury_mint_keypair.pubkey(),
            &treasury_owner,
        )
        .await;

        let start_date = context
            .banks_client
            .get_sysvar::<Clock>()
            .await
            .unwrap()
            .unix_timestamp
            + 1;

        let name = "Marktname".to_string();
        let description = "Marktbeschreibung".to_string();
        let mutable = true;
        let price = 1_000_000;
        let pieces_in_one_wallet = Some(1);

        // CreateMarket
        let accounts = mpl_fixed_price_sale_accounts::CreateMarket {
            market: market_keypair.pubkey(),
            store: store_keypair.pubkey(),
            selling_resource_owner: selling_resource_owner_keypair.pubkey(),
            selling_resource: selling_resource_keypair.pubkey(),
            mint: treasury_mint_keypair.pubkey(),
            treasury_holder: treasury_holder_keypair.pubkey(),
            owner: treasury_owner,
            system_program: system_program::id(),
        }
        .to_account_metas(None);

        let data = mpl_fixed_price_sale_instruction::CreateMarket {
            _treasury_owner_bump: treasyry_owner_bump,
            name: name.to_owned(),
            description: description.to_owned(),
            mutable,
            price,
            pieces_in_one_wallet,
            start_date: start_date as u64,
            end_date: None,
            gating_config: None,
        }
        .data();

        let instruction = Instruction {
            program_id: mpl_fixed_price_sale::id(),
            data,
            accounts,
        };

        let tx = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&context.payer.pubkey()),
            &[
                &context.payer,
                &market_keypair,
                &selling_resource_owner_keypair,
            ],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await.unwrap();

        let clock = context.banks_client.get_sysvar::<Clock>().await.unwrap();
        context.warp_to_slot(clock.slot + 1500).unwrap();

        // Buy setup
        let selling_resource_data = context
            .banks_client
            .get_account(selling_resource_keypair.pubkey())
            .await
            .unwrap()
            .unwrap()
            .data;
        let selling_resource =
            SellingResource::try_deserialize(&mut selling_resource_data.as_ref()).unwrap();

        let (trade_history, trade_history_bump) =
            find_trade_history_address(&context.payer.pubkey(), &market_keypair.pubkey());
        let (owner, vault_owner_bump) =
            find_vault_owner_address(&selling_resource.resource, &selling_resource.store);

        let payer_pubkey = context.payer.pubkey();

        let user_token_account = Keypair::new();
        create_token_account(
            &mut context,
            &user_token_account,
            &treasury_mint_keypair.pubkey(),
            &payer_pubkey,
        )
        .await;

        mint_to(
            &mut context,
            &treasury_mint_keypair.pubkey(),
            &user_token_account.pubkey(),
            &admin_wallet,
            1_000_000,
        )
        .await;

        let new_mint_keypair = Keypair::new();
        create_mint(&mut context, &new_mint_keypair, &payer_pubkey, 0).await;

        let new_mint_token_account = Keypair::new();
        create_token_account(
            &mut context,
            &new_mint_token_account,
            &new_mint_keypair.pubkey(),
            &payer_pubkey,
        )
        .await;

        let payer_keypair = Keypair::from_bytes(&context.payer.to_bytes()).unwrap();
        mint_to(
            &mut context,
            &new_mint_keypair.pubkey(),
            &new_mint_token_account.pubkey(),
            &payer_keypair,
            1,
        )
        .await;

        let (master_edition_metadata, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
            ],
            &mpl_token_metadata::id(),
        );

        let (master_edition, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
            ],
            &mpl_token_metadata::id(),
        );

        let (edition_marker, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
                selling_resource.supply.to_string().as_bytes(),
            ],
            &mpl_token_metadata::id(),
        );

        let (new_metadata, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                new_mint_keypair.pubkey().as_ref(),
            ],
            &mpl_token_metadata::id(),
        );

        let (new_edition, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                new_mint_keypair.pubkey().as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
            ],
            &mpl_token_metadata::id(),
        );

        // CloseMarket
        let accounts = mpl_fixed_price_sale_accounts::CloseMarket {
            market: market_keypair.pubkey(),
            owner: selling_resource_owner_keypair.pubkey(),
            clock: sysvar::clock::id(),
        }
        .to_account_metas(None);

        let data = mpl_fixed_price_sale_instruction::CloseMarket {}.data();

        let instruction = Instruction {
            program_id: mpl_fixed_price_sale::id(),
            data,
            accounts,
        };

        let tx = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&context.payer.pubkey()),
            &[&context.payer, &selling_resource_owner_keypair],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await.unwrap();

        // Buy
        let accounts = mpl_fixed_price_sale_accounts::Buy {
            market: market_keypair.pubkey(),
            selling_resource: selling_resource_keypair.pubkey(),
            user_token_account: user_token_account.pubkey(),
            user_wallet: context.payer.pubkey(),
            trade_history,
            treasury_holder: treasury_holder_keypair.pubkey(),
            new_metadata,
            new_edition,
            master_edition,
            new_mint: new_mint_keypair.pubkey(),
            edition_marker,
            vault: selling_resource.vault,
            owner,
            new_token_account: new_mint_token_account.pubkey(),
            master_edition_metadata,
            clock: sysvar::clock::id(),
            rent: sysvar::rent::id(),
            token_metadata_program: mpl_token_metadata::id(),
            token_program: spl_token::id(),
            system_program: system_program::id(),
        }
        .to_account_metas(None);

        let data = mpl_fixed_price_sale_instruction::Buy {
            _trade_history_bump: trade_history_bump,
            vault_owner_bump,
        }
        .data();

        let instruction = Instruction {
            program_id: mpl_fixed_price_sale::id(),
            data,
            accounts,
        };

        let tx = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );

        let err = context
            .banks_client
            .process_transaction(tx)
            .await
            .unwrap_err();

        match err {
            TransportError::Custom(_) => assert!(true),
            TransportError::TransactionError(_) => assert!(true),
            _ => assert!(false),
        }
    }

    #[tokio::test]
    async fn fail_market_is_suspended() {
        setup_context!(context, mpl_fixed_price_sale, mpl_token_metadata);
        let (admin_wallet, store_keypair) = setup_store(&mut context).await;

        let (selling_resource_keypair, selling_resource_owner_keypair, _vault) =
            setup_selling_resource(
                &mut context,
                &admin_wallet,
                &store_keypair,
                100,
                None,
                true,
                false,
            )
            .await;

        airdrop(
            &mut context,
            &selling_resource_owner_keypair.pubkey(),
            10_000_000_000,
        )
        .await;

        let market_keypair = Keypair::new();

        let treasury_mint_keypair = Keypair::new();
        create_mint(
            &mut context,
            &treasury_mint_keypair,
            &admin_wallet.pubkey(),
            0,
        )
        .await;

        let (treasury_owner, treasyry_owner_bump) = find_treasury_owner_address(
            &treasury_mint_keypair.pubkey(),
            &selling_resource_keypair.pubkey(),
        );

        let treasury_holder_keypair = Keypair::new();
        create_token_account(
            &mut context,
            &treasury_holder_keypair,
            &treasury_mint_keypair.pubkey(),
            &treasury_owner,
        )
        .await;

        let start_date = context
            .banks_client
            .get_sysvar::<Clock>()
            .await
            .unwrap()
            .unix_timestamp
            + 1;

        let name = "Marktname".to_string();
        let description = "Marktbeschreibung".to_string();
        let mutable = true;
        let price = 1_000_000;
        let pieces_in_one_wallet = Some(1);

        // CreateMarket
        let accounts = mpl_fixed_price_sale_accounts::CreateMarket {
            market: market_keypair.pubkey(),
            store: store_keypair.pubkey(),
            selling_resource_owner: selling_resource_owner_keypair.pubkey(),
            selling_resource: selling_resource_keypair.pubkey(),
            mint: treasury_mint_keypair.pubkey(),
            treasury_holder: treasury_holder_keypair.pubkey(),
            owner: treasury_owner,
            system_program: system_program::id(),
        }
        .to_account_metas(None);

        let data = mpl_fixed_price_sale_instruction::CreateMarket {
            _treasury_owner_bump: treasyry_owner_bump,
            name: name.to_owned(),
            description: description.to_owned(),
            mutable,
            price,
            pieces_in_one_wallet,
            start_date: start_date as u64,
            end_date: None,
            gating_config: None,
        }
        .data();

        let instruction = Instruction {
            program_id: mpl_fixed_price_sale::id(),
            data,
            accounts,
        };

        let tx = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&context.payer.pubkey()),
            &[
                &context.payer,
                &market_keypair,
                &selling_resource_owner_keypair,
            ],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await.unwrap();

        let clock = context.banks_client.get_sysvar::<Clock>().await.unwrap();
        context.warp_to_slot(clock.slot + 1500).unwrap();

        // Buy setup
        let selling_resource_data = context
            .banks_client
            .get_account(selling_resource_keypair.pubkey())
            .await
            .unwrap()
            .unwrap()
            .data;
        let selling_resource =
            SellingResource::try_deserialize(&mut selling_resource_data.as_ref()).unwrap();

        let (trade_history, trade_history_bump) =
            find_trade_history_address(&context.payer.pubkey(), &market_keypair.pubkey());
        let (owner, vault_owner_bump) =
            find_vault_owner_address(&selling_resource.resource, &selling_resource.store);

        let payer_pubkey = context.payer.pubkey();

        let user_token_account = Keypair::new();
        create_token_account(
            &mut context,
            &user_token_account,
            &treasury_mint_keypair.pubkey(),
            &payer_pubkey,
        )
        .await;

        mint_to(
            &mut context,
            &treasury_mint_keypair.pubkey(),
            &user_token_account.pubkey(),
            &admin_wallet,
            1_000_000,
        )
        .await;

        let new_mint_keypair = Keypair::new();
        create_mint(&mut context, &new_mint_keypair, &payer_pubkey, 0).await;

        let new_mint_token_account = Keypair::new();
        create_token_account(
            &mut context,
            &new_mint_token_account,
            &new_mint_keypair.pubkey(),
            &payer_pubkey,
        )
        .await;

        let payer_keypair = Keypair::from_bytes(&context.payer.to_bytes()).unwrap();
        mint_to(
            &mut context,
            &new_mint_keypair.pubkey(),
            &new_mint_token_account.pubkey(),
            &payer_keypair,
            1,
        )
        .await;

        let (master_edition_metadata, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
            ],
            &mpl_token_metadata::id(),
        );

        let (master_edition, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
            ],
            &mpl_token_metadata::id(),
        );

        let (edition_marker, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
                selling_resource.supply.to_string().as_bytes(),
            ],
            &mpl_token_metadata::id(),
        );

        let (new_metadata, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                new_mint_keypair.pubkey().as_ref(),
            ],
            &mpl_token_metadata::id(),
        );

        let (new_edition, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                new_mint_keypair.pubkey().as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
            ],
            &mpl_token_metadata::id(),
        );

        // SuspendMarket
        let accounts = mpl_fixed_price_sale_accounts::SuspendMarket {
            market: market_keypair.pubkey(),
            owner: selling_resource_owner_keypair.pubkey(),
            clock: sysvar::clock::id(),
        }
        .to_account_metas(None);

        let data = mpl_fixed_price_sale_instruction::SuspendMarket {}.data();

        let instruction = Instruction {
            program_id: mpl_fixed_price_sale::id(),
            data,
            accounts,
        };

        let tx = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&context.payer.pubkey()),
            &[&context.payer, &selling_resource_owner_keypair],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await.unwrap();

        // Buy
        let accounts = mpl_fixed_price_sale_accounts::Buy {
            market: market_keypair.pubkey(),
            selling_resource: selling_resource_keypair.pubkey(),
            user_token_account: user_token_account.pubkey(),
            user_wallet: context.payer.pubkey(),
            trade_history,
            treasury_holder: treasury_holder_keypair.pubkey(),
            new_metadata,
            new_edition,
            master_edition,
            new_mint: new_mint_keypair.pubkey(),
            edition_marker,
            vault: selling_resource.vault,
            owner,
            new_token_account: new_mint_token_account.pubkey(),
            master_edition_metadata,
            clock: sysvar::clock::id(),
            rent: sysvar::rent::id(),
            token_metadata_program: mpl_token_metadata::id(),
            token_program: spl_token::id(),
            system_program: system_program::id(),
        }
        .to_account_metas(None);

        let data = mpl_fixed_price_sale_instruction::Buy {
            _trade_history_bump: trade_history_bump,
            vault_owner_bump,
        }
        .data();

        let instruction = Instruction {
            program_id: mpl_fixed_price_sale::id(),
            data,
            accounts,
        };

        let tx = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );

        let err = context
            .banks_client
            .process_transaction(tx)
            .await
            .unwrap_err();

        match err {
            TransportError::Custom(_) => assert!(true),
            TransportError::TransactionError(_) => assert!(true),
            _ => assert!(false),
        }
    }

    #[tokio::test]
    async fn fail_user_reach_buy_limit() {
        setup_context!(context, mpl_fixed_price_sale, mpl_token_metadata);
        let (admin_wallet, store_keypair) = setup_store(&mut context).await;

        let (selling_resource_keypair, selling_resource_owner_keypair, _vault) =
            setup_selling_resource(
                &mut context,
                &admin_wallet,
                &store_keypair,
                100,
                None,
                true,
                false,
            )
            .await;

        airdrop(
            &mut context,
            &selling_resource_owner_keypair.pubkey(),
            10_000_000_000,
        )
        .await;

        let market_keypair = Keypair::new();

        let treasury_mint_keypair = Keypair::new();
        create_mint(
            &mut context,
            &treasury_mint_keypair,
            &admin_wallet.pubkey(),
            0,
        )
        .await;

        let (treasury_owner, treasyry_owner_bump) = find_treasury_owner_address(
            &treasury_mint_keypair.pubkey(),
            &selling_resource_keypair.pubkey(),
        );

        let treasury_holder_keypair = Keypair::new();
        create_token_account(
            &mut context,
            &treasury_holder_keypair,
            &treasury_mint_keypair.pubkey(),
            &treasury_owner,
        )
        .await;

        let start_date = context
            .banks_client
            .get_sysvar::<Clock>()
            .await
            .unwrap()
            .unix_timestamp
            + 1;

        let name = "Marktname".to_string();
        let description = "Marktbeschreibung".to_string();
        let mutable = true;
        let price = 1_000_000;
        let pieces_in_one_wallet = Some(1);

        // CreateMarket
        let accounts = mpl_fixed_price_sale_accounts::CreateMarket {
            market: market_keypair.pubkey(),
            store: store_keypair.pubkey(),
            selling_resource_owner: selling_resource_owner_keypair.pubkey(),
            selling_resource: selling_resource_keypair.pubkey(),
            mint: treasury_mint_keypair.pubkey(),
            treasury_holder: treasury_holder_keypair.pubkey(),
            owner: treasury_owner,
            system_program: system_program::id(),
        }
        .to_account_metas(None);

        let data = mpl_fixed_price_sale_instruction::CreateMarket {
            _treasury_owner_bump: treasyry_owner_bump,
            name: name.to_owned(),
            description: description.to_owned(),
            mutable,
            price,
            pieces_in_one_wallet,
            start_date: start_date as u64,
            end_date: None,
            gating_config: None,
        }
        .data();

        let instruction = Instruction {
            program_id: mpl_fixed_price_sale::id(),
            data,
            accounts,
        };

        let tx = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&context.payer.pubkey()),
            &[
                &context.payer,
                &market_keypair,
                &selling_resource_owner_keypair,
            ],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await.unwrap();

        let clock = context.banks_client.get_sysvar::<Clock>().await.unwrap();
        context.warp_to_slot(clock.slot + 1500).unwrap();

        // Buy setup
        let selling_resource_data = context
            .banks_client
            .get_account(selling_resource_keypair.pubkey())
            .await
            .unwrap()
            .unwrap()
            .data;
        let selling_resource =
            SellingResource::try_deserialize(&mut selling_resource_data.as_ref()).unwrap();

        let (trade_history, trade_history_bump) =
            find_trade_history_address(&context.payer.pubkey(), &market_keypair.pubkey());
        let (owner, vault_owner_bump) =
            find_vault_owner_address(&selling_resource.resource, &selling_resource.store);

        let payer_pubkey = context.payer.pubkey();

        let user_token_account = Keypair::new();
        create_token_account(
            &mut context,
            &user_token_account,
            &treasury_mint_keypair.pubkey(),
            &payer_pubkey,
        )
        .await;

        mint_to(
            &mut context,
            &treasury_mint_keypair.pubkey(),
            &user_token_account.pubkey(),
            &admin_wallet,
            1_000_000,
        )
        .await;

        let new_mint_keypair = Keypair::new();
        create_mint(&mut context, &new_mint_keypair, &payer_pubkey, 0).await;

        let new_mint_token_account = Keypair::new();
        create_token_account(
            &mut context,
            &new_mint_token_account,
            &new_mint_keypair.pubkey(),
            &payer_pubkey,
        )
        .await;

        let payer_keypair = Keypair::from_bytes(&context.payer.to_bytes()).unwrap();
        mint_to(
            &mut context,
            &new_mint_keypair.pubkey(),
            &new_mint_token_account.pubkey(),
            &payer_keypair,
            1,
        )
        .await;

        let (master_edition_metadata, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
            ],
            &mpl_token_metadata::id(),
        );

        let (master_edition, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
            ],
            &mpl_token_metadata::id(),
        );

        let (edition_marker, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
                selling_resource.supply.to_string().as_bytes(),
            ],
            &mpl_token_metadata::id(),
        );

        let (new_metadata, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                new_mint_keypair.pubkey().as_ref(),
            ],
            &mpl_token_metadata::id(),
        );

        let (new_edition, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                new_mint_keypair.pubkey().as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
            ],
            &mpl_token_metadata::id(),
        );

        // Buy
        let accounts = mpl_fixed_price_sale_accounts::Buy {
            market: market_keypair.pubkey(),
            selling_resource: selling_resource_keypair.pubkey(),
            user_token_account: user_token_account.pubkey(),
            user_wallet: context.payer.pubkey(),
            trade_history,
            treasury_holder: treasury_holder_keypair.pubkey(),
            new_metadata,
            new_edition,
            master_edition,
            new_mint: new_mint_keypair.pubkey(),
            edition_marker,
            vault: selling_resource.vault,
            owner,
            new_token_account: new_mint_token_account.pubkey(),
            master_edition_metadata,
            clock: sysvar::clock::id(),
            rent: sysvar::rent::id(),
            token_metadata_program: mpl_token_metadata::id(),
            token_program: spl_token::id(),
            system_program: system_program::id(),
        }
        .to_account_metas(None);

        let data = mpl_fixed_price_sale_instruction::Buy {
            _trade_history_bump: trade_history_bump,
            vault_owner_bump,
        }
        .data();

        let instruction = Instruction {
            program_id: mpl_fixed_price_sale::id(),
            data,
            accounts,
        };

        let tx = Transaction::new_signed_with_payer(
            &[instruction.clone()],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await.unwrap();

        let clock = context.banks_client.get_sysvar::<Clock>().await.unwrap();
        context.warp_to_slot(clock.slot + 3).unwrap();

        let tx = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );

        let err = context
            .banks_client
            .process_transaction(tx)
            .await
            .unwrap_err();

        match err {
            TransportError::Custom(_) => assert!(true),
            TransportError::TransactionError(_) => assert!(true),
            _ => assert!(false),
        }
    }

    #[tokio::test]
    async fn fail_supply_is_gt_than_max_supply() {
        setup_context!(context, mpl_fixed_price_sale, mpl_token_metadata);
        let (admin_wallet, store_keypair) = setup_store(&mut context).await;

        let (selling_resource_keypair, selling_resource_owner_keypair, _vault) =
            setup_selling_resource(
                &mut context,
                &admin_wallet,
                &store_keypair,
                100,
                None,
                true,
                false,
            )
            .await;

        airdrop(
            &mut context,
            &selling_resource_owner_keypair.pubkey(),
            10_000_000_000,
        )
        .await;

        let market_keypair = Keypair::new();

        let treasury_mint_keypair = Keypair::new();
        create_mint(
            &mut context,
            &treasury_mint_keypair,
            &admin_wallet.pubkey(),
            0,
        )
        .await;

        let (treasury_owner, treasyry_owner_bump) = find_treasury_owner_address(
            &treasury_mint_keypair.pubkey(),
            &selling_resource_keypair.pubkey(),
        );

        let treasury_holder_keypair = Keypair::new();
        create_token_account(
            &mut context,
            &treasury_holder_keypair,
            &treasury_mint_keypair.pubkey(),
            &treasury_owner,
        )
        .await;

        let start_date = context
            .banks_client
            .get_sysvar::<Clock>()
            .await
            .unwrap()
            .unix_timestamp
            + 1;

        let name = "Marktname".to_string();
        let description = "Marktbeschreibung".to_string();
        let mutable = true;
        let price = 1_000_000;
        let pieces_in_one_wallet = Some(1);

        // CreateMarket
        let accounts = mpl_fixed_price_sale_accounts::CreateMarket {
            market: market_keypair.pubkey(),
            store: store_keypair.pubkey(),
            selling_resource_owner: selling_resource_owner_keypair.pubkey(),
            selling_resource: selling_resource_keypair.pubkey(),
            mint: treasury_mint_keypair.pubkey(),
            treasury_holder: treasury_holder_keypair.pubkey(),
            owner: treasury_owner,
            system_program: system_program::id(),
        }
        .to_account_metas(None);

        let data = mpl_fixed_price_sale_instruction::CreateMarket {
            _treasury_owner_bump: treasyry_owner_bump,
            name: name.to_owned(),
            description: description.to_owned(),
            mutable,
            price,
            pieces_in_one_wallet,
            start_date: start_date as u64,
            end_date: None,
            gating_config: None,
        }
        .data();

        let instruction = Instruction {
            program_id: mpl_fixed_price_sale::id(),
            data,
            accounts,
        };

        let tx = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&context.payer.pubkey()),
            &[
                &context.payer,
                &market_keypair,
                &selling_resource_owner_keypair,
            ],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await.unwrap();

        let clock = context.banks_client.get_sysvar::<Clock>().await.unwrap();
        context.warp_to_slot(clock.slot + 1500).unwrap();

        // Buy setup
        let selling_resource_data = context
            .banks_client
            .get_account(selling_resource_keypair.pubkey())
            .await
            .unwrap()
            .unwrap()
            .data;
        let selling_resource =
            SellingResource::try_deserialize(&mut selling_resource_data.as_ref()).unwrap();

        let (trade_history, trade_history_bump) =
            find_trade_history_address(&context.payer.pubkey(), &market_keypair.pubkey());
        let (owner, vault_owner_bump) =
            find_vault_owner_address(&selling_resource.resource, &selling_resource.store);

        let payer_pubkey = context.payer.pubkey();

        let user_token_account = Keypair::new();
        create_token_account(
            &mut context,
            &user_token_account,
            &treasury_mint_keypair.pubkey(),
            &payer_pubkey,
        )
        .await;

        mint_to(
            &mut context,
            &treasury_mint_keypair.pubkey(),
            &user_token_account.pubkey(),
            &admin_wallet,
            1_000_000,
        )
        .await;

        let new_mint_keypair = Keypair::new();
        create_mint(&mut context, &new_mint_keypair, &payer_pubkey, 0).await;

        let new_mint_token_account = Keypair::new();
        create_token_account(
            &mut context,
            &new_mint_token_account,
            &new_mint_keypair.pubkey(),
            &payer_pubkey,
        )
        .await;

        let payer_keypair = Keypair::from_bytes(&context.payer.to_bytes()).unwrap();
        mint_to(
            &mut context,
            &new_mint_keypair.pubkey(),
            &new_mint_token_account.pubkey(),
            &payer_keypair,
            1,
        )
        .await;

        let (master_edition_metadata, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
            ],
            &mpl_token_metadata::id(),
        );

        let (master_edition, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
            ],
            &mpl_token_metadata::id(),
        );

        let (edition_marker, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
                selling_resource.supply.to_string().as_bytes(),
            ],
            &mpl_token_metadata::id(),
        );

        let (new_metadata, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                new_mint_keypair.pubkey().as_ref(),
            ],
            &mpl_token_metadata::id(),
        );

        let (new_edition, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                new_mint_keypair.pubkey().as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
            ],
            &mpl_token_metadata::id(),
        );

        // Buy
        let accounts = mpl_fixed_price_sale_accounts::Buy {
            market: market_keypair.pubkey(),
            selling_resource: selling_resource_keypair.pubkey(),
            user_token_account: user_token_account.pubkey(),
            user_wallet: context.payer.pubkey(),
            trade_history,
            treasury_holder: treasury_holder_keypair.pubkey(),
            new_metadata,
            new_edition,
            master_edition,
            new_mint: new_mint_keypair.pubkey(),
            edition_marker,
            vault: selling_resource.vault,
            owner,
            new_token_account: new_mint_token_account.pubkey(),
            master_edition_metadata,
            clock: sysvar::clock::id(),
            rent: sysvar::rent::id(),
            token_metadata_program: mpl_token_metadata::id(),
            token_program: spl_token::id(),
            system_program: system_program::id(),
        }
        .to_account_metas(None);

        let data = mpl_fixed_price_sale_instruction::Buy {
            _trade_history_bump: trade_history_bump,
            vault_owner_bump,
        }
        .data();

        let instruction = Instruction {
            program_id: mpl_fixed_price_sale::id(),
            data,
            accounts,
        };

        let tx = Transaction::new_signed_with_payer(
            &[instruction.clone()],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await.unwrap();

        let clock = context.banks_client.get_sysvar::<Clock>().await.unwrap();
        context.warp_to_slot(clock.slot + 3).unwrap();

        // Second user emitation
        let user_wallet = Keypair::new();
        airdrop(&mut context, &user_wallet.pubkey(), 1_000_000_000).await;

        let (trade_history, trade_history_bump) =
            find_trade_history_address(&user_wallet.pubkey(), &market_keypair.pubkey());

        let user_token_account = Keypair::new();
        create_token_account(
            &mut context,
            &user_token_account,
            &treasury_mint_keypair.pubkey(),
            &user_wallet.pubkey(),
        )
        .await;

        mint_to(
            &mut context,
            &treasury_mint_keypair.pubkey(),
            &user_token_account.pubkey(),
            &admin_wallet,
            1_000_000,
        )
        .await;

        let new_mint_keypair = Keypair::new();
        create_mint(&mut context, &new_mint_keypair, &user_wallet.pubkey(), 0).await;

        let new_mint_token_account = Keypair::new();
        create_token_account(
            &mut context,
            &new_mint_token_account,
            &new_mint_keypair.pubkey(),
            &user_wallet.pubkey(),
        )
        .await;

        mint_to(
            &mut context,
            &new_mint_keypair.pubkey(),
            &new_mint_token_account.pubkey(),
            &user_wallet,
            1,
        )
        .await;

        let (new_metadata, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                new_mint_keypair.pubkey().as_ref(),
            ],
            &mpl_token_metadata::id(),
        );

        let (new_edition, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                new_mint_keypair.pubkey().as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
            ],
            &mpl_token_metadata::id(),
        );

        // Buy
        let accounts = mpl_fixed_price_sale_accounts::Buy {
            market: market_keypair.pubkey(),
            selling_resource: selling_resource_keypair.pubkey(),
            user_token_account: user_token_account.pubkey(),
            user_wallet: user_wallet.pubkey(),
            trade_history,
            treasury_holder: treasury_holder_keypair.pubkey(),
            new_metadata,
            new_edition,
            master_edition,
            new_mint: new_mint_keypair.pubkey(),
            edition_marker,
            vault: selling_resource.vault,
            owner,
            new_token_account: new_mint_token_account.pubkey(),
            master_edition_metadata,
            clock: sysvar::clock::id(),
            rent: sysvar::rent::id(),
            token_metadata_program: mpl_token_metadata::id(),
            token_program: spl_token::id(),
            system_program: system_program::id(),
        }
        .to_account_metas(None);

        let data = mpl_fixed_price_sale_instruction::Buy {
            _trade_history_bump: trade_history_bump,
            vault_owner_bump,
        }
        .data();

        let instruction = Instruction {
            program_id: mpl_fixed_price_sale::id(),
            data,
            accounts,
        };

        let tx = Transaction::new_signed_with_payer(
            &[instruction.clone()],
            Some(&user_wallet.pubkey()),
            &[&user_wallet],
            context.last_blockhash,
        );

        let err = context
            .banks_client
            .process_transaction(tx)
            .await
            .unwrap_err();

        match err {
            TransportError::Custom(_) => assert!(true),
            TransportError::TransactionError(_) => assert!(true),
            _ => assert!(false),
        }
    }

    #[tokio::test]
    async fn success_gated_and_burn() {
        setup_context!(context, mpl_fixed_price_sale, mpl_token_metadata);
        let (admin_wallet, store_keypair) = setup_store(&mut context).await;

        let (selling_resource_keypair, selling_resource_owner_keypair, _vault) =
            setup_selling_resource(
                &mut context,
                &admin_wallet,
                &store_keypair,
                100,
                None,
                true,
                false,
            )
            .await;

        airdrop(
            &mut context,
            &selling_resource_owner_keypair.pubkey(),
            10_000_000_000,
        )
        .await;

        let market_keypair = Keypair::new();

        let treasury_mint = anchor_lang::solana_program::system_program::id();

        let (treasury_owner, treasyry_owner_bump) =
            find_treasury_owner_address(&treasury_mint, &selling_resource_keypair.pubkey());

        let start_date = context
            .banks_client
            .get_sysvar::<Clock>()
            .await
            .unwrap()
            .unix_timestamp
            + 1;

        let name = "Marktname".to_string();
        let description = "Marktbeschreibung".to_string();
        let mutable = true;
        let price = 1_000_000;
        let pieces_in_one_wallet = Some(1);

        let (collection_mint, _collection_token_acc) =
            create_collection(&mut context, &admin_wallet).await;

        // CreateMarket
        let mut accounts = mpl_fixed_price_sale_accounts::CreateMarket {
            market: market_keypair.pubkey(),
            store: store_keypair.pubkey(),
            selling_resource_owner: selling_resource_owner_keypair.pubkey(),
            selling_resource: selling_resource_keypair.pubkey(),
            mint: treasury_mint,
            treasury_holder: treasury_owner,
            owner: treasury_owner,
            system_program: system_program::id(),
        }
        .to_account_metas(None);

        accounts.push(AccountMeta {
            pubkey: collection_mint,
            is_signer: false,
            is_writable: false,
        });

        let data = mpl_fixed_price_sale_instruction::CreateMarket {
            _treasury_owner_bump: treasyry_owner_bump,
            name: name.to_owned(),
            description: description.to_owned(),
            mutable,
            price,
            pieces_in_one_wallet,
            start_date: start_date as u64,
            end_date: None,
            gating_config: Some(GatingConfig {
                collection: collection_mint,
                expire_on_use: true,
                gating_time: None,
            }),
        }
        .data();

        let instruction = Instruction {
            program_id: mpl_fixed_price_sale::id(),
            data,
            accounts,
        };

        let tx = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&context.payer.pubkey()),
            &[
                &context.payer,
                &market_keypair,
                &selling_resource_owner_keypair,
            ],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await.unwrap();

        let clock = context.banks_client.get_sysvar::<Clock>().await.unwrap();
        context.warp_to_slot(clock.slot + 1500).unwrap();

        // Buy setup
        let selling_resource_data = context
            .banks_client
            .get_account(selling_resource_keypair.pubkey())
            .await
            .unwrap()
            .unwrap()
            .data;
        let selling_resource =
            SellingResource::try_deserialize(&mut selling_resource_data.as_ref()).unwrap();

        let user_wallet = Keypair::new();
        airdrop(&mut context, &user_wallet.pubkey(), 1_000_000_000).await;

        let (collection_token_mint, user_collection_token_acc, user_collection_metadata) =
            create_master_nft(
                &mut context,
                &user_wallet,
                &collection_mint,
                &admin_wallet,
                true,
            )
            .await;

        let (trade_history, trade_history_bump) =
            find_trade_history_address(&user_wallet.pubkey(), &market_keypair.pubkey());
        let (owner, vault_owner_bump) =
            find_vault_owner_address(&selling_resource.resource, &selling_resource.store);

        let payer_pubkey = user_wallet.pubkey();

        let new_mint_keypair = Keypair::new();
        create_mint(&mut context, &new_mint_keypair, &payer_pubkey, 0).await;

        let new_mint_token_account = Keypair::new();
        create_token_account(
            &mut context,
            &new_mint_token_account,
            &new_mint_keypair.pubkey(),
            &payer_pubkey,
        )
        .await;

        let _payer_keypair = Keypair::from_bytes(&context.payer.to_bytes()).unwrap();
        mint_to(
            &mut context,
            &new_mint_keypair.pubkey(),
            &new_mint_token_account.pubkey(),
            &user_wallet,
            1,
        )
        .await;

        let (master_edition_metadata, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
            ],
            &mpl_token_metadata::id(),
        );

        let (master_edition, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
            ],
            &mpl_token_metadata::id(),
        );

        let (edition_marker, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
                selling_resource.supply.to_string().as_bytes(),
            ],
            &mpl_token_metadata::id(),
        );

        let (new_metadata, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                new_mint_keypair.pubkey().as_ref(),
            ],
            &mpl_token_metadata::id(),
        );

        let (new_edition, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                new_mint_keypair.pubkey().as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
            ],
            &mpl_token_metadata::id(),
        );

        // Buy
        let mut accounts = mpl_fixed_price_sale_accounts::Buy {
            market: market_keypair.pubkey(),
            selling_resource: selling_resource_keypair.pubkey(),
            user_token_account: user_wallet.pubkey(),
            user_wallet: user_wallet.pubkey(),
            trade_history,
            treasury_holder: treasury_owner,
            new_metadata,
            new_edition,
            master_edition,
            new_mint: new_mint_keypair.pubkey(),
            edition_marker,
            vault: selling_resource.vault,
            owner,
            new_token_account: new_mint_token_account.pubkey(),
            master_edition_metadata,
            clock: sysvar::clock::id(),
            rent: sysvar::rent::id(),
            token_metadata_program: mpl_token_metadata::id(),
            token_program: spl_token::id(),
            system_program: system_program::id(),
        }
        .to_account_metas(None);

        accounts.push(AccountMeta {
            pubkey: user_collection_token_acc,
            is_signer: false,
            is_writable: true,
        });
        accounts.push(AccountMeta {
            pubkey: collection_token_mint,
            is_signer: false,
            is_writable: true,
        });
        accounts.push(AccountMeta {
            pubkey: user_collection_metadata,
            is_signer: false,
            is_writable: false,
        });

        let data = mpl_fixed_price_sale_instruction::Buy {
            _trade_history_bump: trade_history_bump,
            vault_owner_bump,
        }
        .data();

        let instruction = Instruction {
            program_id: mpl_fixed_price_sale::id(),
            data,
            accounts,
        };

        let tx = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&context.payer.pubkey()),
            &[&context.payer, &user_wallet],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await.unwrap();

        let clock = context.banks_client.get_sysvar::<Clock>().await.unwrap();
        context.warp_to_slot(clock.slot + 3).unwrap();

        // Checks
        let selling_resource_acc = context
            .banks_client
            .get_account(selling_resource_keypair.pubkey())
            .await
            .unwrap()
            .unwrap();
        let selling_resource_data =
            SellingResource::try_deserialize(&mut selling_resource_acc.data.as_ref()).unwrap();

        let trade_history_acc = context
            .banks_client
            .get_account(trade_history)
            .await
            .unwrap()
            .unwrap();
        let trade_history_data =
            TradeHistory::try_deserialize(&mut trade_history_acc.data.as_ref()).unwrap();

        assert_eq!(selling_resource_data.supply, 1);
        assert_eq!(trade_history_data.already_bought, 1);

        let clock = context.banks_client.get_sysvar::<Clock>().await.unwrap();
        context.warp_to_slot(clock.slot + 3).unwrap();

        let user_collection_token_acc_data = context
            .banks_client
            .get_account(user_collection_token_acc)
            .await
            .unwrap()
            .unwrap()
            .data;
        let deserialized_token_acc_data =
            spl_token::state::Account::unpack_from_slice(user_collection_token_acc_data.as_ref())
                .unwrap();

        assert_eq!(deserialized_token_acc_data.amount, 0);
    }

    #[tokio::test]
    async fn success_gated_check_allowance() {
        setup_context!(context, mpl_fixed_price_sale, mpl_token_metadata);
        let (admin_wallet, store_keypair) = setup_store(&mut context).await;

        let (selling_resource_keypair, selling_resource_owner_keypair, _vault) =
            setup_selling_resource(
                &mut context,
                &admin_wallet,
                &store_keypair,
                100,
                None,
                true,
                false,
            )
            .await;

        airdrop(
            &mut context,
            &selling_resource_owner_keypair.pubkey(),
            10_000_000_000,
        )
        .await;

        let market_keypair = Keypair::new();

        let treasury_mint = anchor_lang::solana_program::system_program::id();

        let (treasury_owner, treasyry_owner_bump) =
            find_treasury_owner_address(&treasury_mint, &selling_resource_keypair.pubkey());

        let start_date = context
            .banks_client
            .get_sysvar::<Clock>()
            .await
            .unwrap()
            .unix_timestamp
            + 1;

        let name = "Marktname".to_string();
        let description = "Marktbeschreibung".to_string();
        let mutable = true;
        let price = 1_000_000;
        let pieces_in_one_wallet = Some(1);

        let (collection_mint, _collection_token_acc) =
            create_collection(&mut context, &admin_wallet).await;

        // CreateMarket
        let mut accounts = mpl_fixed_price_sale_accounts::CreateMarket {
            market: market_keypair.pubkey(),
            store: store_keypair.pubkey(),
            selling_resource_owner: selling_resource_owner_keypair.pubkey(),
            selling_resource: selling_resource_keypair.pubkey(),
            mint: treasury_mint,
            treasury_holder: treasury_owner,
            owner: treasury_owner,
            system_program: system_program::id(),
        }
        .to_account_metas(None);

        accounts.push(AccountMeta {
            pubkey: collection_mint,
            is_signer: false,
            is_writable: false,
        });

        let data = mpl_fixed_price_sale_instruction::CreateMarket {
            _treasury_owner_bump: treasyry_owner_bump,
            name: name.to_owned(),
            description: description.to_owned(),
            mutable,
            price,
            pieces_in_one_wallet,
            start_date: start_date as u64,
            end_date: None,
            gating_config: Some(GatingConfig {
                collection: collection_mint,
                expire_on_use: false,
                gating_time: None,
            }),
        }
        .data();

        let instruction = Instruction {
            program_id: mpl_fixed_price_sale::id(),
            data,
            accounts,
        };

        let tx = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&context.payer.pubkey()),
            &[
                &context.payer,
                &market_keypair,
                &selling_resource_owner_keypair,
            ],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await.unwrap();

        let clock = context.banks_client.get_sysvar::<Clock>().await.unwrap();
        context.warp_to_slot(clock.slot + 1500).unwrap();

        // Buy setup
        let selling_resource_data = context
            .banks_client
            .get_account(selling_resource_keypair.pubkey())
            .await
            .unwrap()
            .unwrap()
            .data;
        let selling_resource =
            SellingResource::try_deserialize(&mut selling_resource_data.as_ref()).unwrap();

        let user_wallet = Keypair::new();
        airdrop(&mut context, &user_wallet.pubkey(), 1_000_000_000).await;

        let (collection_token_mint, user_collection_token_acc, user_collection_metadata) =
            create_master_nft(
                &mut context,
                &user_wallet,
                &collection_mint,
                &admin_wallet,
                true,
            )
            .await;

        let (trade_history, trade_history_bump) =
            find_trade_history_address(&user_wallet.pubkey(), &market_keypair.pubkey());
        let (owner, vault_owner_bump) =
            find_vault_owner_address(&selling_resource.resource, &selling_resource.store);

        let payer_pubkey = user_wallet.pubkey();

        let new_mint_keypair = Keypair::new();
        create_mint(&mut context, &new_mint_keypair, &payer_pubkey, 0).await;

        let new_mint_token_account = Keypair::new();
        create_token_account(
            &mut context,
            &new_mint_token_account,
            &new_mint_keypair.pubkey(),
            &payer_pubkey,
        )
        .await;

        let _payer_keypair = Keypair::from_bytes(&context.payer.to_bytes()).unwrap();
        mint_to(
            &mut context,
            &new_mint_keypair.pubkey(),
            &new_mint_token_account.pubkey(),
            &user_wallet,
            1,
        )
        .await;

        let (master_edition_metadata, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
            ],
            &mpl_token_metadata::id(),
        );

        let (master_edition, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
            ],
            &mpl_token_metadata::id(),
        );

        let (edition_marker, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
                selling_resource.supply.to_string().as_bytes(),
            ],
            &mpl_token_metadata::id(),
        );

        let (new_metadata, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                new_mint_keypair.pubkey().as_ref(),
            ],
            &mpl_token_metadata::id(),
        );

        let (new_edition, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                new_mint_keypair.pubkey().as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
            ],
            &mpl_token_metadata::id(),
        );

        // Buy
        let mut accounts = mpl_fixed_price_sale_accounts::Buy {
            market: market_keypair.pubkey(),
            selling_resource: selling_resource_keypair.pubkey(),
            user_token_account: user_wallet.pubkey(),
            user_wallet: user_wallet.pubkey(),
            trade_history,
            treasury_holder: treasury_owner,
            new_metadata,
            new_edition,
            master_edition,
            new_mint: new_mint_keypair.pubkey(),
            edition_marker,
            vault: selling_resource.vault,
            owner,
            new_token_account: new_mint_token_account.pubkey(),
            master_edition_metadata,
            clock: sysvar::clock::id(),
            rent: sysvar::rent::id(),
            token_metadata_program: mpl_token_metadata::id(),
            token_program: spl_token::id(),
            system_program: system_program::id(),
        }
        .to_account_metas(None);

        accounts.push(AccountMeta {
            pubkey: user_collection_token_acc,
            is_signer: false,
            is_writable: true,
        });
        accounts.push(AccountMeta {
            pubkey: collection_token_mint,
            is_signer: false,
            is_writable: true,
        });
        accounts.push(AccountMeta {
            pubkey: user_collection_metadata,
            is_signer: false,
            is_writable: false,
        });

        let data = mpl_fixed_price_sale_instruction::Buy {
            _trade_history_bump: trade_history_bump,
            vault_owner_bump,
        }
        .data();

        let instruction = Instruction {
            program_id: mpl_fixed_price_sale::id(),
            data,
            accounts,
        };

        let tx = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&context.payer.pubkey()),
            &[&context.payer, &user_wallet],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await.unwrap();

        let clock = context.banks_client.get_sysvar::<Clock>().await.unwrap();
        context.warp_to_slot(clock.slot + 3).unwrap();

        // Checks
        let selling_resource_acc = context
            .banks_client
            .get_account(selling_resource_keypair.pubkey())
            .await
            .unwrap()
            .unwrap();
        let selling_resource_data =
            SellingResource::try_deserialize(&mut selling_resource_acc.data.as_ref()).unwrap();

        let trade_history_acc = context
            .banks_client
            .get_account(trade_history)
            .await
            .unwrap()
            .unwrap();
        let trade_history_data =
            TradeHistory::try_deserialize(&mut trade_history_acc.data.as_ref()).unwrap();

        assert_eq!(selling_resource_data.supply, 1);
        assert_eq!(trade_history_data.already_bought, 1);

        let clock = context.banks_client.get_sysvar::<Clock>().await.unwrap();
        context.warp_to_slot(clock.slot + 3).unwrap();

        let user_collection_token_acc_data = context
            .banks_client
            .get_account(user_collection_token_acc)
            .await
            .unwrap()
            .unwrap()
            .data;
        let deserialized_token_acc_data =
            spl_token::state::Account::unpack_from_slice(user_collection_token_acc_data.as_ref())
                .unwrap();

        assert_eq!(deserialized_token_acc_data.amount, 1);
    }

    #[tokio::test]
    async fn err_gated_unverified_nft() {
        setup_context!(context, mpl_fixed_price_sale, mpl_token_metadata);
        let (admin_wallet, store_keypair) = setup_store(&mut context).await;

        let (selling_resource_keypair, selling_resource_owner_keypair, _vault) =
            setup_selling_resource(
                &mut context,
                &admin_wallet,
                &store_keypair,
                100,
                None,
                true,
                false,
            )
            .await;

        airdrop(
            &mut context,
            &selling_resource_owner_keypair.pubkey(),
            10_000_000_000,
        )
        .await;

        let market_keypair = Keypair::new();

        let treasury_mint = anchor_lang::solana_program::system_program::id();

        let (treasury_owner, treasyry_owner_bump) =
            find_treasury_owner_address(&treasury_mint, &selling_resource_keypair.pubkey());

        let start_date = context
            .banks_client
            .get_sysvar::<Clock>()
            .await
            .unwrap()
            .unix_timestamp
            + 1;

        let name = "Marktname".to_string();
        let description = "Marktbeschreibung".to_string();
        let mutable = true;
        let price = 1_000_000;
        let pieces_in_one_wallet = Some(1);

        let (collection_mint, _collection_token_acc) =
            create_collection(&mut context, &admin_wallet).await;

        // CreateMarket
        let mut accounts = mpl_fixed_price_sale_accounts::CreateMarket {
            market: market_keypair.pubkey(),
            store: store_keypair.pubkey(),
            selling_resource_owner: selling_resource_owner_keypair.pubkey(),
            selling_resource: selling_resource_keypair.pubkey(),
            mint: treasury_mint,
            treasury_holder: treasury_owner,
            owner: treasury_owner,
            system_program: system_program::id(),
        }
        .to_account_metas(None);

        accounts.push(AccountMeta {
            pubkey: collection_mint,
            is_signer: false,
            is_writable: false,
        });

        let data = mpl_fixed_price_sale_instruction::CreateMarket {
            _treasury_owner_bump: treasyry_owner_bump,
            name: name.to_owned(),
            description: description.to_owned(),
            mutable,
            price,
            pieces_in_one_wallet,
            start_date: start_date as u64,
            end_date: None,
            gating_config: Some(GatingConfig {
                collection: collection_mint,
                expire_on_use: false,
                gating_time: None,
            }),
        }
        .data();

        let instruction = Instruction {
            program_id: mpl_fixed_price_sale::id(),
            data,
            accounts,
        };

        let tx = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&context.payer.pubkey()),
            &[
                &context.payer,
                &market_keypair,
                &selling_resource_owner_keypair,
            ],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await.unwrap();

        let clock = context.banks_client.get_sysvar::<Clock>().await.unwrap();
        context.warp_to_slot(clock.slot + 1500).unwrap();

        // Buy setup
        let selling_resource_data = context
            .banks_client
            .get_account(selling_resource_keypair.pubkey())
            .await
            .unwrap()
            .unwrap()
            .data;
        let selling_resource =
            SellingResource::try_deserialize(&mut selling_resource_data.as_ref()).unwrap();

        let user_wallet = Keypair::new();
        airdrop(&mut context, &user_wallet.pubkey(), 1_000_000_000).await;

        let (collection_token_mint, user_collection_token_acc, user_collection_metadata) =
            create_master_nft(
                &mut context,
                &user_wallet,
                &collection_mint,
                &admin_wallet,
                false,
            )
            .await;

        let (trade_history, trade_history_bump) =
            find_trade_history_address(&user_wallet.pubkey(), &market_keypair.pubkey());
        let (owner, vault_owner_bump) =
            find_vault_owner_address(&selling_resource.resource, &selling_resource.store);

        let payer_pubkey = user_wallet.pubkey();

        let new_mint_keypair = Keypair::new();
        create_mint(&mut context, &new_mint_keypair, &payer_pubkey, 0).await;

        let new_mint_token_account = Keypair::new();
        create_token_account(
            &mut context,
            &new_mint_token_account,
            &new_mint_keypair.pubkey(),
            &payer_pubkey,
        )
        .await;

        let _payer_keypair = Keypair::from_bytes(&context.payer.to_bytes()).unwrap();
        mint_to(
            &mut context,
            &new_mint_keypair.pubkey(),
            &new_mint_token_account.pubkey(),
            &user_wallet,
            1,
        )
        .await;

        let (master_edition_metadata, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
            ],
            &mpl_token_metadata::id(),
        );

        let (master_edition, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
            ],
            &mpl_token_metadata::id(),
        );

        let (edition_marker, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
                selling_resource.supply.to_string().as_bytes(),
            ],
            &mpl_token_metadata::id(),
        );

        let (new_metadata, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                new_mint_keypair.pubkey().as_ref(),
            ],
            &mpl_token_metadata::id(),
        );

        let (new_edition, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                new_mint_keypair.pubkey().as_ref(),
                mpl_token_metadata::state::EDITION.as_bytes(),
            ],
            &mpl_token_metadata::id(),
        );

        // Buy
        let mut accounts = mpl_fixed_price_sale_accounts::Buy {
            market: market_keypair.pubkey(),
            selling_resource: selling_resource_keypair.pubkey(),
            user_token_account: user_wallet.pubkey(),
            user_wallet: user_wallet.pubkey(),
            trade_history,
            treasury_holder: treasury_owner,
            new_metadata,
            new_edition,
            master_edition,
            new_mint: new_mint_keypair.pubkey(),
            edition_marker,
            vault: selling_resource.vault,
            owner,
            new_token_account: new_mint_token_account.pubkey(),
            master_edition_metadata,
            clock: sysvar::clock::id(),
            rent: sysvar::rent::id(),
            token_metadata_program: mpl_token_metadata::id(),
            token_program: spl_token::id(),
            system_program: system_program::id(),
        }
        .to_account_metas(None);

        accounts.push(AccountMeta {
            pubkey: user_collection_token_acc,
            is_signer: false,
            is_writable: true,
        });
        accounts.push(AccountMeta {
            pubkey: collection_token_mint,
            is_signer: false,
            is_writable: true,
        });
        accounts.push(AccountMeta {
            pubkey: user_collection_metadata,
            is_signer: false,
            is_writable: false,
        });

        let data = mpl_fixed_price_sale_instruction::Buy {
            _trade_history_bump: trade_history_bump,
            vault_owner_bump,
        }
        .data();

        let instruction = Instruction {
            program_id: mpl_fixed_price_sale::id(),
            data,
            accounts,
        };

        let tx = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&context.payer.pubkey()),
            &[&context.payer, &user_wallet],
            context.last_blockhash,
        );

        let err = context
            .banks_client
            .process_transaction(tx)
            .await
            .unwrap_err();

        match err {
            TransportError::TransactionError(TransactionError::InstructionError(
                0,
                InstructionError::Custom(err_code),
            )) => {
                assert_eq!(
                    err_code,
                    ERROR_CODE_OFFSET + ErrorCode::WrongGatingMetadataAccount as u32
                );
            }
            _ => assert!(false),
        }
    }
}
