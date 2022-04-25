#![cfg(feature = "test-bpf")]


use solana_program_test::*;
use solana_sdk::{
    signature::{Keypair, Signer},
};





use utils::*;

mod utils;

mod sign_metadata {
    
    use solana_sdk::transaction::Transaction;

    use mpl_token_metadata::instruction::{remove_creator_verification, sign_metadata};
    use mpl_token_metadata::state::{Creator};

    use super::*;

    #[tokio::test]
    async fn success_verify_unverify_creator() {
        let mut context = program_test().start_with_context().await;
        let creator = Keypair::new();
        let ua_creator = context.payer.pubkey().clone();
        let test_meta = Metadata::new();
        test_meta
            .create_v2(
                &mut context,
                "Test".to_string(),
                "TST".to_string(),
                "uri".to_string(),
                Some(vec![
                    Creator {
                        address: ua_creator,
                        verified: true,
                        share: 0,
                    },
                    Creator {
                        address: creator.pubkey(),
                        verified: false,
                        share: 100,
                    }
                ]),
                10,
                false,
                None,
                None,
                None,
            )
            .await
            .unwrap();
        let sign_ix = sign_metadata(
            mpl_token_metadata::id(),
            test_meta.pubkey,
            creator.pubkey()
        );
        let sign_tx = Transaction::new_signed_with_payer(
            &[
                sign_ix
            ],
            Some(&context.payer.pubkey()),
            &[&creator, &context.payer],
            context.last_blockhash);
        context.banks_client.process_transaction(sign_tx).await.unwrap();
        let after_sign = test_meta.get_data(&mut context).await;
        assert_eq!(after_sign.data.creators.unwrap()[1].verified, true);

        let remove_ix = remove_creator_verification(
            mpl_token_metadata::id(),
            test_meta.pubkey,
            creator.pubkey()
        );
        let remove_tx = Transaction::new_signed_with_payer(
            &[
                remove_ix
            ],
            Some(&context.payer.pubkey()),
            &[&creator, &context.payer],
            context.last_blockhash);
        context.banks_client.process_transaction(remove_tx).await.unwrap();
        let after_remove = test_meta.get_data(&mut context).await;
        assert_eq!(after_remove.data.creators.unwrap()[1].verified, false);
    }
}
