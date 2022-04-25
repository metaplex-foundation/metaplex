mod utils;

#[cfg(feature = "test-bpf")]
mod claim_resource {
    use crate::{
        setup_context,
        utils::{
            helpers::{airdrop, create_mint, create_token_account, mint_to},
            setup_functions::{setup_selling_resource, setup_store},
        },
    };
    use anchor_lang::{AccountDeserialize, Id, InstructionData, System, ToAccountMetas};
    use mpl_fixed_price_sale::{
        accounts as mpl_fixed_price_sale_accounts, instruction as mpl_fixed_price_sale_instruction,
        state::SellingResource,
        utils::{
            find_payout_ticket_address, find_primary_metadata_creators, find_trade_history_address,
            find_treasury_owner_address, find_vault_owner_address,
        },
    };
    use solana_program::clock::Clock;
    use solana_program_test::*;
    use solana_sdk::{
        instruction::{AccountMeta, Instruction},
        pubkey::Pubkey,
        signature::Keypair,
        signer::Signer,
        system_program, sysvar,
        transaction::Transaction,
        transport::TransportError,
    };

    #[tokio::test]
    async fn success() {
        setup_context!(context, mpl_fixed_price_sale, mpl_token_metadata);
        let (admin_wallet, store_keypair) = setup_store(&mut context).await;

        let (selling_resource_keypair, selling_resource_owner_keypair, vault) =
            setup_selling_resource(
                &mut context,
                &admin_wallet,
                &store_keypair,
                100,
                None,
                true,
                true,
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

        let (primary_metadata_creators, primary_metadata_creators_bump) =
            find_primary_metadata_creators(&master_edition_metadata);

        // SavePrimaryMetadataCreators
        let accounts = mpl_fixed_price_sale_accounts::SavePrimaryMetadataCreators {
            admin: selling_resource_owner_keypair.pubkey(),
            metadata: master_edition_metadata,
            primary_metadata_creators,
            system_program: system_program::id(),
        }
        .to_account_metas(None);

        let primary_royalties_holder = Keypair::new();

        let data = mpl_fixed_price_sale_instruction::SavePrimaryMetadataCreators {
            primary_metadata_creators_bump: primary_metadata_creators_bump,
            creators: vec![mpl_token_metadata::state::Creator {
                address: primary_royalties_holder.pubkey(),
                verified: false,
                share: 100,
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

        context.banks_client.process_transaction(tx).await.unwrap();

        let clock = context.banks_client.get_sysvar::<Clock>().await.unwrap();
        context.warp_to_slot(clock.slot + 3).unwrap();

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

        // Withdraw
        let (payout_ticket, payout_ticket_bump) = find_payout_ticket_address(
            &market_keypair.pubkey(),
            &primary_royalties_holder.pubkey(),
        );

        let destination = spl_associated_token_account::get_associated_token_address(
            &primary_royalties_holder.pubkey(),
            &treasury_mint_keypair.pubkey(),
        );

        let (metadata, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
            ],
            &mpl_token_metadata::id(),
        );

        let mut accounts = mpl_fixed_price_sale_accounts::Withdraw {
            market: market_keypair.pubkey(),
            selling_resource: selling_resource_keypair.pubkey(),
            metadata,
            treasury_holder: treasury_holder_keypair.pubkey(),
            treasury_mint: treasury_mint_keypair.pubkey(),
            owner: treasury_owner,
            destination,
            funder: primary_royalties_holder.pubkey(),
            payer: payer_pubkey,
            payout_ticket,
            rent: sysvar::rent::id(),
            clock: sysvar::clock::id(),
            token_program: spl_token::id(),
            associated_token_program: spl_associated_token_account::id(),
            system_program: system_program::id(),
        }
        .to_account_metas(None);
        accounts.push(AccountMeta::new(primary_metadata_creators, false));

        let data = mpl_fixed_price_sale_instruction::Withdraw {
            payout_ticket_bump,
            treasury_owner_bump: treasyry_owner_bump,
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

        // ClaimResource
        let claim_token = Keypair::new();
        create_token_account(
            &mut context,
            &claim_token,
            &selling_resource.resource,
            &admin_wallet.pubkey(),
        )
        .await;

        let accounts = mpl_fixed_price_sale_accounts::ClaimResource {
            market: market_keypair.pubkey(),
            treasury_holder: treasury_holder_keypair.pubkey(),
            selling_resource: selling_resource_keypair.pubkey(),
            selling_resource_owner: selling_resource_owner_keypair.pubkey(),
            vault: vault.pubkey(),
            metadata,
            owner,
            destination: claim_token.pubkey(),
            clock: sysvar::clock::id(),
            token_program: spl_token::id(),
            token_metadata_program: mpl_token_metadata::id(),
            system_program: system_program::id(),
        }
        .to_account_metas(None);

        let data = mpl_fixed_price_sale_instruction::ClaimResource { vault_owner_bump }.data();

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
                true,
            )
            .await;

        airdrop(
            &mut context,
            &selling_resource_owner_keypair.pubkey(),
            10_000_000_000,
        )
        .await;

        let market_keypair = Keypair::new();
        let treasury_mint = System::id();

        let (treasury_owner, treasyry_owner_bump) =
            find_treasury_owner_address(&treasury_mint, &selling_resource_keypair.pubkey());

        let treasury_holder = treasury_owner.clone();

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
            treasury_holder,
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
        airdrop(&mut context, &user_token_account.pubkey(), 10_000_000_000).await;

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

        let (primary_metadata_creators, primary_metadata_creators_bump) =
            find_primary_metadata_creators(&master_edition_metadata);

        // SavePrimaryMetadataCreators
        let accounts = mpl_fixed_price_sale_accounts::SavePrimaryMetadataCreators {
            admin: selling_resource_owner_keypair.pubkey(),
            metadata: master_edition_metadata,
            primary_metadata_creators,
            system_program: system_program::id(),
        }
        .to_account_metas(None);

        let primary_royalties_receiver = Keypair::new();

        let data = mpl_fixed_price_sale_instruction::SavePrimaryMetadataCreators {
            primary_metadata_creators_bump: primary_metadata_creators_bump,
            creators: vec![mpl_token_metadata::state::Creator {
                address: primary_royalties_receiver.pubkey(),
                verified: false,
                share: 100,
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
            &[&context.payer, &selling_resource_owner_keypair],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await.unwrap();

        // Buy
        let accounts = mpl_fixed_price_sale_accounts::Buy {
            market: market_keypair.pubkey(),
            selling_resource: selling_resource_keypair.pubkey(),
            user_token_account: context.payer.pubkey(),
            user_wallet: context.payer.pubkey(),
            trade_history,
            treasury_holder,
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

        // Withdraw
        let (payout_ticket, payout_ticket_bump) = find_payout_ticket_address(
            &market_keypair.pubkey(),
            &primary_royalties_receiver.pubkey(),
        );

        let (metadata, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
            ],
            &mpl_token_metadata::id(),
        );

        let mut accounts = mpl_fixed_price_sale_accounts::Withdraw {
            market: market_keypair.pubkey(),
            selling_resource: selling_resource_keypair.pubkey(),
            metadata,
            treasury_holder,
            treasury_mint,
            owner: treasury_owner,
            destination: primary_royalties_receiver.pubkey(),
            funder: primary_royalties_receiver.pubkey(),
            payer: payer_pubkey,
            payout_ticket,
            rent: sysvar::rent::id(),
            clock: sysvar::clock::id(),
            token_program: spl_token::id(),
            associated_token_program: spl_associated_token_account::id(),
            system_program: system_program::id(),
        }
        .to_account_metas(None);
        accounts.push(AccountMeta::new(primary_metadata_creators, false));

        let data = mpl_fixed_price_sale_instruction::Withdraw {
            payout_ticket_bump,
            treasury_owner_bump: treasyry_owner_bump,
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

        // ClaimResource
        let claim_token = Keypair::new();
        create_token_account(
            &mut context,
            &claim_token,
            &selling_resource.resource,
            &admin_wallet.pubkey(),
        )
        .await;

        let accounts = mpl_fixed_price_sale_accounts::ClaimResource {
            market: market_keypair.pubkey(),
            treasury_holder,
            selling_resource: selling_resource_keypair.pubkey(),
            selling_resource_owner: selling_resource_owner_keypair.pubkey(),
            vault: selling_resource.vault,
            metadata,
            owner,
            destination: claim_token.pubkey(),
            clock: sysvar::clock::id(),
            token_program: spl_token::id(),
            token_metadata_program: mpl_token_metadata::id(),
            system_program: system_program::id(),
        }
        .to_account_metas(None);

        let data = mpl_fixed_price_sale_instruction::ClaimResource { vault_owner_bump }.data();

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
    }

    #[tokio::test]
    async fn fail_invalid_treasury_amount() {
        setup_context!(context, mpl_fixed_price_sale, mpl_token_metadata);
        let (admin_wallet, store_keypair) = setup_store(&mut context).await;

        let (selling_resource_keypair, selling_resource_owner_keypair, vault) =
            setup_selling_resource(
                &mut context,
                &admin_wallet,
                &store_keypair,
                100,
                None,
                true,
                true,
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

        let (primary_metadata_creators, primary_metadata_creators_bump) =
            find_primary_metadata_creators(&master_edition_metadata);

        // SavePrimaryMetadataCreators
        let accounts = mpl_fixed_price_sale_accounts::SavePrimaryMetadataCreators {
            admin: selling_resource_owner_keypair.pubkey(),
            metadata: master_edition_metadata,
            primary_metadata_creators,
            system_program: system_program::id(),
        }
        .to_account_metas(None);

        let data = mpl_fixed_price_sale_instruction::SavePrimaryMetadataCreators {
            primary_metadata_creators_bump: primary_metadata_creators_bump,
            creators: vec![mpl_token_metadata::state::Creator {
                address: context.payer.pubkey(),
                verified: false,
                share: 100,
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

        context.banks_client.process_transaction(tx).await.unwrap();

        let clock = context.banks_client.get_sysvar::<Clock>().await.unwrap();
        context.warp_to_slot(clock.slot + 3).unwrap();

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

        let (metadata, _) = Pubkey::find_program_address(
            &[
                mpl_token_metadata::state::PREFIX.as_bytes(),
                mpl_token_metadata::id().as_ref(),
                selling_resource.resource.as_ref(),
            ],
            &mpl_token_metadata::id(),
        );

        // ClaimResource
        let claim_token = Keypair::new();
        create_token_account(
            &mut context,
            &claim_token,
            &selling_resource.resource,
            &admin_wallet.pubkey(),
        )
        .await;

        let accounts = mpl_fixed_price_sale_accounts::ClaimResource {
            market: market_keypair.pubkey(),
            treasury_holder: treasury_holder_keypair.pubkey(),
            selling_resource: selling_resource_keypair.pubkey(),
            selling_resource_owner: selling_resource_owner_keypair.pubkey(),
            vault: vault.pubkey(),
            metadata,
            owner,
            destination: claim_token.pubkey(),
            clock: sysvar::clock::id(),
            token_program: spl_token::id(),
            token_metadata_program: mpl_token_metadata::id(),
            system_program: system_program::id(),
        }
        .to_account_metas(None);

        let data = mpl_fixed_price_sale_instruction::ClaimResource { vault_owner_bump }.data();

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
