#![cfg(feature = "test-bpf")]
use metaplex::state::{CONFIG, PREFIX, Store, StoreConfig, Key};
use metaplex::{instruction, id};
use metaplex::error::MetaplexError;
use num_traits::FromPrimitive;
use solana_program::{config, pubkey::Pubkey};
use solana_program_test::*;
use solana_sdk::signature::Signer;
use solana_program::borsh::try_from_slice_unchecked;
use solana_sdk::{
    instruction::InstructionError,
    signer::keypair::Keypair,
    transaction::{Transaction, TransactionError},
    transport::TransportError,
};


#[macro_export]
macro_rules! assert_custom_error {
    ($error:expr, $matcher:pat) => {
        match $error {
            TransportError::TransactionError(TransactionError::InstructionError(
                0,
                InstructionError::Custom(x),
            )) => match FromPrimitive::from_i32(x as i32) {
                Some($matcher) => assert!(true),
                _ => assert!(false),
            },
            _ => assert!(false),
        };
    };
}

mod create_store {
    use metaplex::state::StoreConfig;

    use super::*;

    pub fn program_test<'a>() -> ProgramTest {
        ProgramTest::new("metaplex", metaplex::id(), None)
    }

    #[tokio::test]
    async fn set_store_success() {
        let mut context = program_test().start_with_context().await;
        let payer_key = context.payer.pubkey();
        let mid = id();
        let store_seeds = &[
            PREFIX.as_bytes(),
            mid.as_ref(),
            payer_key.as_ref(),
        ];
        let (store_key, _) = Pubkey::find_program_address(store_seeds, &mid);
        let config_seeds = &[
            PREFIX.as_bytes(),
            mid.as_ref(),
            CONFIG.as_bytes(),
            store_key.as_ref(),
        ];
        let (config_key, _) = Pubkey::find_program_address(config_seeds, &mid);
        let tx = Transaction::new_signed_with_payer(
            &[instruction::create_set_store_v2_instruction(
                mid,
                store_key,
                config_key,
                payer_key,
                payer_key,
                true,
                Some("https://notgoogle.com".to_string()),
            )],
            Some(&payer_key),
            &[&context.payer],
            context.last_blockhash,
        );
        context.banks_client.process_transaction(tx).await;
        let store = context.banks_client.get_account(store_key).await.unwrap().unwrap();
        let store_data: Store = try_from_slice_unchecked(&store.data).unwrap();
        let config = context.banks_client.get_account(config_key).await.unwrap().unwrap();
        let config_data: StoreConfig = try_from_slice_unchecked(&config.data).unwrap();
       
        assert_eq!(store_data.key, Key::StoreV1);
        assert_eq!(config_data.key, Key::StoreConfigV1);
        assert_eq!(config_data.settings_uri, Some("https://notgoogle.com".to_string()));
    }

    #[tokio::test]
    async fn set_store_failure() {
        let mut context = program_test().start_with_context().await;
        let payer_key = context.payer.pubkey();
        let hack_payer = Keypair::new();
        let hack_payer_pub = hack_payer.pubkey();
        let mid = id();
        let store_seeds = &[
            PREFIX.as_bytes(),
            mid.as_ref(),
            payer_key.as_ref(),
        ];
        let hack_store_seeds = &[
            PREFIX.as_bytes(),
            mid.as_ref(),
            hack_payer_pub.as_ref(),
        ];
        let (store_key, _) = Pubkey::find_program_address(store_seeds, &mid);
        let (hack_store_key, _) = Pubkey::find_program_address(hack_store_seeds, &mid);
        let config_seeds = &[
            PREFIX.as_bytes(),
            mid.as_ref(),
            CONFIG.as_bytes(),
            hack_store_key.as_ref(),
        ];
        let (config_key, _) = Pubkey::find_program_address(config_seeds, &mid);
        let tx = Transaction::new_signed_with_payer(
            &[instruction::create_set_store_v2_instruction(
                mid,
                store_key,
                config_key,
                payer_key,
                payer_key,
                true,
                Some("https://notgoogle.com".to_string()),
            )],
            Some(&payer_key),
            &[&context.payer],
            context.last_blockhash,
        );
        let result = context.banks_client.process_transaction(tx).await.unwrap_err();       
        assert_custom_error!(result, MetaplexError::DerivedKeyInvalid);
    }
}
