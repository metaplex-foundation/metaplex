mod utils;

#[cfg(feature = "test-bpf")]
mod create_market {
    use crate::utils::{
        helpers::{create_mint, create_token_account},
        setup_functions::{setup_market, setup_selling_resource, setup_store},
    };
    use anchor_lang::{AccountDeserialize, InstructionData, ToAccountMetas};
    use mpl_fixed_price_sale::{
        accounts as mpl_fixed_price_sale_accounts, instruction as mpl_fixed_price_sale_instruction,
        state::{Market, MarketState},
        utils::{
            find_treasury_owner_address, puffed_out_string, DESCRIPTION_MAX_LEN, NAME_MAX_LEN,
        },
    };
    use solana_program_test::*;
    use solana_sdk::{
        instruction::Instruction, signature::Keypair, signer::Signer, system_program,
        sysvar::clock::Clock, transaction::Transaction, transport::TransportError,
    };

    use crate::setup_context;

    #[tokio::test]
    async fn success() {
        setup_context!(context, mpl_fixed_price_sale, mpl_token_metadata);
        let (admin_wallet, store_keypair) = setup_store(&mut context).await;

        let (selling_resource_keypair, selling_resource_owner_keypair, _) = setup_selling_resource(
            &mut context,
            &admin_wallet,
            &store_keypair,
            100,
            None,
            true,
            false,
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

        let market_acc = context
            .banks_client
            .get_account(market_keypair.pubkey())
            .await
            .expect("account not found")
            .expect("account empty");

        let market_data = Market::try_deserialize(&mut market_acc.data.as_ref()).unwrap();

        assert_eq!(store_keypair.pubkey(), market_data.store);
        assert_eq!(
            selling_resource_keypair.pubkey(),
            market_data.selling_resource
        );
        assert_eq!(treasury_mint_keypair.pubkey(), market_data.treasury_mint);
        assert_eq!(
            treasury_holder_keypair.pubkey(),
            market_data.treasury_holder
        );
        assert_eq!(treasury_owner, market_data.treasury_owner);
        assert_eq!(selling_resource_owner_keypair.pubkey(), market_data.owner);
        assert_eq!(puffed_out_string(name, NAME_MAX_LEN), market_data.name);
        assert_eq!(
            puffed_out_string(description, DESCRIPTION_MAX_LEN),
            market_data.description
        );
        assert_eq!(mutable, market_data.mutable);
        assert_eq!(price, market_data.price);
        assert_eq!(pieces_in_one_wallet, market_data.pieces_in_one_wallet);
        assert_eq!(MarketState::Created, market_data.state);
    }

    #[tokio::test]
    async fn function_setup_market_success() {
        setup_context!(context, mpl_fixed_price_sale, mpl_token_metadata);
        let (admin_wallet, store_keypair) = setup_store(&mut context).await;

        let (selling_resource_keypair, selling_resource_owner_keypair, _) = setup_selling_resource(
            &mut context,
            &admin_wallet,
            &store_keypair,
            100,
            None,
            true,
            false,
        )
        .await;

        let market_keypair = setup_market(
            &mut context,
            &admin_wallet,
            &store_keypair,
            &selling_resource_keypair,
            &selling_resource_owner_keypair,
        )
        .await;

        let market_acc = context
            .banks_client
            .get_account(market_keypair.pubkey())
            .await
            .expect("account not found")
            .expect("account empty");

        let market_data = Market::try_deserialize(&mut market_acc.data.as_ref()).unwrap();

        assert_eq!(store_keypair.pubkey(), market_data.store);
        assert_eq!(
            selling_resource_keypair.pubkey(),
            market_data.selling_resource
        );
        assert_eq!(selling_resource_owner_keypair.pubkey(), market_data.owner);
        assert_eq!(MarketState::Created, market_data.state);
    }

    #[tokio::test]
    async fn failure_name_is_long() {
        setup_context!(context, mpl_fixed_price_sale, mpl_token_metadata);
        let (admin_wallet, store_keypair) = setup_store(&mut context).await;

        let (selling_resource_keypair, selling_resource_owner_keypair, _) = setup_selling_resource(
            &mut context,
            &admin_wallet,
            &store_keypair,
            100,
            None,
            true,
            false,
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

        // name is longer than allowed
        let name = String::from("123456789_123456789_123456789_123456789_1");
        let description = "Marktbeschreibung".to_string();
        let mutable = true;
        let price = 1_000_000;
        let pieces_in_one_wallet = Some(1);

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

        let tx_result = context.banks_client.process_transaction(tx).await;

        match tx_result.unwrap_err() {
            TransportError::Custom(_) => assert!(true),
            TransportError::TransactionError(_) => assert!(true),
            _ => assert!(false),
        }
    }

    #[tokio::test]
    async fn failure_description_is_long() {
        setup_context!(context, mpl_fixed_price_sale, mpl_token_metadata);
        let (admin_wallet, store_keypair) = setup_store(&mut context).await;

        let (selling_resource_keypair, selling_resource_owner_keypair, _) = setup_selling_resource(
            &mut context,
            &admin_wallet,
            &store_keypair,
            100,
            None,
            true,
            false,
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
        // description is longer than allowed
        let description =
            String::from("123456789_123456789_123456789_123456789_123456789_123456789_1");

        let mutable = true;
        let price = 1_000_000;
        let pieces_in_one_wallet = Some(1);

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

        let tx_result = context.banks_client.process_transaction(tx).await;

        match tx_result.unwrap_err() {
            TransportError::Custom(_) => assert!(true),
            TransportError::TransactionError(_) => assert!(true),
            _ => assert!(false),
        }
    }

    #[tokio::test]
    #[should_panic]
    async fn failure_signer_is_missed() {
        setup_context!(context, mpl_fixed_price_sale, mpl_token_metadata);
        let (admin_wallet, store_keypair) = setup_store(&mut context).await;

        let (selling_resource_keypair, selling_resource_owner_keypair, _) = setup_selling_resource(
            &mut context,
            &admin_wallet,
            &store_keypair,
            100,
            None,
            true,
            false,
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
            &[&context.payer, &market_keypair],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await.unwrap();
    }

    #[tokio::test]
    async fn failure_start_date_is_in_the_past() {
        setup_context!(context, mpl_fixed_price_sale, mpl_token_metadata);
        let (admin_wallet, store_keypair) = setup_store(&mut context).await;

        let (selling_resource_keypair, selling_resource_owner_keypair, _) = setup_selling_resource(
            &mut context,
            &admin_wallet,
            &store_keypair,
            100,
            None,
            true,
            false,
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
            - 1;

        let name = "Marktname".to_string();
        let description = "Marktbeschreibung".to_string();

        let mutable = true;
        let price = 1_000_000;
        let pieces_in_one_wallet = Some(1);

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

        let tx_result = context.banks_client.process_transaction(tx).await;

        match tx_result.unwrap_err() {
            TransportError::Custom(_) => assert!(true),
            TransportError::TransactionError(_) => assert!(true),
            _ => assert!(false),
        }
    }

    #[tokio::test]
    #[should_panic]
    async fn failure_treasure_min_unitialized() {
        setup_context!(context, mpl_fixed_price_sale, mpl_token_metadata);
        let (admin_wallet, store_keypair) = setup_store(&mut context).await;

        let (selling_resource_keypair, selling_resource_owner_keypair, _) = setup_selling_resource(
            &mut context,
            &admin_wallet,
            &store_keypair,
            100,
            None,
            true,
            false,
        )
        .await;

        let market_keypair = Keypair::new();

        let treasury_mint_keypair = Keypair::new();

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
    }

    #[tokio::test]
    async fn failure_treasure_holder_unitialized() {
        setup_context!(context, mpl_fixed_price_sale, mpl_token_metadata);
        let (admin_wallet, store_keypair) = setup_store(&mut context).await;

        let (selling_resource_keypair, selling_resource_owner_keypair, _) = setup_selling_resource(
            &mut context,
            &admin_wallet,
            &store_keypair,
            100,
            None,
            true,
            false,
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

        let tx_result = context.banks_client.process_transaction(tx).await;

        match tx_result.unwrap_err() {
            TransportError::Custom(_) => assert!(true),
            TransportError::TransactionError(_) => assert!(true),
            _ => assert!(false),
        }
    }

    #[tokio::test]
    // #[should_panic]
    async fn failure_end_date_is_earlier_than_start_date() {
        setup_context!(context, mpl_fixed_price_sale, mpl_token_metadata);
        let (admin_wallet, store_keypair) = setup_store(&mut context).await;

        let (selling_resource_keypair, selling_resource_owner_keypair, _) = setup_selling_resource(
            &mut context,
            &admin_wallet,
            &store_keypair,
            100,
            None,
            true,
            false,
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

        let end_date = start_date - 2;

        let name = "Marktname".to_string();
        let description = "Marktbeschreibung".to_string();

        let mutable = true;
        let price = 1_000_000;
        let pieces_in_one_wallet = Some(1);

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

        let tx_result = context.banks_client.process_transaction(tx).await;

        match tx_result.unwrap_err() {
            TransportError::Custom(_) => assert!(true),
            TransportError::TransactionError(_) => assert!(true),
            _ => assert!(false),
        }
    }
}
