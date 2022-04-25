#![cfg(feature = "test-bpf")]
mod utils;



use mpl_token_metadata::state::{UseMethod, Uses};
use mpl_token_metadata::{
    state::{MAX_NAME_LENGTH, MAX_SYMBOL_LENGTH, MAX_URI_LENGTH},
    utils::puffed_out_string,
};

use solana_program_test::*;
use solana_sdk::{
    signature::{Keypair, Signer},
};
use utils::*;
use borsh::{BorshSerialize};
use mpl_token_metadata::state::{UseAuthorityRecord};
use solana_program::borsh::try_from_slice_unchecked;
use solana_sdk::account::{Account, AccountSharedData};
use solana_sdk::transaction::Transaction;
use mpl_token_metadata::pda::{find_program_as_burner_account, find_use_authority_account};
use mpl_token_metadata::state::Key as MetadataKey;
use solana_sdk::account::{ReadableAccount, WritableAccount};
mod bump_seed_migration {
    
    
    
    use super::*;

    #[tokio::test]
    async fn success_migrate_account() {
        let mut context = program_test().start_with_context().await;
        let name = "Test".to_string();
        let symbol = "TST".to_string();
        let uri = "uri".to_string();
        let test_metadata = Metadata::new();
        let _puffed_name = puffed_out_string(&name, MAX_NAME_LENGTH);
        let _puffed_symbol = puffed_out_string(&symbol, MAX_SYMBOL_LENGTH);
        let _puffed_uri = puffed_out_string(&uri, MAX_URI_LENGTH);
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
        let use_authority_account = Keypair::new();
        let (record, record_bump) =
            find_use_authority_account(&test_metadata.mint.pubkey(), &use_authority_account.pubkey());
        let use_record_struct = UseAuthorityRecord {
            key: MetadataKey::UseAuthorityRecord,
            allowed_uses: 10,
            bump: 0
        };
        let mut account = Account {
            lamports: 1113600,
            data: vec![],
            owner: mpl_token_metadata::id(),
            executable: false,
            rent_epoch: 1
        };
        let data_mut = account.data_mut();
        use_record_struct.serialize(data_mut).unwrap();
        data_mut.append(&mut vec![0,0,0,0,0,0,0,0]);
        let shared_data = &AccountSharedData::from(account);
        context.set_account(&record, shared_data);
        airdrop(&mut context, &use_authority_account.pubkey(), 1113600).await.unwrap();
        let (burner, _) = find_program_as_burner_account();
        let utilize_with_use_authority = mpl_token_metadata::instruction::utilize(
            mpl_token_metadata::id(),
            test_metadata.pubkey.clone(),
            test_metadata.token.pubkey(),
            test_metadata.mint.pubkey(),
            Some(record),
            use_authority_account.pubkey(),
            context.payer.pubkey(),
            Some(burner),
            1,
        );

        let tx = Transaction::new_signed_with_payer(
            &[utilize_with_use_authority],
            Some(&use_authority_account.pubkey()),
            &[&use_authority_account],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await.unwrap();
        let account_after = context.banks_client.get_account(record).await.unwrap().unwrap();
        let uar : UseAuthorityRecord = try_from_slice_unchecked(&account_after.data).unwrap();
        assert_eq!(uar.bump, record_bump);
    }
}
