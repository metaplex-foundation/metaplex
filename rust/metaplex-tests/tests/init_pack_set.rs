#![cfg(feature = "test-bpf")]

mod utils;

use metaplex_nft_packs::{
    instruction,
    state::{AccountType, PackSetState},
};
use solana_program_test::*;
use utils::*;

#[tokio::test]
async fn success() {
    let mut context = nft_packs_program_test().start_with_context().await;

    let test_pack_set = TestPackSet::new();
    test_pack_set
        .init(
            &mut context,
            instruction::InitPackSetArgs {
                name: [7; 32],
                total_packs: 5,
                mutable: true,
            },
        )
        .await
        .unwrap();

    let pack_set = test_pack_set.get_data(&mut context).await;

    assert_eq!(pack_set.account_type, AccountType::PackSet);
    assert!(pack_set.mutable);
    assert_eq!(pack_set.pack_state, PackSetState::NotActivated);
    assert_eq!(pack_set.pack_cards, 0);
    assert_eq!(pack_set.pack_vouchers, 0);
}
