mod utils;

#[cfg(feature = "test-bpf")]
mod save_primary_metadata_creators {
    use crate::{
        setup_context,
        utils::{
            helpers::{create_mint, create_token_account, create_token_metadata, mint_to},
            setup_functions::setup_store,
        },
    };
    use anchor_client::solana_sdk::{signature::Keypair, signer::Signer, system_program};
    use anchor_lang::{AccountDeserialize, InstructionData, ToAccountMetas};
    use mpl_fixed_price_sale::{
        accounts as mpl_fixed_price_sale_accounts, instruction as mpl_fixed_price_sale_instruction,
        state::PrimaryMetadataCreators,
    };
    use solana_program::instruction::Instruction;
    use solana_program_test::*;
    use solana_sdk::{transaction::Transaction, transport::TransportError};

    #[tokio::test]
    async fn success() {
        setup_context!(context, mpl_fixed_price_sale, mpl_token_metadata);
        let (admin_wallet, store_keypair) = setup_store(&mut context).await;

        // Create `SellingResource`
        let resource_mint = Keypair::new();
        create_mint(&mut context, &resource_mint, &admin_wallet.pubkey(), 0).await;

        let resource_token = Keypair::new();
        create_token_account(
            &mut context,
            &resource_token,
            &resource_mint.pubkey(),
            &admin_wallet.pubkey(),
        )
        .await;

        let (vault_owner, _vault_owner_bump) =
            mpl_fixed_price_sale::utils::find_vault_owner_address(
                &resource_mint.pubkey(),
                &store_keypair.pubkey(),
            );

        let vault = Keypair::new();
        create_token_account(&mut context, &vault, &resource_mint.pubkey(), &vault_owner).await;

        mint_to(
            &mut context,
            &resource_mint.pubkey(),
            &resource_token.pubkey(),
            &admin_wallet,
            1,
        )
        .await;

        // Create metadata
        let metadata = create_token_metadata(
            &mut context,
            &resource_mint.pubkey(),
            &admin_wallet,
            &admin_wallet,
            String::from("TEST"),
            String::from("TST"),
            String::from("https://github.com/"),
            Some(vec![mpl_token_metadata::state::Creator {
                address: admin_wallet.pubkey(),
                share: 100,
                verified: false,
            }]),
            100,
            true,
            true,
            None,
        )
        .await;

        let (primary_metadata_creators, primary_metadata_creators_bump) =
            mpl_fixed_price_sale::utils::find_primary_metadata_creators(&metadata);

        let accounts = mpl_fixed_price_sale_accounts::SavePrimaryMetadataCreators {
            admin: admin_wallet.pubkey(),
            metadata,
            primary_metadata_creators,
            system_program: system_program::id(),
        }
        .to_account_metas(None);

        let data = mpl_fixed_price_sale_instruction::SavePrimaryMetadataCreators {
            primary_metadata_creators_bump: primary_metadata_creators_bump,
            creators: vec![mpl_token_metadata::state::Creator {
                address: admin_wallet.pubkey(),
                share: 100,
                verified: false,
            }],
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
            &[&context.payer, &admin_wallet],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await.unwrap();

        let primary_metadata_creators_acc = context
            .banks_client
            .get_account(primary_metadata_creators)
            .await
            .expect("account not found")
            .expect("account empty");

        let primary_metadata_creators = PrimaryMetadataCreators::try_deserialize(
            &mut primary_metadata_creators_acc.data.as_ref(),
        )
        .unwrap();
        assert!(!primary_metadata_creators.creators.is_empty());
    }

    #[tokio::test]
    async fn fail_creators_is_gt_than_available() {
        setup_context!(context, mpl_fixed_price_sale, mpl_token_metadata);
        let (admin_wallet, store_keypair) = setup_store(&mut context).await;

        // Create `SellingResource`
        let resource_mint = Keypair::new();
        create_mint(&mut context, &resource_mint, &admin_wallet.pubkey(), 0).await;

        let resource_token = Keypair::new();
        create_token_account(
            &mut context,
            &resource_token,
            &resource_mint.pubkey(),
            &admin_wallet.pubkey(),
        )
        .await;

        let (vault_owner, _vault_owner_bump) =
            mpl_fixed_price_sale::utils::find_vault_owner_address(
                &resource_mint.pubkey(),
                &store_keypair.pubkey(),
            );

        let vault = Keypair::new();
        create_token_account(&mut context, &vault, &resource_mint.pubkey(), &vault_owner).await;

        mint_to(
            &mut context,
            &resource_mint.pubkey(),
            &resource_token.pubkey(),
            &admin_wallet,
            1,
        )
        .await;

        // Create metadata
        let metadata = create_token_metadata(
            &mut context,
            &resource_mint.pubkey(),
            &admin_wallet,
            &admin_wallet,
            String::from("TEST"),
            String::from("TST"),
            String::from("https://github.com/"),
            Some(vec![mpl_token_metadata::state::Creator {
                address: admin_wallet.pubkey(),
                share: 100,
                verified: false,
            }]),
            100,
            true,
            true,
            None,
        )
        .await;

        let (primary_metadata_creators, primary_metadata_creators_bump) =
            mpl_fixed_price_sale::utils::find_primary_metadata_creators(&metadata);

        let accounts = mpl_fixed_price_sale_accounts::SavePrimaryMetadataCreators {
            admin: admin_wallet.pubkey(),
            metadata,
            primary_metadata_creators,
            system_program: system_program::id(),
        }
        .to_account_metas(None);

        let data = mpl_fixed_price_sale_instruction::SavePrimaryMetadataCreators {
            primary_metadata_creators_bump: primary_metadata_creators_bump,
            creators: vec![
                mpl_token_metadata::state::Creator {
                    address: admin_wallet.pubkey(),
                    share: 10,
                    verified: false,
                },
                mpl_token_metadata::state::Creator {
                    address: admin_wallet.pubkey(),
                    share: 10,
                    verified: false,
                },
                mpl_token_metadata::state::Creator {
                    address: admin_wallet.pubkey(),
                    share: 10,
                    verified: false,
                },
                mpl_token_metadata::state::Creator {
                    address: admin_wallet.pubkey(),
                    share: 10,
                    verified: false,
                },
                mpl_token_metadata::state::Creator {
                    address: admin_wallet.pubkey(),
                    share: 10,
                    verified: false,
                },
                mpl_token_metadata::state::Creator {
                    address: admin_wallet.pubkey(),
                    share: 10,
                    verified: false,
                },
            ],
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
            &[&context.payer, &admin_wallet],
            context.last_blockhash,
        );

        let tx_error = context
            .banks_client
            .process_transaction(tx)
            .await
            .unwrap_err();
        match tx_error {
            TransportError::Custom(_) => assert!(true),
            TransportError::TransactionError(_) => assert!(true),
            _ => assert!(false),
        }
    }

    #[tokio::test]
    async fn fail_creators_is_empty() {
        setup_context!(context, mpl_fixed_price_sale, mpl_token_metadata);
        let (admin_wallet, store_keypair) = setup_store(&mut context).await;

        // Create `SellingResource`
        let resource_mint = Keypair::new();
        create_mint(&mut context, &resource_mint, &admin_wallet.pubkey(), 0).await;

        let resource_token = Keypair::new();
        create_token_account(
            &mut context,
            &resource_token,
            &resource_mint.pubkey(),
            &admin_wallet.pubkey(),
        )
        .await;

        let (vault_owner, _vault_owner_bump) =
            mpl_fixed_price_sale::utils::find_vault_owner_address(
                &resource_mint.pubkey(),
                &store_keypair.pubkey(),
            );

        let vault = Keypair::new();
        create_token_account(&mut context, &vault, &resource_mint.pubkey(), &vault_owner).await;

        mint_to(
            &mut context,
            &resource_mint.pubkey(),
            &resource_token.pubkey(),
            &admin_wallet,
            1,
        )
        .await;

        // Create metadata
        let metadata = create_token_metadata(
            &mut context,
            &resource_mint.pubkey(),
            &admin_wallet,
            &admin_wallet,
            String::from("TEST"),
            String::from("TST"),
            String::from("https://github.com/"),
            Some(vec![mpl_token_metadata::state::Creator {
                address: admin_wallet.pubkey(),
                share: 100,
                verified: false,
            }]),
            100,
            true,
            true,
            None,
        )
        .await;

        let (primary_metadata_creators, primary_metadata_creators_bump) =
            mpl_fixed_price_sale::utils::find_primary_metadata_creators(&metadata);

        let accounts = mpl_fixed_price_sale_accounts::SavePrimaryMetadataCreators {
            admin: admin_wallet.pubkey(),
            metadata,
            primary_metadata_creators,
            system_program: system_program::id(),
        }
        .to_account_metas(None);

        let data = mpl_fixed_price_sale_instruction::SavePrimaryMetadataCreators {
            primary_metadata_creators_bump: primary_metadata_creators_bump,
            creators: Vec::new(),
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
            &[&context.payer, &admin_wallet],
            context.last_blockhash,
        );

        let tx_error = context
            .banks_client
            .process_transaction(tx)
            .await
            .unwrap_err();
        match tx_error {
            TransportError::Custom(_) => assert!(true),
            TransportError::TransactionError(_) => assert!(true),
            _ => assert!(false),
        }
    }

    #[tokio::test]
    async fn fail_metadata_is_not_mutable() {
        setup_context!(context, mpl_fixed_price_sale, mpl_token_metadata);
        let (admin_wallet, store_keypair) = setup_store(&mut context).await;

        // Create `SellingResource`
        let resource_mint = Keypair::new();
        create_mint(&mut context, &resource_mint, &admin_wallet.pubkey(), 0).await;

        let resource_token = Keypair::new();
        create_token_account(
            &mut context,
            &resource_token,
            &resource_mint.pubkey(),
            &admin_wallet.pubkey(),
        )
        .await;

        let (vault_owner, _vault_owner_bump) =
            mpl_fixed_price_sale::utils::find_vault_owner_address(
                &resource_mint.pubkey(),
                &store_keypair.pubkey(),
            );

        let vault = Keypair::new();
        create_token_account(&mut context, &vault, &resource_mint.pubkey(), &vault_owner).await;

        mint_to(
            &mut context,
            &resource_mint.pubkey(),
            &resource_token.pubkey(),
            &admin_wallet,
            1,
        )
        .await;

        // Create metadata
        let metadata = create_token_metadata(
            &mut context,
            &resource_mint.pubkey(),
            &admin_wallet,
            &admin_wallet,
            String::from("TEST"),
            String::from("TST"),
            String::from("https://github.com/"),
            Some(vec![mpl_token_metadata::state::Creator {
                address: admin_wallet.pubkey(),
                share: 100,
                verified: false,
            }]),
            100,
            true,
            false,
            None,
        )
        .await;

        let (primary_metadata_creators, primary_metadata_creators_bump) =
            mpl_fixed_price_sale::utils::find_primary_metadata_creators(&metadata);

        let accounts = mpl_fixed_price_sale_accounts::SavePrimaryMetadataCreators {
            admin: admin_wallet.pubkey(),
            metadata,
            primary_metadata_creators,
            system_program: system_program::id(),
        }
        .to_account_metas(None);

        let data = mpl_fixed_price_sale_instruction::SavePrimaryMetadataCreators {
            primary_metadata_creators_bump: primary_metadata_creators_bump,
            creators: vec![mpl_token_metadata::state::Creator {
                address: admin_wallet.pubkey(),
                share: 10,
                verified: false,
            }],
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
            &[&context.payer, &admin_wallet],
            context.last_blockhash,
        );

        let tx_error = context
            .banks_client
            .process_transaction(tx)
            .await
            .unwrap_err();
        match tx_error {
            TransportError::Custom(_) => assert!(true),
            TransportError::TransactionError(_) => assert!(true),
            _ => assert!(false),
        }
    }
}
