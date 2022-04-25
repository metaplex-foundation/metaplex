#![cfg(feature = "test-bpf")]
mod utils;

use mpl_token_metadata::{
    error::MetadataError,
    id, instruction,
    state::{Creator, Key, UseMethod, Uses, MAX_NAME_LENGTH, MAX_SYMBOL_LENGTH, MAX_URI_LENGTH},
    utils::puffed_out_string,
};
use num_traits::FromPrimitive;
use solana_program::pubkey::Pubkey;
use solana_program_test::*;
use solana_sdk::{
    instruction::InstructionError,
    signature::{Keypair, Signer},
    transaction::{Transaction, TransactionError},
    transport::TransportError,
};
use utils::*;

mod create_meta_accounts {

    use super::*;
    #[tokio::test]
    async fn success() {
        let mut context = program_test().start_with_context().await;
        let test_metadata = Metadata::new();
        let name = "Test".to_string();
        let symbol = "TST".to_string();
        let uri = "uri".to_string();

        let puffed_name = puffed_out_string(&name, MAX_NAME_LENGTH);
        let puffed_symbol = puffed_out_string(&symbol, MAX_SYMBOL_LENGTH);
        let puffed_uri = puffed_out_string(&uri, MAX_URI_LENGTH);

        test_metadata
            .create(&mut context, name, symbol, uri, None, 10, false)
            .await
            .unwrap();

        let metadata = test_metadata.get_data(&mut context).await;

        assert_eq!(metadata.data.name, puffed_name,);
        assert_eq!(metadata.data.symbol, puffed_symbol);
        assert_eq!(metadata.data.uri, puffed_uri);
        assert_eq!(metadata.data.seller_fee_basis_points, 10);
        assert_eq!(metadata.data.creators, None);

        assert_eq!(metadata.primary_sale_happened, false);
        assert_eq!(metadata.is_mutable, false);
        assert_eq!(metadata.mint, test_metadata.mint.pubkey());
        assert_eq!(metadata.update_authority, context.payer.pubkey());
        assert_eq!(metadata.key, Key::MetadataV1);

        assert_eq!(metadata.token_standard, None);
        assert_eq!(metadata.collection, None);
        assert_eq!(metadata.uses, None);
    }

    #[tokio::test]
    async fn success_v2() {
        let mut context = program_test().start_with_context().await;
        let test_metadata = Metadata::new();
        let name = "Test".to_string();
        let symbol = "TST".to_string();
        let uri = "uri".to_string();

        let puffed_name = puffed_out_string(&name, MAX_NAME_LENGTH);
        let puffed_symbol = puffed_out_string(&symbol, MAX_SYMBOL_LENGTH);
        let puffed_uri = puffed_out_string(&uri, MAX_URI_LENGTH);

        let uses = Some(Uses {
            total: 1,
            remaining: 1,
            use_method: UseMethod::Single,
        });
        test_metadata
            .create_v2(
                &mut context,
                name,
                symbol,
                uri,
                None,
                10,
                false,
                None,
                None,
                uses.to_owned(),
            )
            .await
            .unwrap();

        let metadata = test_metadata.get_data(&mut context).await;

        assert_eq!(metadata.data.name, puffed_name);
        assert_eq!(metadata.data.symbol, puffed_symbol);
        assert_eq!(metadata.data.uri, puffed_uri);
        assert_eq!(metadata.data.seller_fee_basis_points, 10);
        assert_eq!(metadata.data.creators, None);
        assert_eq!(metadata.uses, uses.to_owned());

        assert_eq!(metadata.primary_sale_happened, false);
        assert_eq!(metadata.is_mutable, false);
        assert_eq!(metadata.mint, test_metadata.mint.pubkey());
        assert_eq!(metadata.update_authority, context.payer.pubkey());
        assert_eq!(metadata.key, Key::MetadataV1);
    }

    #[tokio::test]
    async fn fail_invalid_mint_authority() {
        let mut context = program_test().start_with_context().await;
        let test_metadata = Metadata::new();
        let fake_mint_authority = Keypair::new();
        let payer_pubkey = context.payer.pubkey();

        create_mint(&mut context, &test_metadata.mint, &payer_pubkey, None)
            .await
            .unwrap();
        create_token_account(
            &mut context,
            &test_metadata.token,
            &test_metadata.mint.pubkey(),
            &payer_pubkey,
        )
        .await
        .unwrap();
        mint_tokens(
            &mut context,
            &test_metadata.mint.pubkey(),
            &test_metadata.token.pubkey(),
            1,
            &payer_pubkey,
            None,
        )
        .await
        .unwrap();

        let ix = instruction::create_metadata_accounts(
            id(),
            test_metadata.pubkey.clone(),
            test_metadata.mint.pubkey(),
            fake_mint_authority.pubkey(),
            context.payer.pubkey().clone(),
            context.payer.pubkey().clone(),
            "Test".to_string(),
            "TST".to_string(),
            "uri".to_string(),
            None,
            10,
            false,
            false,
        );

        let tx = Transaction::new_signed_with_payer(
            &[ix],
            Some(&context.payer.pubkey()),
            &[&context.payer, &fake_mint_authority],
            context.last_blockhash,
        );

        let result = context
            .banks_client
            .process_transaction(tx)
            .await
            .unwrap_err();

        assert_custom_error!(result, MetadataError::InvalidMintAuthority);

        let ix2 = instruction::create_metadata_accounts_v2(
            id(),
            test_metadata.pubkey.clone(),
            test_metadata.mint.pubkey(),
            fake_mint_authority.pubkey(),
            context.payer.pubkey().clone(),
            context.payer.pubkey().clone(),
            "Test".to_string(),
            "TST".to_string(),
            "uri".to_string(),
            None,
            10,
            false,
            false,
            None,
            Some(Uses {
                remaining: 10,
                total: 10,
                use_method: UseMethod::Multiple,
            }),
        );

        let tx2 = Transaction::new_signed_with_payer(
            &[ix2],
            Some(&context.payer.pubkey()),
            &[&context.payer, &fake_mint_authority],
            context.last_blockhash,
        );

        let result2 = context
            .banks_client
            .process_transaction(tx2)
            .await
            .unwrap_err();

        assert_custom_error!(result2, MetadataError::InvalidMintAuthority);
    }

    #[tokio::test]
    async fn fail_invalid_metadata_pda() {
        let mut context = program_test().start_with_context().await;
        let mut test_metadata = Metadata::new();
        test_metadata.pubkey = Pubkey::new_unique();

        let result = test_metadata
            .create(
                &mut context,
                "Test".to_string(),
                "TST".to_string(),
                "uri".to_string(),
                None,
                10,
                false,
            )
            .await
            .unwrap_err();

        assert_custom_error!(result, MetadataError::InvalidMetadataKey);
    }

    // -----------------
    // Creators Failures
    // -----------------
    async fn fail_creators(
        mut context: ProgramTestContext,
        creators: Vec<Creator>,
    ) -> TransportError {
        Metadata::new()
            .create_v2(
                &mut context,
                "Test".to_string(),
                "TST".to_string(),
                "uri".to_string(),
                Some(creators),
                10,
                false,
                None,
                None,
                None,
            )
            .await
            .unwrap_err()
    }

    #[tokio::test]
    async fn fail_six_unverified_creators() {
        let context = program_test().start_with_context().await;
        let mut creators = vec![
            Keypair::new(),
            Keypair::new(),
            Keypair::new(),
            Keypair::new(),
            Keypair::new(),
        ]
        .into_iter()
        .map(|creator| Creator {
            address: creator.pubkey(),
            share: 1,
            verified: false,
        })
        .collect::<Vec<Creator>>();
        creators.push(Creator {
            address: context.payer.pubkey(),
            share: 1,
            verified: false,
        });

        let res = fail_creators(context, creators).await;
        assert_custom_error!(res, MetadataError::CreatorsTooLong);
    }

    #[tokio::test]
    async fn fail_four_unverified_creators_one_duplicate() {
        let context = program_test().start_with_context().await;
        let (creator1, creator2) = (Keypair::new(), Keypair::new());
        let mut creators = vec![&creator1, &creator2, &creator1]
            .into_iter()
            .map(|creator| Creator {
                address: creator.pubkey(),
                share: 1,
                verified: false,
            })
            .collect::<Vec<Creator>>();
        creators.push(Creator {
            address: context.payer.pubkey(),
            share: 1,
            verified: false,
        });

        let res = fail_creators(context, creators).await;
        assert_custom_error!(res, MetadataError::DuplicateCreatorAddress);
    }

    #[tokio::test]
    async fn fail_empty_creators() {
        let context = program_test().start_with_context().await;
        let creators: Vec<Creator> = vec![];

        let res = fail_creators(context, creators).await;
        assert_custom_error!(res, MetadataError::CreatorsMustBeAtleastOne);
    }

    #[tokio::test]
    async fn fail_three_unverified_creators_300_total_shares() {
        let context = program_test().start_with_context().await;
        let (creator1, creator2) = (Keypair::new(), Keypair::new());
        let creators = vec![&creator1, &creator2, &context.payer]
            .into_iter()
            .map(|creator| Creator {
                address: creator.pubkey(),
                share: 100,
                verified: false,
            })
            .collect::<Vec<Creator>>();

        let res = fail_creators(context, creators).await;
        assert_custom_error!(res, MetadataError::NumericalOverflowError);
    }

    #[tokio::test]
    async fn fail_three_unverified_creators_102() {
        let context = program_test().start_with_context().await;
        let (creator1, creator2) = (Keypair::new(), Keypair::new());
        let creators = vec![&creator1, &creator2, &context.payer]
            .into_iter()
            .map(|creator| Creator {
                address: creator.pubkey(),
                share: 34,
                verified: false,
            })
            .collect::<Vec<Creator>>();

        let res = fail_creators(context, creators).await;
        assert_custom_error!(res, MetadataError::ShareTotalMustBe100);
    }

    #[tokio::test]
    async fn fail_two_one_non_payer_verified() {
        let context = program_test().start_with_context().await;
        let creator1 = Keypair::new();
        let creators = vec![&creator1, &context.payer]
            .into_iter()
            .map(|creator| Creator {
                address: creator.pubkey(),
                share: 50,
                verified: creator.eq(&creator1),
            })
            .collect::<Vec<Creator>>();

        let res = fail_creators(context, creators).await;
        assert_custom_error!(res, MetadataError::CannotVerifyAnotherCreator);
    }

    // -----------------
    // Creators Success
    // -----------------
    async fn pass_creators(mut context: ProgramTestContext, creators: Vec<Creator>) {
        let test_metadata = Metadata::new();
        test_metadata
            .create_v2(
                &mut context,
                "Test".to_string(),
                "TST".to_string(),
                "uri".to_string(),
                Some(creators.clone()),
                10,
                false,
                None,
                None,
                None,
            )
            .await
            .unwrap();
        let metadata = test_metadata.get_data(&mut context).await;
        assert_eq!(metadata.data.creators, Some(creators));
    }

    #[tokio::test]
    async fn three_unverified_creators_100_total_shares() {
        let context = program_test().start_with_context().await;
        let (creator1, creator2) = (Keypair::new(), Keypair::new());
        let mut creators = vec![&creator1, &creator2]
            .into_iter()
            .map(|creator| Creator {
                address: creator.pubkey(),
                share: 49,
                verified: false,
            })
            .collect::<Vec<Creator>>();
        creators.push(Creator {
            address: context.payer.pubkey(),
            share: 2,
            verified: false,
        });

        pass_creators(context, creators).await;
    }

    #[tokio::test]
    async fn two_unverified_creators_payer_verified() {
        let context = program_test().start_with_context().await;
        let (creator1, creator2) = (Keypair::new(), Keypair::new());
        let mut creators = vec![&creator1, &creator2]
            .into_iter()
            .map(|creator| Creator {
                address: creator.pubkey(),
                share: 49,
                verified: false,
            })
            .collect::<Vec<Creator>>();
        creators.push(Creator {
            address: context.payer.pubkey(),
            share: 2,
            verified: true,
        });

        pass_creators(context, creators).await;
    }
    // -----------------
    // Uses Failures
    // -----------------
    async fn fail_uses(uses: Uses) {
        let mut context = program_test().start_with_context().await;
        let res = Metadata::new()
            .create_v2(
                &mut context,
                "Test".to_string(),
                "TST".to_string(),
                "uri".to_string(),
                None,
                10,
                false,
                None,
                None,
                Some(uses),
            )
            .await
            .unwrap_err();
        assert_custom_error!(res, MetadataError::InvalidUseMethod);
    }

    #[tokio::test]
    async fn fail_uses_multiple_0_0() {
        fail_uses(Uses {
            use_method: UseMethod::Multiple,
            remaining: 0,
            total: 0,
        })
        .await;
    }

    #[tokio::test]
    async fn fail_uses_multiple_10_5() {
        fail_uses(Uses {
            use_method: UseMethod::Multiple,
            remaining: 10,
            total: 5,
        })
        .await;
    }

    #[tokio::test]
    async fn fail_uses_single_0_1() {
        fail_uses(Uses {
            use_method: UseMethod::Single,
            remaining: 0,
            total: 1,
        })
        .await;
    }

    #[tokio::test]
    async fn fail_uses_single_1_0() {
        fail_uses(Uses {
            use_method: UseMethod::Single,
            remaining: 1,
            total: 0,
        })
        .await;
    }

    #[tokio::test]
    async fn fail_uses_single_1_2() {
        fail_uses(Uses {
            use_method: UseMethod::Single,
            remaining: 1,
            total: 2,
        })
        .await;
    }

    // -----------------
    // Uses Success
    // -----------------
    async fn pass_uses(uses: Uses) {
        let mut context = program_test().start_with_context().await;
        let test_metadata = Metadata::new();
        test_metadata
            .create_v2(
                &mut context,
                "Test".to_string(),
                "TST".to_string(),
                "uri".to_string(),
                None,
                10,
                false,
                None,
                None,
                Some(uses.clone()),
            )
            .await
            .unwrap();
        let metadata = test_metadata.get_data(&mut context).await;
        assert_eq!(metadata.uses, Some(uses));
    }

    #[tokio::test]
    async fn uses_multiple_5_10() {
        pass_uses(Uses {
            use_method: UseMethod::Multiple,
            remaining: 5,
            total: 10,
        })
        .await;
    }

    #[tokio::test]
    async fn uses_single_1_1() {
        pass_uses(Uses {
            use_method: UseMethod::Single,
            remaining: 1,
            total: 1,
        })
        .await;
    }

    #[tokio::test]
    async fn uses_burn_0_0() {
        pass_uses(Uses {
            use_method: UseMethod::Burn,
            remaining: 0,
            total: 0,
        })
        .await;
    }

    #[tokio::test]
    async fn uses_burn_5_10() {
        pass_uses(Uses {
            use_method: UseMethod::Burn,
            remaining: 5,
            total: 10,
        })
        .await;
    }
}
