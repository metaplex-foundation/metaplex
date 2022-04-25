#![allow(unused)]

use anchor_client::solana_sdk::{
    pubkey::Pubkey,
    signer::{keypair::Keypair, Signer},
};
use mpl_token_metadata::state::Collection;
use solana_program::{clock::Clock, system_instruction};
use solana_program_test::*;
use solana_sdk::{program_pack::Pack, transaction::Transaction};
use std::convert::TryFrom;

pub async fn mint_to(
    context: &mut ProgramTestContext,
    mint: &Pubkey,
    to: &Pubkey,
    owner: &Keypair,
    amount: u64,
) {
    let tx = Transaction::new_signed_with_payer(
        &[spl_token::instruction::mint_to(
            &spl_token::id(),
            mint,
            to,
            &owner.pubkey(),
            &[],
            amount,
        )
        .unwrap()],
        Some(&context.payer.pubkey()),
        &[&context.payer, owner],
        context.last_blockhash,
    );

    context.banks_client.process_transaction(tx).await.unwrap();
}

pub async fn create_token_account(
    context: &mut ProgramTestContext,
    account: &Keypair,
    mint: &Pubkey,
    manager: &Pubkey,
) {
    let rent = context.banks_client.get_rent().await.unwrap();

    let tx = Transaction::new_signed_with_payer(
        &[
            system_instruction::create_account(
                &context.payer.pubkey(),
                &account.pubkey(),
                rent.minimum_balance(spl_token::state::Account::LEN),
                spl_token::state::Account::LEN as u64,
                &spl_token::id(),
            ),
            spl_token::instruction::initialize_account(
                &spl_token::id(),
                &account.pubkey(),
                mint,
                manager,
            )
            .unwrap(),
        ],
        Some(&context.payer.pubkey()),
        &[&context.payer, &account],
        context.last_blockhash,
    );

    context.banks_client.process_transaction(tx).await.unwrap();
}

pub async fn create_mint(
    context: &mut ProgramTestContext,
    mint: &Keypair,
    authority: &Pubkey,
    decimals: u8,
) {
    let rent = context.banks_client.get_rent().await.unwrap();

    let tx = Transaction::new_signed_with_payer(
        &[
            system_instruction::create_account(
                &context.payer.pubkey(),
                &mint.pubkey(),
                rent.minimum_balance(spl_token::state::Mint::LEN),
                spl_token::state::Mint::LEN as u64,
                &spl_token::id(),
            ),
            spl_token::instruction::initialize_mint(
                &spl_token::id(),
                &mint.pubkey(),
                authority,
                None,
                decimals,
            )
            .unwrap(),
        ],
        Some(&context.payer.pubkey()),
        &[&context.payer, mint],
        context.last_blockhash,
    );

    context.banks_client.process_transaction(tx).await.unwrap();
}

pub async fn create_master_edition(
    context: &mut ProgramTestContext,
    mint: &Pubkey,
    update_authority: &Keypair,
    mint_authority: &Keypair,
    metadata: &Pubkey,
    max_supply: Option<u64>,
) -> (Pubkey, u8) {
    let (edition, edition_bump) = Pubkey::find_program_address(
        &[
            mpl_token_metadata::state::PREFIX.as_bytes(),
            mpl_token_metadata::id().as_ref(),
            mint.as_ref(),
            mpl_token_metadata::state::EDITION.as_bytes(),
        ],
        &mpl_token_metadata::id(),
    );

    let tx = Transaction::new_signed_with_payer(
        &[mpl_token_metadata::instruction::create_master_edition_v3(
            mpl_token_metadata::id(),
            edition,
            *mint,
            update_authority.pubkey(),
            mint_authority.pubkey(),
            *metadata,
            context.payer.pubkey(),
            max_supply,
        )],
        Some(&context.payer.pubkey()),
        &[&context.payer, mint_authority, update_authority],
        context.last_blockhash,
    );

    context.banks_client.process_transaction(tx).await.unwrap();

    (edition, edition_bump)
}

pub async fn create_token_metadata(
    context: &mut ProgramTestContext,
    mint: &Pubkey,
    mint_authority: &Keypair,
    update_authority: &Keypair,
    name: String,
    symbol: String,
    uri: String,
    creators: Option<Vec<mpl_token_metadata::state::Creator>>,
    seller_fee_basis_points: u16,
    update_authority_is_signer: bool,
    is_mutable: bool,
    collection: Option<Collection>,
) -> Pubkey {
    let (metadata, _) = Pubkey::find_program_address(
        &[
            mpl_token_metadata::state::PREFIX.as_bytes(),
            mpl_token_metadata::id().as_ref(),
            mint.as_ref(),
        ],
        &mpl_token_metadata::id(),
    );

    let tx = Transaction::new_signed_with_payer(
        &[
            mpl_token_metadata::instruction::create_metadata_accounts_v2(
                mpl_token_metadata::id(),
                metadata,
                *mint,
                mint_authority.pubkey(),
                context.payer.pubkey(),
                update_authority.pubkey(),
                name,
                symbol,
                uri,
                creators,
                seller_fee_basis_points,
                update_authority_is_signer,
                is_mutable,
                collection,
                None,
            ),
        ],
        Some(&context.payer.pubkey()),
        &[&context.payer, mint_authority, update_authority],
        context.last_blockhash,
    );

    context.banks_client.process_transaction(tx).await.unwrap();

    metadata
}

pub async fn verify_collection(
    context: &mut ProgramTestContext,
    metadata: &Pubkey,
    collection_authority: &Keypair,
    collection_mint: &Pubkey,
) {
    let (collection_metadata, _) = Pubkey::find_program_address(
        &[
            mpl_token_metadata::state::PREFIX.as_bytes(),
            mpl_token_metadata::id().as_ref(),
            collection_mint.as_ref(),
        ],
        &mpl_token_metadata::id(),
    );

    let (collection_master, _) = Pubkey::find_program_address(
        &[
            mpl_token_metadata::state::PREFIX.as_bytes(),
            mpl_token_metadata::id().as_ref(),
            collection_mint.as_ref(),
            mpl_token_metadata::state::EDITION.as_bytes(),
        ],
        &mpl_token_metadata::id(),
    );

    let tx = Transaction::new_signed_with_payer(
        &[mpl_token_metadata::instruction::verify_collection(
            mpl_token_metadata::id(),
            *metadata,
            collection_authority.pubkey(),
            context.payer.pubkey(),
            *collection_mint,
            collection_metadata,
            collection_master,
            None,
        )],
        Some(&context.payer.pubkey()),
        &[&context.payer, collection_authority],
        context.last_blockhash,
    );

    context.banks_client.process_transaction(tx).await.unwrap();
}

pub async fn airdrop(context: &mut ProgramTestContext, receiver: &Pubkey, amount: u64) {
    let tx = Transaction::new_signed_with_payer(
        &[system_instruction::transfer(
            &context.payer.pubkey(),
            receiver,
            amount,
        )],
        Some(&context.payer.pubkey()),
        &[&context.payer],
        context.last_blockhash,
    );

    context.banks_client.process_transaction(tx).await.unwrap();
}

pub async fn create_collection(
    context: &mut ProgramTestContext,
    mint_authority: &Keypair,
) -> (Pubkey, Pubkey) {
    let mint = Keypair::new();
    create_mint(context, &mint, &mint_authority.pubkey(), 0).await;

    let token_account = Keypair::new();
    create_token_account(
        context,
        &token_account,
        &mint.pubkey(),
        &mint_authority.pubkey(),
    )
    .await;

    mint_to(
        context,
        &mint.pubkey(),
        &token_account.pubkey(),
        mint_authority,
        1,
    )
    .await;

    let collection_metadata = create_token_metadata(
        context,
        &mint.pubkey(),
        mint_authority,
        mint_authority,
        String::from("Collection"),
        String::from("CLC"),
        String::from("URL"),
        None,
        0,
        true,
        true,
        None,
    )
    .await;

    create_master_edition(
        context,
        &mint.pubkey(),
        mint_authority,
        mint_authority,
        &collection_metadata,
        Some(0),
    )
    .await;

    (mint.pubkey(), token_account.pubkey())
}

pub async fn create_master_nft(
    context: &mut ProgramTestContext,
    authority: &Keypair,     // new nft owner
    collection_key: &Pubkey, // collection mint
    collection_authority: &Keypair,
    verify: bool,
) -> (Pubkey, Pubkey, Pubkey) {
    let mint = Keypair::new();
    create_mint(context, &mint, &authority.pubkey(), 0).await;

    let token_account = Keypair::new();
    create_token_account(context, &token_account, &mint.pubkey(), &authority.pubkey()).await;

    mint_to(
        context,
        &mint.pubkey(),
        &token_account.pubkey(),
        authority,
        1,
    )
    .await;

    let collection = Collection {
        verified: false,
        key: *collection_key,
    };

    let metadata = create_token_metadata(
        context,
        &mint.pubkey(),
        authority,
        authority,
        String::from("Collection item"),
        String::from("CLCIT"),
        String::from("URI"),
        None,
        0,
        true,
        true,
        Some(collection),
    )
    .await;

    create_master_edition(
        context,
        &mint.pubkey(),
        authority,
        authority,
        &metadata,
        Some(0),
    )
    .await;

    if verify {
        verify_collection(context, &metadata, collection_authority, collection_key).await;
    }

    (mint.pubkey(), token_account.pubkey(), metadata)
}
