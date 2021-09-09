mod utils;

use metaplex_nft_packs::{
    find_proving_process_program_address,
    instruction::{AddCardToPackArgs, AddVoucherToPackArgs, InitPackSetArgs},
    state::{ActionOnProve, DistributionType, ProvingProcess},
};
use solana_program::{program_pack::Pack, system_instruction};
use solana_program_test::*;
use solana_sdk::{signature::Keypair, signer::Signer, transaction::Transaction};
use utils::*;

async fn create_master_edition(
    context: &mut ProgramTestContext,
    test_pack_set: &TestPackSet,
) -> (TestMetadata, TestMasterEditionV2, User) {
    let test_metadata = TestMetadata::new();
    let test_master_edition = TestMasterEditionV2::new(&test_metadata);

    let user_token_acc = Keypair::new();
    let master_token_holder = User {
        owner: Keypair::new(),
        token_account: user_token_acc.pubkey(),
    };

    test_metadata
        .create(
            context,
            "Test".to_string(),
            "TST".to_string(),
            "uri".to_string(),
            None,
            10,
            false,
            &user_token_acc,
            &test_pack_set.authority.pubkey(),
        )
        .await
        .unwrap();

    test_master_edition.create(context, Some(10)).await.unwrap();

    (test_metadata, test_master_edition, master_token_holder)
}

#[tokio::test]
async fn success() {
    let mut context = nft_packs_program_test().start_with_context().await;

    let test_pack_set = TestPackSet::new();
    test_pack_set
        .init(
            &mut context,
            InitPackSetArgs {
                name: [7; 32],
                total_packs: 1,
                mutable: true,
            },
        )
        .await
        .unwrap();

    let (card_metadata, card_master_edition, card_master_token_holder) =
        create_master_edition(&mut context, &test_pack_set).await;

    let (voucher_metadata, voucher_master_edition, voucher_master_token_holder) =
        create_master_edition(&mut context, &test_pack_set).await;

    let voucher_edition = TestEditionMarker::new(&voucher_metadata, &voucher_master_edition, 1);

    let edition_authority = Keypair::new();

    let tx = Transaction::new_signed_with_payer(
        &[system_instruction::create_account(
            &context.payer.pubkey(),
            &edition_authority.pubkey(),
            100000000000000,
            0,
            &solana_program::system_program::id(),
        )],
        Some(&context.payer.pubkey()),
        &[&context.payer, &edition_authority],
        context.last_blockhash,
    );

    context.banks_client.process_transaction(tx).await.unwrap();

    voucher_edition
        .create(
            &mut context,
            &edition_authority,
            &test_pack_set.authority,
            &voucher_master_token_holder.token_account,
        )
        .await
        .unwrap();

    let test_pack_card = TestPackCard::new(&test_pack_set, 1);
    test_pack_set
        .add_card(
            &mut context,
            &test_pack_card,
            &card_master_edition,
            &card_metadata,
            &card_master_token_holder,
            AddCardToPackArgs {
                max_supply: Some(5),
                probability_type: DistributionType::FixedNumber,
                probability: 1,
                index: test_pack_card.index,
            },
        )
        .await
        .unwrap();

    let test_pack_voucher = TestPackVoucher::new(&test_pack_set, 1);

    test_pack_set
        .add_voucher(
            &mut context,
            &test_pack_voucher,
            &voucher_master_edition,
            &voucher_metadata,
            &voucher_master_token_holder,
            AddVoucherToPackArgs {
                max_supply: Some(5),
                number_to_open: 1,
                action_on_prove: ActionOnProve::Burn,
            },
        )
        .await
        .unwrap();

    test_pack_set.activate(&mut context).await.unwrap();

    test_pack_set
        .prove_voucher_ownership(
            &mut context,
            &voucher_edition.new_edition_pubkey,
            &voucher_edition.mint.pubkey(),
            &edition_authority,
            &voucher_edition.token.pubkey(),
            &test_pack_voucher.pubkey,
        )
        .await
        .unwrap();

    let (proving_process_key, _) = find_proving_process_program_address(
        &metaplex_nft_packs::id(),
        &test_pack_set.keypair.pubkey(),
        &edition_authority.pubkey(),
    );
    let proving_process_data = get_account(&mut context, &proving_process_key).await;
    let proving_process = ProvingProcess::unpack_from_slice(&proving_process_data.data).unwrap();

    assert_eq!(proving_process.pack_set, test_pack_set.keypair.pubkey());
    // proved vouchers should be zero because it requires 4 edition to prove it
    assert_eq!(proving_process.proved_vouchers, 1);
    assert_eq!(proving_process.proved_voucher_editions, 0);

    let new_mint = Keypair::new();
    let new_mint_token_acc = Keypair::new();

    let hardcoded_randomness_oracle = Keypair::new();

    test_pack_set
        .claim_pack(
            &mut context,
            &edition_authority,
            &test_pack_card.token_account.pubkey(),
            &card_master_edition.pubkey,
            &new_mint,
            &new_mint_token_acc,
            &edition_authority,
            &card_metadata.pubkey,
            &card_master_edition.mint_pubkey,
            &hardcoded_randomness_oracle.pubkey(),
            1,
        )
        .await
        .unwrap();

    let proving_process_data = get_account(&mut context, &proving_process_key).await;
    let proving_process = ProvingProcess::unpack_from_slice(&proving_process_data.data).unwrap();

    let card_master_edition = card_master_edition.get_data(&mut context).await;

    assert_eq!(proving_process.claimed_cards, 1);
    assert_eq!(card_master_edition.supply, 1);
}
