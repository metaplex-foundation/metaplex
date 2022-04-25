#![cfg(feature = "test-bpf")]
mod utils;

use mpl_token_metadata::state::{UseMethod, Uses};
use num_traits::FromPrimitive;
use solana_program_test::*;
use solana_sdk::{
    instruction::InstructionError, signature::Signer, transaction::Transaction,
    transaction::TransactionError, transport::TransportError,
};

use utils::*;

mod uses {
    use mpl_token_metadata::{
        error::MetadataError,
        pda::{find_program_as_burner_account, find_use_authority_account},
        state::{Key, UseAuthorityRecord},
    };
    use solana_program::{borsh::try_from_slice_unchecked, program_pack::Pack};
    use solana_sdk::signature::Keypair;
    use spl_token::state::Account;

    use super::*;

    #[tokio::test]
    async fn single_use_wrong_user_fail() {
        let mut context = program_test().start_with_context().await;
        let test_metadata = Metadata::new();
        let fake_user = Keypair::new();
        airdrop(&mut context, &fake_user.pubkey(), 10000000)
            .await
            .unwrap();
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
                Some(Uses {
                    use_method: UseMethod::Single,
                    total: 1,
                    remaining: 1,
                }),
            )
            .await
            .unwrap();

        let ix = mpl_token_metadata::instruction::utilize(
            mpl_token_metadata::id(),
            test_metadata.pubkey.clone(),
            test_metadata.token.pubkey(),
            test_metadata.mint.pubkey(),
            None,
            fake_user.pubkey(),
            context.payer.pubkey(),
            None,
            1,
        );
        println!("{:?} {:?}", &context.payer, &test_metadata.token);

        let tx = Transaction::new_signed_with_payer(
            &[ix],
            Some(&fake_user.pubkey()),
            &[&fake_user],
            context.last_blockhash,
        );

        let err = context.banks_client.process_transaction(tx).await.unwrap_err();
        assert_custom_error!(err, MetadataError::InvalidUser);
        let metadata = test_metadata.get_data(&mut context).await;
        let metadata_uses = metadata.uses.unwrap();
        let total_uses = metadata_uses.total;
        let remaining_uses = metadata_uses.remaining;

        // Confirm we consumed a use and decremented from 1 -> 0
        assert_eq!(remaining_uses, 1);
        assert_eq!(total_uses, 1);
    }

    #[tokio::test]
    async fn single_use_success() {
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
                Some(Uses {
                    use_method: UseMethod::Single,
                    total: 1,
                    remaining: 1,
                }),
            )
            .await
            .unwrap();

        let ix = mpl_token_metadata::instruction::utilize(
            mpl_token_metadata::id(),
            test_metadata.pubkey.clone(),
            test_metadata.token.pubkey(),
            test_metadata.mint.pubkey(),
            None,
            context.payer.pubkey(),
            context.payer.pubkey(),
            None,
            1,
        );
        println!("{:?} {:?}", &context.payer, &test_metadata.token);

        let tx = Transaction::new_signed_with_payer(
            &[ix],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await.unwrap();

        let metadata = test_metadata.get_data(&mut context).await;
        let metadata_uses = metadata.uses.unwrap();
        let total_uses = metadata_uses.total;
        let remaining_uses = metadata_uses.remaining;

        // Confirm we consumed a use and decremented from 1 -> 0
        assert_eq!(remaining_uses, 0);
        assert_eq!(total_uses, 1);
    }

    #[tokio::test]
    async fn single_use_fail() {
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
                Some(Uses {
                    use_method: UseMethod::Single,
                    total: 1,
                    remaining: 1,
                }),
            )
            .await
            .unwrap();

        let ix = mpl_token_metadata::instruction::utilize(
            mpl_token_metadata::id(),
            test_metadata.pubkey.clone(),
            test_metadata.token.pubkey(),
            test_metadata.mint.pubkey(),
            None,
            context.payer.pubkey(),
            context.payer.pubkey(),
            None,
            2,
        );

        let tx_error = Transaction::new_signed_with_payer(
            &[ix],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );

        let err = context
            .banks_client
            .process_transaction(tx_error.clone())
            .await
            .unwrap_err();

        assert_custom_error!(err, MetadataError::NotEnoughUses);
    }

    #[tokio::test]
    async fn multi_use_delegated_success() {
        let mut context = program_test().start_with_context().await;
        let use_authority = Keypair::new();
        airdrop(&mut context, &use_authority.pubkey(), 10000000)
            .await
            .unwrap();

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
                Some(Uses {
                    use_method: UseMethod::Multiple,
                    total: 5,
                    remaining: 5,
                }),
            )
            .await
            .unwrap();

        let (record, _) =
            find_use_authority_account(&test_metadata.mint.pubkey(), &use_authority.pubkey());
        let (burner, _) = find_program_as_burner_account();

        let add_use_authority = mpl_token_metadata::instruction::approve_use_authority(
            mpl_token_metadata::id(),
            record,
            use_authority.pubkey(),
            context.payer.pubkey(),
            context.payer.pubkey(),
            test_metadata.token.pubkey(),
            test_metadata.pubkey,
            test_metadata.mint.pubkey(),
            burner,
            1,
        );

        let tx_add_authority = Transaction::new_signed_with_payer(
            &[add_use_authority],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );

        context
            .banks_client
            .process_transaction(tx_add_authority)
            .await
            .unwrap();

        let utilize_with_use_authority = mpl_token_metadata::instruction::utilize(
            mpl_token_metadata::id(),
            test_metadata.pubkey.clone(),
            test_metadata.token.pubkey(),
            test_metadata.mint.pubkey(),
            Some(record),
            use_authority.pubkey(),
            context.payer.pubkey(),
            Some(burner),
            1,
        );

        let tx = Transaction::new_signed_with_payer(
            &[utilize_with_use_authority],
            Some(&use_authority.pubkey()),
            &[&use_authority],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await.unwrap();

        let metadata = test_metadata.get_data(&mut context).await;
        let metadata_uses = metadata.uses.unwrap();
        let remaining_uses = metadata_uses.remaining;

        assert_eq!(remaining_uses, 4);
    }

    #[tokio::test]
    async fn multi_use_revoke_delegate_fail() {
        let mut context = program_test().start_with_context().await;
        let use_authority = Keypair::new();
        airdrop(&mut context, &use_authority.pubkey(), 10000000)
            .await
            .unwrap();
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
                Some(Uses {
                    use_method: UseMethod::Multiple,
                    total: 5,
                    remaining: 5,
                }),
            )
            .await
            .unwrap();

        let (record, _) =
            find_use_authority_account(&test_metadata.mint.pubkey(), &use_authority.pubkey());
        let (burner, _) = find_program_as_burner_account();

        let add_use_authority = mpl_token_metadata::instruction::approve_use_authority(
            mpl_token_metadata::id(),
            record,
            use_authority.pubkey(),
            context.payer.pubkey(),
            context.payer.pubkey(),
            test_metadata.token.pubkey(),
            test_metadata.pubkey,
            test_metadata.mint.pubkey(),
            burner,
            1,
        );

        let tx_add_authority = Transaction::new_signed_with_payer(
            &[add_use_authority],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );

        context
            .banks_client
            .process_transaction(tx_add_authority)
            .await
            .unwrap();

        let utilize_with_use_authority = mpl_token_metadata::instruction::utilize(
            mpl_token_metadata::id(),
            test_metadata.pubkey.clone(),
            test_metadata.token.pubkey(),
            test_metadata.mint.pubkey(),
            Some(record),
            use_authority.pubkey(),
            context.payer.pubkey(),
            Some(burner),
            1,
        );

        let tx_utilize_with_use_authority = Transaction::new_signed_with_payer(
            &[utilize_with_use_authority],
            Some(&use_authority.pubkey()),
            &[&use_authority],
            context.last_blockhash,
        );

        context
            .banks_client
            .process_transaction(tx_utilize_with_use_authority.clone())
            .await
            .unwrap();

        let revoke_use_authority = mpl_token_metadata::instruction::revoke_use_authority(
            mpl_token_metadata::id(),
            record,
            use_authority.pubkey(),
            context.payer.pubkey(),
            test_metadata.token.pubkey(),
            test_metadata.pubkey,
            test_metadata.mint.pubkey(),
        );

        let tx_revoke_use_authority = Transaction::new_signed_with_payer(
            &[revoke_use_authority],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );

        context
            .banks_client
            .process_transaction(tx_revoke_use_authority.clone())
            .await
            .unwrap();

        context.warp_to_slot(100).unwrap();
        let utilize_with_use_authority_fail = mpl_token_metadata::instruction::utilize(
            mpl_token_metadata::id(),
            test_metadata.pubkey.clone(),
            test_metadata.token.pubkey(),
            test_metadata.mint.pubkey(),
            Some(record),
            use_authority.pubkey(),
            context.payer.pubkey(),
            Some(burner),
            1,
        );

        let tx_error = Transaction::new_signed_with_payer(
            &[utilize_with_use_authority_fail],
            Some(&use_authority.pubkey()),
            &[&use_authority],
            context.last_blockhash,
        );

        let err = context
            .banks_client
            .process_transaction(tx_error.clone())
            .await
            .unwrap_err();

        assert_custom_error!(err, MetadataError::UseAuthorityRecordAlreadyRevoked);
    }

    #[tokio::test]
    async fn success_delegated_and_burn() {
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
        airdrop(&mut context, &use_authority.pubkey(), 10_000_000_000)
            .await
            .unwrap();

        airdrop(&mut context, &test_meta.token.pubkey(), 10_000_000_000)
            .await
            .unwrap();
        let (record, _) =
            find_use_authority_account(&test_meta.mint.pubkey(), &use_authority.pubkey());
        let (burner, _) = find_program_as_burner_account();
        let approveix = mpl_token_metadata::instruction::approve_use_authority(
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
        let approvetx = Transaction::new_signed_with_payer(
            &[approveix],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );
        context
            .banks_client
            .process_transaction(approvetx)
            .await
            .unwrap();
        let account = get_account(&mut context, &record).await;
        let record_acct: UseAuthorityRecord = try_from_slice_unchecked(&account.data).unwrap();
        assert_eq!(record_acct.key, Key::UseAuthorityRecord);
        assert_eq!(record_acct.allowed_uses, 1);

        let utilize_ix = mpl_token_metadata::instruction::utilize(
            mpl_token_metadata::id(),
            test_meta.pubkey,
            test_meta.token.pubkey(),
            test_meta.mint.pubkey(),
            Some(record),
            use_authority.pubkey(),
            context.payer.pubkey(),
            Some(burner),
            1,
        );
        let utilize = Transaction::new_signed_with_payer(
            &[utilize_ix],
            Some(&use_authority.pubkey()),
            &[&use_authority],
            context.last_blockhash,
        );

        context
            .banks_client
            .process_transaction(utilize)
            .await
            .unwrap();
        let token_account_after_burn = get_account(&mut context, &test_meta.token.pubkey()).await;
        let token_account_after_burn_data: Account =
            Account::unpack_from_slice(token_account_after_burn.data.as_slice()).unwrap();
        assert_eq!(token_account_after_burn_data.amount, 0);
    }

    #[tokio::test]
    async fn success_and_burn() {
        let mut context = program_test().start_with_context().await;

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

        airdrop(&mut context, &test_meta.token.pubkey(), 10_000_000_000)
            .await
            .unwrap();

        let utilize_ix = mpl_token_metadata::instruction::utilize(
            mpl_token_metadata::id(),
            test_meta.pubkey,
            test_meta.token.pubkey(),
            test_meta.mint.pubkey(),
            None,
            context.payer.pubkey(),
            context.payer.pubkey(),
            None,
            1,
        );
        let utilize = Transaction::new_signed_with_payer(
            &[utilize_ix],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );

        context
            .banks_client
            .process_transaction(utilize)
            .await
            .unwrap();
        let token_account_after_burn = get_account(&mut context, &test_meta.token.pubkey()).await;
        let token_account_after_burn_data: Account =
            Account::unpack_from_slice(token_account_after_burn.data.as_slice()).unwrap();
        assert_eq!(token_account_after_burn_data.amount, 0);
    }
}
