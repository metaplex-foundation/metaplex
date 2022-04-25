#![cfg(feature = "test-bpf")]
mod utils;

use mpl_token_metadata::state::{UseAuthorityRecord, UseMethod, Uses};

use mpl_token_metadata::error::MetadataError;
use mpl_token_metadata::pda::find_use_authority_account;
use num_traits::FromPrimitive;
use solana_program_test::*;
use solana_sdk::{
    instruction::InstructionError,
    signature::{Keypair, Signer},
    transaction::{Transaction, TransactionError},
    transport::TransportError,
};
use utils::*;
mod approve_use_authority {

    use mpl_token_metadata::{pda::find_program_as_burner_account, state::Key};
    use solana_program::{borsh::try_from_slice_unchecked, program_pack::Pack};
    use spl_token::state::Account;

    use super::*;
    #[tokio::test]
    async fn success() {
        let mut context = program_test().start_with_context().await;
        let use_authority = Keypair::new();

        let test_meta = Metadata::new();
        test_meta
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
                Some(Uses {
                    use_method: UseMethod::Single,
                    total: 1,
                    remaining: 1,
                }),
            )
            .await
            .unwrap();

        let (record, _) =
            find_use_authority_account(&test_meta.mint.pubkey(), &use_authority.pubkey());
        let (burner, _) = find_program_as_burner_account();

        let ix = mpl_token_metadata::instruction::approve_use_authority(
            mpl_token_metadata::id(),
            record,
            use_authority.pubkey(),
            context.payer.pubkey(),
            context.payer.pubkey(),
            test_meta.token.pubkey(),
            test_meta.pubkey,
            test_meta.mint.pubkey(),
            burner,
            1,
        );

        let tx = Transaction::new_signed_with_payer(
            &[ix],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await.unwrap();

        let account = get_account(&mut context, &record).await;
        let record_acct: UseAuthorityRecord = try_from_slice_unchecked(&account.data).unwrap();

        assert_eq!(record_acct.key, Key::UseAuthorityRecord);
        assert_eq!(record_acct.allowed_uses, 1);
    }

    #[tokio::test]
    async fn success_burn() {
        let mut context = program_test().start_with_context().await;
        let use_authority = Keypair::new();

        let test_meta = Metadata::new();
        test_meta
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
                Some(Uses {
                    use_method: UseMethod::Burn,
                    total: 1,
                    remaining: 1,
                }),
            )
            .await
            .unwrap();

        let (record, _) =
            find_use_authority_account(&test_meta.mint.pubkey(), &use_authority.pubkey());
        let (burner, _) = find_program_as_burner_account();

        let ix = mpl_token_metadata::instruction::approve_use_authority(
            mpl_token_metadata::id(),
            record,
            use_authority.pubkey(),
            context.payer.pubkey(),
            context.payer.pubkey(),
            test_meta.token.pubkey(),
            test_meta.pubkey,
            test_meta.mint.pubkey(),
            burner,
            1,
        );

        let tx = Transaction::new_signed_with_payer(
            &[ix],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await.unwrap();

        let account = get_account(&mut context, &record).await;
        let record_acct: UseAuthorityRecord = try_from_slice_unchecked(&account.data).unwrap();
        assert_eq!(record_acct.key, Key::UseAuthorityRecord);
        assert_eq!(record_acct.allowed_uses, 1);
    }

    #[tokio::test]
    async fn fail_use_must_be_some() {
        let mut context = program_test().start_with_context().await;
        let use_authority = Keypair::new();

        let test_meta = Metadata::new();
        test_meta
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
                None,
            )
            .await
            .unwrap();

        let (record, _) =
            find_use_authority_account(&test_meta.mint.pubkey(), &use_authority.pubkey());
        let (burner, _) = find_program_as_burner_account();

        let thing = context
            .banks_client
            .get_account(test_meta.token.pubkey())
            .await
            .unwrap()
            .unwrap();

        println!("{:?}", Account::unpack_from_slice(&thing.data).unwrap());

        let ix = mpl_token_metadata::instruction::approve_use_authority(
            mpl_token_metadata::id(),
            record,
            use_authority.pubkey(),
            context.payer.pubkey(),
            context.payer.pubkey(),
            test_meta.token.pubkey(),
            test_meta.pubkey,
            test_meta.mint.pubkey(),
            burner,
            1,
        );

        let tx = Transaction::new_signed_with_payer(
            &[ix],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );

        let err = context
            .banks_client
            .process_transaction(tx)
            .await
            .unwrap_err();
        assert_custom_error!(err, MetadataError::Unusable);
    }

    #[tokio::test]
    async fn fail_already_exists() {
        let mut context = program_test().start_with_context().await;
        let use_authority = Keypair::new();

        let test_meta = Metadata::new();
        test_meta
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
                Some(Uses {
                    use_method: UseMethod::Single,
                    total: 1,
                    remaining: 1,
                }),
            )
            .await
            .unwrap();

        let (record, _) =
            find_use_authority_account(&test_meta.mint.pubkey(), &use_authority.pubkey());

        let (burner, _) = find_program_as_burner_account();

        let thing = context
            .banks_client
            .get_account(test_meta.token.pubkey())
            .await
            .unwrap()
            .unwrap();

        println!("{:?}", Account::unpack_from_slice(&thing.data).unwrap());

        let ix = mpl_token_metadata::instruction::approve_use_authority(
            mpl_token_metadata::id(),
            record,
            use_authority.pubkey(),
            context.payer.pubkey(),
            context.payer.pubkey(),
            test_meta.token.pubkey(),
            test_meta.pubkey,
            test_meta.mint.pubkey(),
            burner,
            1,
        );

        let tx = Transaction::new_signed_with_payer(
            &[ix],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );
        context.banks_client.process_transaction(tx).await.unwrap();

        let ix2 = mpl_token_metadata::instruction::approve_use_authority(
            mpl_token_metadata::id(),
            record,
            use_authority.pubkey(),
            context.payer.pubkey(),
            context.payer.pubkey(),
            test_meta.token.pubkey(),
            test_meta.pubkey,
            test_meta.mint.pubkey(),
            burner,
            2,
        );
        let tx2 = Transaction::new_signed_with_payer(
            &[ix2],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );

        let err = context
            .banks_client
            .process_transaction(tx2)
            .await
            .unwrap_err();

        assert_custom_error!(err, MetadataError::UseAuthorityRecordAlreadyExists);
    }

    #[tokio::test]
    async fn fail_pda_does_not_match_user() {
        let mut context = program_test().start_with_context().await;
        let use_authority = Keypair::new();
        let other_user = Keypair::new();

        let test_meta = Metadata::new();
        test_meta
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
                Some(Uses {
                    use_method: UseMethod::Single,
                    total: 1,
                    remaining: 1,
                }),
            )
            .await
            .unwrap();

        let (record, _) =
            find_use_authority_account(&test_meta.mint.pubkey(), &other_user.pubkey());

        let (burner, _) = find_program_as_burner_account();

        let thing = context
            .banks_client
            .get_account(test_meta.token.pubkey())
            .await
            .unwrap()
            .unwrap();

        println!("{:?}", Account::unpack_from_slice(&thing.data).unwrap());

        let ix = mpl_token_metadata::instruction::approve_use_authority(
            mpl_token_metadata::id(),
            record,
            use_authority.pubkey(),
            context.payer.pubkey(),
            context.payer.pubkey(),
            test_meta.token.pubkey(),
            test_meta.pubkey,
            test_meta.mint.pubkey(),
            burner,
            1,
        );

        let tx = Transaction::new_signed_with_payer(
            &[ix],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );

        let err = context
            .banks_client
            .process_transaction(tx)
            .await
            .unwrap_err();
        assert_custom_error!(err, MetadataError::DerivedKeyInvalid);
    }

    #[tokio::test]
    async fn fail_wrong_owner() {
        let mut context = program_test().start_with_context().await;
        let use_authority = Keypair::new();
        let wrong_owner = Keypair::new();

        let test_meta = Metadata::new();
        test_meta
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
                Some(Uses {
                    use_method: UseMethod::Single,
                    total: 1,
                    remaining: 1,
                }),
            )
            .await
            .unwrap();

        let (record, _) =
            find_use_authority_account(&test_meta.mint.pubkey(), &use_authority.pubkey());

        let (burner, _) = find_program_as_burner_account();

        let ix = mpl_token_metadata::instruction::approve_use_authority(
            mpl_token_metadata::id(),
            record,
            use_authority.pubkey(),
            wrong_owner.pubkey(),
            context.payer.pubkey(),
            test_meta.token.pubkey(),
            test_meta.pubkey,
            test_meta.mint.pubkey(),
            burner,
            1,
        );

        let tx = Transaction::new_signed_with_payer(
            &[ix],
            Some(&context.payer.pubkey()),
            &[&context.payer, &wrong_owner],
            context.last_blockhash,
        );

        let err = context
            .banks_client
            .process_transaction(tx)
            .await
            .unwrap_err();

        assert_custom_error!(err, MetadataError::InvalidOwner);
    }
}
