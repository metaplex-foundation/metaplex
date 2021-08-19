#![cfg(feature = "test-bpf")]

use borsh::{BorshDeserialize, BorshSerialize};
use metaplex_nft_packs::*;
use solana_program::{
    instruction::{AccountMeta, Instruction},
    program_pack::Pack,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction, system_program, sysvar,
};
use solana_program_test::*;
use solana_sdk::{
    account::Account,
    signature::{Keypair, Signer},
    transaction::Transaction,
    transport::TransportError,
};

pub fn program_test() -> ProgramTest {
    let mut program = ProgramTest::new(
        "metaplex_nft_packs",
        id(),
        processor!(processor::Processor::process_instruction),
    );
    program.add_program("spl_token_metadata", spl_token_metadata::id(), None);
    program
}

pub async fn get_account(
    program_context: &mut ProgramTestContext,
    pubkey: &Pubkey,
) -> Option<Account> {
    program_context
        .banks_client
        .get_account(*pubkey)
        .await
        .expect("account not found")
}

pub async fn get_token_balance(program_context: &mut ProgramTestContext, pubkey: &Pubkey) -> u64 {
    let acc_data = get_account(program_context, pubkey).await.unwrap();
    let acc_data = spl_token::state::Account::unpack_from_slice(acc_data.data.as_slice()).unwrap();
    acc_data.amount
}

pub async fn create_account(
    program_context: &mut ProgramTestContext,
    account: &Keypair,
    rent: u64,
    space: u64,
    owner: &Pubkey,
) -> Result<(), TransportError> {
    let mut transaction = Transaction::new_with_payer(
        &[system_instruction::create_account(
            &program_context.payer.pubkey(),
            &account.pubkey(),
            rent,
            space,
            owner,
        )],
        Some(&program_context.payer.pubkey()),
    );

    transaction.sign(
        &[&program_context.payer, account],
        program_context.last_blockhash,
    );
    program_context
        .banks_client
        .process_transaction(transaction)
        .await?;
    Ok(())
}

pub async fn create_mint(
    program_context: &mut ProgramTestContext,
    mint_account: &Keypair,
    mint_rent: u64,
    authority: &Pubkey,
) -> Result<(), TransportError> {
    let instructions = vec![
        system_instruction::create_account(
            &program_context.payer.pubkey(),
            &mint_account.pubkey(),
            mint_rent,
            spl_token::state::Mint::LEN as u64,
            &spl_token::id(),
        ),
        spl_token::instruction::initialize_mint(
            &spl_token::id(),
            &mint_account.pubkey(),
            authority,
            None,
            0,
        )
        .unwrap(),
    ];

    let mut transaction =
        Transaction::new_with_payer(&instructions, Some(&program_context.payer.pubkey()));

    transaction.sign(
        &[&program_context.payer, mint_account],
        program_context.last_blockhash,
    );
    program_context
        .banks_client
        .process_transaction(transaction)
        .await?;
    Ok(())
}

pub async fn create_token_account(
    program_context: &mut ProgramTestContext,
    account: &Keypair,
    mint: &Pubkey,
    owner: &Pubkey,
    rent: &Rent,
) -> Result<(), TransportError> {
    let account_rent = rent.minimum_balance(spl_token::state::Account::LEN);

    let instructions = vec![
        system_instruction::create_account(
            &program_context.payer.pubkey(),
            &account.pubkey(),
            account_rent,
            spl_token::state::Account::LEN as u64,
            &spl_token::id(),
        ),
        spl_token::instruction::initialize_account(
            &spl_token::id(),
            &account.pubkey(),
            mint,
            owner,
        )
        .unwrap(),
    ];

    let mut transaction =
        Transaction::new_with_payer(&instructions, Some(&program_context.payer.pubkey()));

    transaction.sign(
        &[&program_context.payer, account],
        program_context.last_blockhash,
    );
    program_context
        .banks_client
        .process_transaction(transaction)
        .await?;
    Ok(())
}

pub async fn mint_tokens_to(
    program_context: &mut ProgramTestContext,
    mint: &Pubkey,
    destination: &Pubkey,
    authority: &Keypair,
    amount: u64,
) -> Result<(), TransportError> {
    let mut transaction = Transaction::new_with_payer(
        &[spl_token::instruction::mint_to(
            &spl_token::id(),
            mint,
            destination,
            &authority.pubkey(),
            &[&authority.pubkey()],
            amount,
        )
        .unwrap()],
        Some(&program_context.payer.pubkey()),
    );
    transaction.sign(
        &[&program_context.payer, authority],
        program_context.last_blockhash,
    );
    program_context
        .banks_client
        .process_transaction(transaction)
        .await?;
    Ok(())
}

pub async fn init_pack_set(
    program_context: &mut ProgramTestContext,
    authority: &Keypair,
    minting_authority: &Keypair,
    args: instruction::InitPackSetArgs,
    rent: &Rent,
) -> Pubkey {
    let pack_set = Keypair::new();

    create_account(
        program_context,
        &pack_set,
        rent.minimum_balance(state::PackSet::LEN),
        state::PackSet::LEN as u64,
        &id(),
    )
    .await
    .unwrap();

    let mut transaction = Transaction::new_signed_with_payer(
        &[instruction::init_pack(
            &id(),
            &pack_set.pubkey(),
            &authority.pubkey(),
            &minting_authority.pubkey(),
            args.clone(),
        )],
        Some(&program_context.payer.pubkey()),
        &[&program_context.payer, &authority],
        program_context.last_blockhash,
    );

    program_context
        .banks_client
        .process_transaction(transaction)
        .await
        .unwrap();

    pack_set.pubkey()
}
