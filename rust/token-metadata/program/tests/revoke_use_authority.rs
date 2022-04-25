#![cfg(feature = "test-bpf")]
mod utils;

use mpl_token_metadata::state::{UseAuthorityRecord, UseMethod, Uses};

use mpl_token_metadata::pda::find_use_authority_account;
use solana_program_test::*;
use solana_sdk::{
    signature::{Keypair, Signer},
    transaction::Transaction,
};
use utils::*;
mod revoke_use_authority {
    use mpl_token_metadata::pda::find_program_as_burner_account;
    use solana_program::{borsh::try_from_slice_unchecked};
    

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

        let approve_ix = mpl_token_metadata::instruction::approve_use_authority(
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

        let approve_tx = Transaction::new_signed_with_payer(
            &[approve_ix],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );

        context
            .banks_client
            .process_transaction(approve_tx)
            .await
            .unwrap();

        let account = get_account(&mut context, &record).await;
        let record_acct: UseAuthorityRecord = try_from_slice_unchecked(&account.data).unwrap();

        assert_eq!(record_acct.allowed_uses, 1);

        let revoke_ix = mpl_token_metadata::instruction::revoke_use_authority(
            mpl_token_metadata::id(),
            record,
            use_authority.pubkey(),
            context.payer.pubkey(),
            test_meta.token.pubkey(),
            test_meta.pubkey,
            test_meta.mint.pubkey(),
        );

        let revoke_tx = Transaction::new_signed_with_payer(
            &[revoke_ix],
            Some(&context.payer.pubkey()),
            &[&context.payer],
            context.last_blockhash,
        );

        context
            .banks_client
            .process_transaction(revoke_tx)
            .await
            .unwrap();

        let accountafter = context
            .banks_client
            .get_account(record)
            .await
            .expect("account not found");
        println!("{:?}", accountafter);
        assert_eq!(accountafter.is_none(), true);
    }
}
