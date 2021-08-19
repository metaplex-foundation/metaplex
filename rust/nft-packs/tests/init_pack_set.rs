#![cfg(feature = "test-bpf")]

mod utils;
use metaplex_nft_packs::*;
use solana_program::{program_pack::Pack, pubkey::Pubkey};
use solana_program_test::*;
use solana_sdk::{
    signature::{Keypair, Signer},
    transaction::Transaction,
};
use utils::*;

#[tokio::test]
async fn test_init_pack_set() {
    let mut program_context = program_test().start_with_context().await;

    let rent = program_context.banks_client.get_rent().await.unwrap();

    let authority = Keypair::new();
    let minting_authority = Keypair::new();

    let pack_set_params = state::InitPackSetParams {
        name: [7; 32],
        total_packs: 5,
        mutable: true,
    };

    let pack_set = init_pack_set(
        &mut program_context,
        &authority,
        &minting_authority,
        pack_set_params.clone(),
        &rent,
    )
    .await;

    let pack_set_acc = get_account(&mut program_context, &pack_set).await.unwrap();

    let pack_set_data = state::PackSet::unpack(&pack_set_acc.data).unwrap();

    assert_eq!(pack_set_data.name, pack_set_params.name);
    assert_eq!(pack_set_data.total_packs, pack_set_params.total_packs);
    assert!(pack_set_data.mutable);
    assert_eq!(pack_set_data.authority, authority.pubkey());
    assert_eq!(pack_set_data.minting_authority, minting_authority.pubkey());
    assert_eq!(pack_set_data.pack_state, state::PackSetState::NotActivated);
    assert_eq!(pack_set_data.pack_cards, 0);
    assert_eq!(pack_set_data.pack_vouchers, 0);
}
