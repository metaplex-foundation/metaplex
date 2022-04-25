#![allow(dead_code)]
mod assert;
mod edition;
mod edition_marker;
mod external_price;
mod master_edition_v2;
mod metadata;
mod pack_card;
mod pack_set;
mod pack_voucher;
mod user;
mod vault;

pub use assert::*;
pub use edition::*;
pub use edition_marker::TestEditionMarker;
pub use external_price::TestExternalPrice;
pub use master_edition_v2::TestMasterEditionV2;
pub use metadata::TestMetadata;
pub use pack_card::TestPackCard;
pub use pack_set::TestPackSet;
pub use pack_voucher::TestPackVoucher;
use solana_program::clock::Clock;
use solana_program_test::*;
use solana_sdk::{
    account::Account, program_pack::Pack, pubkey::Pubkey, signature::Signer,
    signer::keypair::Keypair, system_instruction, transaction::Transaction, transport,
};
use spl_token::state::Mint;
use std::time;
pub use user::*;
pub use vault::TestVault;

pub fn nft_packs_program_test<'a>() -> ProgramTest {
    let mut program = ProgramTest::new("mpl_nft_packs", mpl_nft_packs::id(), None);
    program.add_program("mpl_metaplex", mpl_metaplex::id(), None);
    program.add_program("mpl_token_metadata", mpl_token_metadata::id(), None);
    program.prefer_bpf(false);
    program
}

pub async fn is_empty_account(context: &mut ProgramTestContext, pubkey: &Pubkey) -> bool {
    match context.banks_client.get_account(*pubkey).await {
        Ok(account) => account.is_none(),
        Err(_) => false,
    }
}

pub async fn get_account(context: &mut ProgramTestContext, pubkey: &Pubkey) -> Account {
    context
        .banks_client
        .get_account(*pubkey)
        .await
        .expect("account not found")
        .expect("account empty")
}

pub async fn get_mint(context: &mut ProgramTestContext, pubkey: &Pubkey) -> Mint {
    let account = get_account(context, pubkey).await;
    Mint::unpack(&account.data).unwrap()
}

/// Will warp to next `N` slots until `Clock` program account `unix_timestamp` field matches current time + `duration`.
pub async fn warp_sleep(context: &mut ProgramTestContext, duration: time::Duration) {
    let current_time = context
        .banks_client
        .get_sysvar::<Clock>()
        .await
        .unwrap()
        .unix_timestamp;
    let end_time = current_time + duration.as_millis() as i64;

    loop {
        let last_time = context
            .banks_client
            .get_sysvar::<Clock>()
            .await
            .unwrap()
            .unix_timestamp;
        if last_time >= end_time {
            break;
        }

        let current_slot = context.banks_client.get_root_slot().await.unwrap();
        context.warp_to_slot(current_slot + 500).unwrap();
    }
}

pub async fn mint_tokens(
    context: &mut ProgramTestContext,
    mint: &Pubkey,
    account: &Pubkey,
    amount: u64,
    owner: &Pubkey,
    additional_signers: Option<Vec<&Keypair>>,
) -> transport::Result<()> {
    let mut signing_keypairs = vec![&context.payer];
    if let Some(signers) = additional_signers {
        signing_keypairs.extend(signers)
    }

    let tx = Transaction::new_signed_with_payer(
        &[
            spl_token::instruction::mint_to(&spl_token::id(), mint, account, owner, &[], amount)
                .unwrap(),
        ],
        Some(&context.payer.pubkey()),
        &signing_keypairs,
        context.last_blockhash,
    );

    context.banks_client.process_transaction(tx).await
}

pub async fn create_token_account(
    context: &mut ProgramTestContext,
    account: &Keypair,
    mint: &Pubkey,
    manager: &Pubkey,
) -> transport::Result<()> {
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
        &[&context.payer, account],
        context.last_blockhash,
    );

    context.banks_client.process_transaction(tx).await
}

pub async fn transfer_token(
    context: &mut ProgramTestContext,
    source: &Pubkey,
    destination: &Pubkey,
    authority: &Keypair,
    amount: u64,
) -> transport::Result<()> {
    let tx = Transaction::new_signed_with_payer(
        &[spl_token::instruction::transfer(
            &spl_token::id(),
            source,
            destination,
            &authority.pubkey(),
            &[],
            amount,
        )
        .unwrap()],
        Some(&context.payer.pubkey()),
        &[&context.payer, authority],
        context.last_blockhash,
    );

    context.banks_client.process_transaction(tx).await
}

pub async fn create_account<S: Pack>(
    context: &mut ProgramTestContext,
    account: &Keypair,
    owner: &Pubkey,
) -> transport::Result<()> {
    let rent = context.banks_client.get_rent().await.unwrap();

    let tx = Transaction::new_signed_with_payer(
        &[system_instruction::create_account(
            &context.payer.pubkey(),
            &account.pubkey(),
            rent.minimum_balance(S::LEN),
            S::LEN as u64,
            owner,
        )],
        Some(&context.payer.pubkey()),
        &[&context.payer, account],
        context.last_blockhash,
    );

    context.banks_client.process_transaction(tx).await
}

pub async fn create_mint(
    context: &mut ProgramTestContext,
    mint: &Keypair,
    manager: &Pubkey,
    freeze_authority: Option<&Pubkey>,
) -> transport::Result<()> {
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
                manager,
                freeze_authority,
                0,
            )
            .unwrap(),
        ],
        Some(&context.payer.pubkey()),
        &[&context.payer, mint],
        context.last_blockhash,
    );

    context.banks_client.process_transaction(tx).await
}

pub async fn create_store(
    context: &mut ProgramTestContext,
    admin: &Keypair,
    public: bool,
) -> transport::Result<Pubkey> {
    let metaplex_key = mpl_metaplex::id();
    let admin_key = admin.pubkey();

    let store_path = &[
        mpl_metaplex::state::PREFIX.as_bytes(),
        metaplex_key.as_ref(),
        admin_key.as_ref(),
    ];
    let (store_key, _) = Pubkey::find_program_address(store_path, &mpl_metaplex::id());

    let tx = Transaction::new_signed_with_payer(
        &[mpl_metaplex::instruction::create_set_store_instruction(
            mpl_metaplex::id(),
            store_key,
            admin_key,
            context.payer.pubkey(),
            public,
        )],
        Some(&context.payer.pubkey()),
        &[&context.payer, admin],
        context.last_blockhash,
    );

    context.banks_client.process_transaction(tx).await.unwrap();

    Ok(store_key)
}
