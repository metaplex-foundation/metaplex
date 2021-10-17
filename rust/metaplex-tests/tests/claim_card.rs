mod utils;

use metaplex_nft_packs::{
    find_pack_card_program_address, find_program_authority, find_proving_process_program_address,
    instruction::{
        claim_pack, AddCardToPackArgs, AddVoucherToPackArgs, InitPackSetArgs, NFTPacksInstruction,
    },
    state::{ActionOnProve, PackDistributionType, ProvingProcess},
};
use solana_program::{
    instruction::{AccountMeta, Instruction},
    program_pack::Pack,
    pubkey::Pubkey,
    system_instruction, system_program, sysvar,
};
use solana_program_test::*;
use solana_sdk::{
    instruction::InstructionError,
    signature::Keypair,
    signer::Signer,
    transaction::{Transaction, TransactionError},
    transport::TransportError,
};
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
async fn success_fixed_probability() {
    let mut context = nft_packs_program_test().start_with_context().await;

    let test_pack_set = TestPackSet::new();
    test_pack_set
        .init(
            &mut context,
            InitPackSetArgs {
                name: [7; 32],
                uri: String::from("some link to storage"),
                mutable: true,
                distribution_type: PackDistributionType::Fixed,
                allowed_amount_to_redeem: 10,
                redeem_start_date: None,
                redeem_end_date: None,
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
                probability: Some(10000),
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
    assert_eq!(proving_process.proved_vouchers, 1);
    assert_eq!(proving_process.proved_voucher_editions, 0);

    let new_mint = Keypair::new();
    let new_mint_token_acc = Keypair::new();

    let test_randomness_oracle = TestRandomnessOracle::new();
    test_randomness_oracle.init(&mut context).await.unwrap();
    test_randomness_oracle
        .update(&mut context, [1u8; 32])
        .await
        .unwrap();

    test_pack_set
        .request_card_for_redeem(
            &mut context,
            &edition_authority,
            &test_randomness_oracle.keypair.pubkey(),
        )
        .await
        .unwrap();

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
            &test_randomness_oracle.keypair.pubkey(),
            1,
        )
        .await
        .unwrap();

    let proving_process_data = get_account(&mut context, &proving_process_key).await;
    let proving_process = ProvingProcess::unpack_from_slice(&proving_process_data.data).unwrap();

    let card_master_edition = card_master_edition.get_data(&mut context).await;

    assert_eq!(proving_process.cards_redeemed, 1);
    assert_eq!(proving_process.next_card_to_redeem, 0);
    assert_eq!(card_master_edition.supply, 1);
}

#[tokio::test]
async fn success_max_supply_probability() {
    let mut context = nft_packs_program_test().start_with_context().await;

    let test_pack_set = TestPackSet::new();
    test_pack_set
        .init(
            &mut context,
            InitPackSetArgs {
                name: [7; 32],
                uri: String::from("some link to storage"),
                mutable: true,
                distribution_type: PackDistributionType::MaxSupply,
                allowed_amount_to_redeem: 10,
                redeem_start_date: None,
                redeem_end_date: None,
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
                probability: None,
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
    assert_eq!(proving_process.proved_vouchers, 1);
    assert_eq!(proving_process.proved_voucher_editions, 0);

    let test_randomness_oracle = TestRandomnessOracle::new();
    test_randomness_oracle.init(&mut context).await.unwrap();
    test_randomness_oracle
        .update(&mut context, [1u8; 32])
        .await
        .unwrap();

    context.warp_to_slot(3).unwrap();

    let new_mint = Keypair::new();
    let new_mint_token_acc = Keypair::new();

    test_pack_set
        .request_card_for_redeem(
            &mut context,
            &edition_authority,
            &test_randomness_oracle.keypair.pubkey(),
        )
        .await
        .unwrap();

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
            &test_randomness_oracle.keypair.pubkey(),
            1,
        )
        .await
        .unwrap();

    let proving_process_data = get_account(&mut context, &proving_process_key).await;
    let proving_process = ProvingProcess::unpack_from_slice(&proving_process_data.data).unwrap();

    let card_master_edition = card_master_edition.get_data(&mut context).await;

    assert_eq!(proving_process.cards_redeemed, 1);
    assert_eq!(proving_process.next_card_to_redeem, 0);
    assert_eq!(card_master_edition.supply, 1);
}

#[tokio::test]
async fn fail_wrong_user_wallet() {
    let mut context = nft_packs_program_test().start_with_context().await;

    let test_pack_set = TestPackSet::new();
    test_pack_set
        .init(
            &mut context,
            InitPackSetArgs {
                name: [7; 32],
                uri: String::from("some link to storage"),
                mutable: true,
                distribution_type: PackDistributionType::MaxSupply,
                allowed_amount_to_redeem: 10,
                redeem_start_date: None,
                redeem_end_date: None,
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
                probability: None,
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

    let test_randomness_oracle = TestRandomnessOracle::new();
    test_randomness_oracle.init(&mut context).await.unwrap();
    test_randomness_oracle
        .update(&mut context, [1u8; 32])
        .await
        .unwrap();

    test_pack_set
        .request_card_for_redeem(
            &mut context,
            &edition_authority,
            &test_randomness_oracle.keypair.pubkey(),
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
    assert_eq!(proving_process.proved_vouchers, 1);
    assert_eq!(proving_process.proved_voucher_editions, 0);

    let new_mint = Keypair::new();
    let new_mint_token_acc = Keypair::new();

    let malicious_user = Keypair::new();

    create_mint(&mut context, &new_mint, &malicious_user.pubkey(), None)
        .await
        .unwrap();
    create_token_account(
        &mut context,
        &new_mint_token_acc,
        &new_mint.pubkey(),
        &malicious_user.pubkey(),
    )
    .await
    .unwrap();
    mint_tokens(
        &mut context,
        &new_mint.pubkey(),
        &new_mint_token_acc.pubkey(),
        1,
        &malicious_user.pubkey(),
        Some(vec![&malicious_user]),
    )
    .await
    .unwrap();

    let mint_key = new_mint.pubkey();
    let spl_token_metadata_key = spl_token_metadata::id();

    let metadata_seeds = &[
        spl_token_metadata::state::PREFIX.as_bytes(),
        spl_token_metadata_key.as_ref(),
        mint_key.as_ref(),
    ];
    let (new_metadata_pubkey, _) =
        Pubkey::find_program_address(metadata_seeds, &spl_token_metadata::id());

    let master_edition_seeds = &[
        spl_token_metadata::state::PREFIX.as_bytes(),
        spl_token_metadata_key.as_ref(),
        mint_key.as_ref(),
        spl_token_metadata::state::EDITION.as_bytes(),
    ];
    let (new_edition_pubkey, _) =
        Pubkey::find_program_address(master_edition_seeds, &spl_token_metadata::id());

    let index = 1;

    let (proving_process, _) = find_proving_process_program_address(
        &metaplex_nft_packs::id(),
        &test_pack_set.keypair.pubkey(),
        &edition_authority.pubkey(),
    );
    let (pack_card, _) = find_pack_card_program_address(
        &metaplex_nft_packs::id(),
        &test_pack_set.keypair.pubkey(),
        index,
    );
    let (program_authority, _) = find_program_authority(&metaplex_nft_packs::id());

    let edition_number = (index as u64)
        .checked_div(spl_token_metadata::state::EDITION_MARKER_BIT_SIZE)
        .unwrap();
    let as_string = edition_number.to_string();
    let (edition_mark_pda, _) = Pubkey::find_program_address(
        &[
            spl_token_metadata::state::PREFIX.as_bytes(),
            spl_token_metadata::id().as_ref(),
            card_master_edition.mint_pubkey.as_ref(),
            spl_token_metadata::state::EDITION.as_bytes(),
            as_string.as_bytes(),
        ],
        &spl_token_metadata::id(),
    );

    let test_randomness_oracle = TestRandomnessOracle::new();
    test_randomness_oracle.init(&mut context).await.unwrap();

    let accounts = vec![
        AccountMeta::new_readonly(test_pack_set.keypair.pubkey(), false),
        AccountMeta::new(proving_process, false),
        AccountMeta::new(malicious_user.pubkey(), true),
        AccountMeta::new_readonly(program_authority, false),
        AccountMeta::new(pack_card, false),
        AccountMeta::new(test_pack_card.token_account.pubkey(), false),
        AccountMeta::new(new_metadata_pubkey, false),
        AccountMeta::new(new_edition_pubkey, false),
        AccountMeta::new(card_master_edition.pubkey, false),
        AccountMeta::new(new_mint.pubkey(), false),
        AccountMeta::new(malicious_user.pubkey(), true),
        AccountMeta::new(card_metadata.pubkey, false),
        AccountMeta::new(card_master_edition.mint_pubkey, false),
        AccountMeta::new(edition_mark_pda, false),
        AccountMeta::new_readonly(sysvar::rent::id(), false),
        AccountMeta::new_readonly(test_randomness_oracle.keypair.pubkey(), false),
        AccountMeta::new_readonly(spl_token_metadata::id(), false),
        AccountMeta::new_readonly(spl_token::id(), false),
        AccountMeta::new_readonly(system_program::id(), false),
        AccountMeta::new_readonly(sysvar::clock::id(), false),
    ];

    let tx = Transaction::new_signed_with_payer(
        &[Instruction::new_with_borsh(
            metaplex_nft_packs::id(),
            &NFTPacksInstruction::ClaimPack,
            accounts,
        )],
        Some(&context.payer.pubkey()),
        &[&context.payer, &malicious_user],
        context.last_blockhash,
    );

    let tx_result = context
        .banks_client
        .process_transaction(tx)
        .await
        .err()
        .unwrap();

    assert_transport_error!(
        tx_result,
        TransportError::TransactionError(TransactionError::InstructionError(
            0,
            InstructionError::InvalidArgument
        ))
    );
}

#[tokio::test]
async fn fail_claim_twice() {
    let mut context = nft_packs_program_test().start_with_context().await;

    let test_pack_set = TestPackSet::new();
    test_pack_set
        .init(
            &mut context,
            InitPackSetArgs {
                name: [7; 32],
                uri: String::from("some link to storage"),
                mutable: true,
                distribution_type: PackDistributionType::MaxSupply,
                allowed_amount_to_redeem: 10,
                redeem_start_date: None,
                redeem_end_date: None,
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
                probability: None,
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
    assert_eq!(proving_process.proved_vouchers, 1);
    assert_eq!(proving_process.proved_voucher_editions, 0);

    let test_randomness_oracle = TestRandomnessOracle::new();
    test_randomness_oracle.init(&mut context).await.unwrap();
    test_randomness_oracle
        .update(&mut context, [1u8; 32])
        .await
        .unwrap();

    context.warp_to_slot(3).unwrap();

    let new_mint = Keypair::new();
    let new_mint_token_acc = Keypair::new();

    test_pack_set
        .request_card_for_redeem(
            &mut context,
            &edition_authority,
            &test_randomness_oracle.keypair.pubkey(),
        )
        .await
        .unwrap();

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
            &test_randomness_oracle.keypair.pubkey(),
            1,
        )
        .await
        .unwrap();

    context.warp_to_slot(5).unwrap();

    let mint_key = new_mint.pubkey();
    let spl_token_metadata_key = spl_token_metadata::id();

    let metadata_seeds = &[
        spl_token_metadata::state::PREFIX.as_bytes(),
        spl_token_metadata_key.as_ref(),
        mint_key.as_ref(),
    ];
    let (new_metadata_pubkey, _) =
        Pubkey::find_program_address(metadata_seeds, &spl_token_metadata::id());

    let master_edition_seeds = &[
        spl_token_metadata::state::PREFIX.as_bytes(),
        spl_token_metadata_key.as_ref(),
        mint_key.as_ref(),
        spl_token_metadata::state::EDITION.as_bytes(),
    ];
    let (new_edition_pubkey, _) =
        Pubkey::find_program_address(master_edition_seeds, &spl_token_metadata::id());

    let tx = Transaction::new_signed_with_payer(
        &[claim_pack(
            &metaplex_nft_packs::id(),
            &test_pack_set.keypair.pubkey(),
            &edition_authority.pubkey(),
            &test_pack_card.token_account.pubkey(),
            &new_metadata_pubkey,
            &new_edition_pubkey,
            &card_master_edition.pubkey,
            &new_mint.pubkey(),
            &edition_authority.pubkey(),
            &card_metadata.pubkey,
            &card_master_edition.mint_pubkey,
            &test_randomness_oracle.keypair.pubkey(),
            1,
        )],
        Some(&context.payer.pubkey()),
        &[&context.payer, &edition_authority],
        context.last_blockhash,
    );

    let result = context
        .banks_client
        .process_transaction(tx)
        .await
        .err()
        .unwrap();

    assert_transport_error!(
        result,
        TransportError::TransactionError(TransactionError::InstructionError(
            0,
            InstructionError::InvalidArgument
        ))
    );
}
