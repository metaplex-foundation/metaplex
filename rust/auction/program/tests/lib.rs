#![allow(warnings)]

use borsh::{BorshDeserialize, BorshSerialize};
use mpl_auction::{
    errors::AuctionError,
    instruction,
    processor::{
        process_instruction, AuctionData, AuctionState, Bid, BidState, BidderPot, CancelBidArgs,
        CreateAuctionArgs, PlaceBidArgs, PriceFloor, StartAuctionArgs, WinnerLimit,
    },
    BIDDER_POT_TOKEN, PREFIX,
};
use mpl_testing_utils::assert_custom_error;
use num_traits::FromPrimitive;
use solana_program::{borsh::try_from_slice_unchecked, instruction::InstructionError};
use solana_program_test::*;
use solana_sdk::{
    account::Account,
    hash::Hash,
    instruction::{AccountMeta, Instruction},
    program_pack::Pack,
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    system_instruction, system_program,
    transaction::{Transaction, TransactionError},
    transport::TransportError,
};
use std::mem;
mod helpers;

/// Initialize an auction with a random resource, and generate bidders with tokens that can be used
/// for testing.
async fn setup_auction(
    start: bool,
    max_winners: usize,
    instant_sale: Option<u64>,
    price_floor: PriceFloor,
    gap_tick_size_percentage: Option<u8>,
    tick_size: Option<u64>,
) -> (
    Pubkey,
    BanksClient,
    Vec<(Keypair, Pubkey, Pubkey)>,
    Keypair,
    Pubkey,
    Pubkey,
    Pubkey,
    Pubkey,
    Hash,
) {
    // Create a program to attach accounts to.
    let program_id = Pubkey::new_unique();
    let mut program_test =
        ProgramTest::new("mpl_auction", program_id, processor!(process_instruction));

    // Start executing test.
    let (mut banks_client, payer, recent_blockhash) = program_test.start().await;

    // Create a Token mint to mint some test tokens with.
    let (mint_keypair, mint_manager) =
        helpers::create_mint(&mut banks_client, &payer, &recent_blockhash)
            .await
            .unwrap();

    // Derive Auction PDA account for lookup.
    let resource = Pubkey::new_unique();
    let seeds = &[PREFIX.as_bytes(), &program_id.as_ref(), resource.as_ref()];
    let (auction_pubkey, _) = Pubkey::find_program_address(seeds, &program_id);

    // Run Create Auction instruction.
    let err = helpers::create_auction(
        &mut banks_client,
        &program_id,
        &payer,
        &recent_blockhash,
        &resource,
        &mint_keypair.pubkey(),
        max_winners,
        "Some name",
        instant_sale,
        price_floor,
        gap_tick_size_percentage,
        tick_size,
    )
    .await
    .unwrap();

    // Attach useful Accounts for testing.
    let mut bidders = vec![];
    for n in 0..5 {
        // Bidder SPL Account, with Minted Tokens
        let bidder = Keypair::new();
        // PDA in the auction for the Bidder to deposit their funds to.

        // Generate User SPL Wallet Account
        helpers::create_token_account(
            &mut banks_client,
            &payer,
            &recent_blockhash,
            &bidder,
            &mint_keypair.pubkey(),
            &payer.pubkey(),
        )
        .await
        .unwrap();

        // Owner via pot PDA.
        let (bid_pot_pubkey, pot_bump) = Pubkey::find_program_address(
            &[
                PREFIX.as_bytes(),
                program_id.as_ref(),
                auction_pubkey.as_ref(),
                bidder.pubkey().as_ref(),
            ],
            &program_id,
        );
        let pot_token_seeds = &[
            PREFIX.as_bytes(),
            bid_pot_pubkey.as_ref(),
            BIDDER_POT_TOKEN.as_bytes(),
        ];
        let (pot_token, pot_token_bump) =
            Pubkey::find_program_address(pot_token_seeds, &program_id);

        // Mint Tokens
        helpers::mint_tokens(
            &mut banks_client,
            &payer,
            &recent_blockhash,
            &mint_keypair.pubkey(),
            &bidder.pubkey(),
            &mint_manager,
            10_000_000,
        )
        .await
        .unwrap();

        bidders.push((bidder, pot_token, bid_pot_pubkey));
    }

    // Verify Auction was created as expected.
    let auction: AuctionData = try_from_slice_unchecked(
        &banks_client
            .get_account(auction_pubkey)
            .await
            .expect("get_account")
            .expect("account not found")
            .data,
    )
    .unwrap();

    assert_eq!(auction.authority, payer.pubkey());
    assert_eq!(auction.last_bid, None);
    assert_eq!(auction.state as i32, AuctionState::create() as i32);
    assert_eq!(auction.end_auction_at, None);

    // Start Auction.
    if start {
        helpers::start_auction(
            &mut banks_client,
            &program_id,
            &recent_blockhash,
            &payer,
            &resource,
        )
        .await
        .unwrap();
    }

    return (
        program_id,
        banks_client,
        bidders,
        payer,
        resource,
        mint_keypair.pubkey(),
        mint_manager.pubkey(),
        auction_pubkey,
        recent_blockhash,
    );
}

/// Used to drive tests in the functions below.
#[derive(Debug)]
enum Action {
    Bid(usize, u64),
    Cancel(usize),
    End,
}

#[cfg(feature = "test-bpf")]
#[tokio::test]
async fn test_correct_runs() {
    // Local wrapper around a small test description described by actions.
    struct Test {
        actions: Vec<Action>,
        expect: Vec<(usize, u64)>,
        max_winners: usize,
        price_floor: PriceFloor,
        seller_collects: u64,
    }

    // A list of auction runs that should succeed. At the end of the run the winning bid state
    // should match the expected result.
    let strategies = [
        // Simple successive bids should work.
        Test {
            actions: vec![
                Action::Bid(0, 1000),
                Action::Bid(1, 2000),
                Action::Bid(2, 3000),
                Action::Bid(3, 4000),
                Action::End,
            ],
            max_winners: 3,
            price_floor: PriceFloor::None([0; 32]),
            seller_collects: 9000,
            expect: vec![(3, 4000), (2, 3000), (1, 2000)],
        },
        // A single bidder should be able to cancel and rebid lower.
        Test {
            actions: vec![
                Action::Bid(0, 5000),
                Action::Cancel(0),
                Action::Bid(0, 4000),
                Action::End,
            ],
            expect: vec![(0, 4000)],
            max_winners: 3,
            price_floor: PriceFloor::None([0; 32]),
            seller_collects: 4000,
        },
        // The top bidder when cancelling should allow room for lower bidders.
        Test {
            actions: vec![
                Action::Bid(0, 5000),
                Action::Bid(1, 6000),
                Action::Cancel(1),
                Action::Bid(2, 5500),
                Action::Bid(1, 6000),
                Action::Bid(3, 7000),
                Action::Cancel(0),
                Action::End,
            ],
            expect: vec![(3, 7000), (1, 6000), (2, 5500)],
            max_winners: 3,
            price_floor: PriceFloor::None([0; 32]),
            seller_collects: 18500,
        },
        // An auction where everyone cancels should still succeed, with no winners.
        Test {
            actions: vec![
                Action::Bid(0, 5000),
                Action::Bid(1, 6000),
                Action::Bid(2, 7000),
                Action::Cancel(0),
                Action::Cancel(1),
                Action::Cancel(2),
                Action::End,
            ],
            expect: vec![],
            max_winners: 3,
            price_floor: PriceFloor::None([0; 32]),
            seller_collects: 0,
        },
        // An auction where no one bids should still succeed.
        Test {
            actions: vec![Action::End],
            expect: vec![],
            max_winners: 3,
            price_floor: PriceFloor::None([0; 32]),
            seller_collects: 0,
        },
    ];

    // Run each strategy with a new auction.
    for strategy in strategies.iter() {
        let (
            program_id,
            mut banks_client,
            bidders,
            payer,
            resource,
            mint,
            mint_authority,
            auction_pubkey,
            recent_blockhash,
        ) = setup_auction(
            true,
            strategy.max_winners,
            None,
            strategy.price_floor.clone(),
            Some(0),
            None,
        )
        .await;

        // Interpret test actions one by one.
        for action in strategy.actions.iter() {
            println!("Strategy: {} Step {:?}", strategy.actions.len(), action);
            match *action {
                Action::Bid(bidder, amount) => {
                    // Get balances pre bidding.
                    let pre_balance = (
                        helpers::get_token_balance(&mut banks_client, &bidders[bidder].0.pubkey())
                            .await,
                        helpers::get_token_balance(&mut banks_client, &bidders[bidder].1).await,
                    );

                    let transfer_authority = Keypair::new();
                    helpers::approve(
                        &mut banks_client,
                        &recent_blockhash,
                        &payer,
                        &transfer_authority.pubkey(),
                        &bidders[bidder].0,
                        amount,
                    )
                    .await
                    .expect("approve");

                    helpers::place_bid(
                        &mut banks_client,
                        &recent_blockhash,
                        &program_id,
                        &payer,
                        &bidders[bidder].0,
                        &bidders[bidder].1,
                        &transfer_authority,
                        &resource,
                        &mint,
                        amount,
                    )
                    .await
                    .expect("place_bid");

                    let post_balance = (
                        helpers::get_token_balance(&mut banks_client, &bidders[bidder].0.pubkey())
                            .await,
                        helpers::get_token_balance(&mut banks_client, &bidders[bidder].1).await,
                    );

                    assert_eq!(post_balance.0, pre_balance.0 - amount);
                    assert_eq!(post_balance.1, pre_balance.1 + amount);
                }

                Action::Cancel(bidder) => {
                    // Get balances pre bidding.
                    let pre_balance = (
                        helpers::get_token_balance(&mut banks_client, &bidders[bidder].0.pubkey())
                            .await,
                        helpers::get_token_balance(&mut banks_client, &bidders[bidder].1).await,
                    );

                    helpers::cancel_bid(
                        &mut banks_client,
                        &recent_blockhash,
                        &program_id,
                        &payer,
                        &bidders[bidder].0,
                        &bidders[bidder].1,
                        &resource,
                        &mint,
                    )
                    .await
                    .expect("cancel_bid");

                    let bidder_account = banks_client
                        .get_account(bidders[bidder].0.pubkey())
                        .await
                        .expect("get_account")
                        .expect("account not found");

                    let post_balance = (
                        helpers::get_token_balance(&mut banks_client, &bidders[bidder].0.pubkey())
                            .await,
                        helpers::get_token_balance(&mut banks_client, &bidders[bidder].1).await,
                    );

                    // Assert the balance successfully moves.
                    assert_eq!(post_balance.0, pre_balance.0 + pre_balance.1);
                    assert_eq!(post_balance.1, 0);
                }

                Action::End => {
                    helpers::end_auction(
                        &mut banks_client,
                        &program_id,
                        &recent_blockhash,
                        &payer,
                        &resource,
                    )
                    .await
                    .expect("end_auction");

                    // Assert Auction is actually in ended state.
                    let auction: AuctionData = try_from_slice_unchecked(
                        &banks_client
                            .get_account(auction_pubkey)
                            .await
                            .expect("get_account")
                            .expect("account not found")
                            .data,
                    )
                    .unwrap();

                    assert!(auction.ended_at.is_some());
                }
            }
        }

        // Verify a bid was created, and Metadata for this bidder correctly reflects
        // the last bid as expected.
        let auction: AuctionData = try_from_slice_unchecked(
            &banks_client
                .get_account(auction_pubkey)
                .await
                .expect("get_account")
                .expect("account not found")
                .data,
        )
        .unwrap();

        // Verify BidState, all winners should be as expected
        match auction.bid_state {
            BidState::EnglishAuction { ref bids, .. } => {
                // Zip internal bid state with the expected indices this strategy expects winners
                // to result in.
                let results: Vec<(_, _)> = strategy.expect.iter().zip(bids.iter().rev()).collect();
                for (index, bid) in results.iter() {
                    let bidder = &bidders[index.0];
                    let amount = index.1;

                    // Winners should match the keypair indices we expected.
                    // bid.0 is the pubkey.
                    assert_eq!(bid.0, bidder.0.pubkey());
                    // Must have bid the amount we expected.
                    // bid.1 is the amount.
                    assert_eq!(bid.1, amount);
                }

                // If the auction has ended, attempt to claim back SPL tokens into a new account.
                if auction.ended(0).unwrap() {
                    let collection = Keypair::new();

                    // Generate Collection Pot.
                    helpers::create_token_account(
                        &mut banks_client,
                        &payer,
                        &recent_blockhash,
                        &collection,
                        &mint,
                        &payer.pubkey(),
                    )
                    .await
                    .unwrap();

                    // For each winning bid, claim into auction.
                    for (index, bid) in results {
                        let err = helpers::claim_bid(
                            &mut banks_client,
                            &recent_blockhash,
                            &program_id,
                            &payer,
                            &payer,
                            &bidders[index.0].0,
                            &bidders[index.0].1,
                            &collection.pubkey(),
                            &resource,
                            &mint,
                        )
                        .await;
                        println!("{:?}", err);
                        err.expect("claim_bid");

                        // Bid pot should be empty
                        let balance =
                            helpers::get_token_balance(&mut banks_client, &bidders[index.0].1)
                                .await;
                        assert_eq!(balance, 0);
                    }

                    // Total claimed balance should match what we expect
                    let balance =
                        helpers::get_token_balance(&mut banks_client, &collection.pubkey()).await;
                    assert_eq!(balance, strategy.seller_collects);
                }
            }
            _ => {}
        }
    }
}

// Function wrapper expected to fail for testing failures.
async fn handle_failing_action(
    banks_client: &mut BanksClient,
    recent_blockhash: &Hash,
    program_id: &Pubkey,
    bidders: &Vec<(Keypair, Pubkey, Pubkey)>,
    mint: &Pubkey,
    payer: &Keypair,
    resource: &Pubkey,
    auction_pubkey: &Pubkey,
    action: &Action,
) -> Result<(), TransportError> {
    match *action {
        Action::Bid(bidder, amount) => {
            // Get balances pre bidding.
            let pre_balance = (
                helpers::get_token_balance(banks_client, &bidders[bidder].0.pubkey()).await,
                helpers::get_token_balance(banks_client, &bidders[bidder].1).await,
            );

            let transfer_authority = Keypair::new();
            helpers::approve(
                banks_client,
                &recent_blockhash,
                &payer,
                &transfer_authority.pubkey(),
                &bidders[bidder].0,
                amount,
            )
            .await?;

            let value = helpers::place_bid(
                banks_client,
                &recent_blockhash,
                &program_id,
                &payer,
                &bidders[bidder].0,
                &bidders[bidder].1,
                &transfer_authority,
                &resource,
                &mint,
                amount,
            )
            .await?;

            let post_balance = (
                helpers::get_token_balance(banks_client, &bidders[bidder].0.pubkey()).await,
                helpers::get_token_balance(banks_client, &bidders[bidder].1).await,
            );

            assert_eq!(post_balance.0, pre_balance.0 - amount);
            assert_eq!(post_balance.1, pre_balance.1 + amount);
        }

        Action::Cancel(bidder) => {
            // Get balances pre bidding.
            let pre_balance = (
                helpers::get_token_balance(banks_client, &bidders[bidder].0.pubkey()).await,
                helpers::get_token_balance(banks_client, &bidders[bidder].1).await,
            );

            helpers::cancel_bid(
                banks_client,
                &recent_blockhash,
                &program_id,
                &payer,
                &bidders[bidder].0,
                &bidders[bidder].1,
                &resource,
                &mint,
            )
            .await?;

            let bidder_account = banks_client
                .get_account(bidders[bidder].0.pubkey())
                .await
                .expect("get_account")
                .expect("account not found");

            let post_balance = (
                helpers::get_token_balance(banks_client, &bidders[bidder].0.pubkey()).await,
                helpers::get_token_balance(banks_client, &bidders[bidder].1).await,
            );

            // Assert the balance successfully moves.
            assert_eq!(post_balance.0, pre_balance.0 + pre_balance.1);
            assert_eq!(post_balance.1, 0);
        }

        Action::End => {
            helpers::end_auction(
                banks_client,
                &program_id,
                &recent_blockhash,
                &payer,
                &resource,
            )
            .await?;

            // Assert Auction is actually in ended state.
            let auction: AuctionData = try_from_slice_unchecked(
                &banks_client
                    .get_account(*auction_pubkey)
                    .await
                    .expect("get_account")
                    .expect("account not found")
                    .data,
            )?;

            assert!(auction.ended_at.is_some());
        }
    }

    Ok(())
}

#[cfg(feature = "test-bpf")]
#[tokio::test]
async fn test_incorrect_runs() {
    // Local wrapper around a small test description described by actions.
    #[derive(Debug)]
    struct Test {
        actions: Vec<Action>,
        max_winners: usize,
        price_floor: PriceFloor,
        gap_tick_size_percentage: Option<u8>,
        tick_size: Option<u64>,
    }

    // A list of auction runs that should succeed. At the end of the run the winning bid state
    // should match the expected result.
    let strategies = [
        // Cancel a non-existing bid.
        Test {
            actions: vec![Action::Cancel(0)],
            max_winners: 3,
            price_floor: PriceFloor::None([0; 32]),
            gap_tick_size_percentage: Some(0),
            tick_size: None,
        },
        // Bidding not a multiple of tick size should fail.
        Test {
            actions: vec![
                Action::Bid(0, 3000),
                Action::Bid(1, 6000),
                Action::Bid(2, 1000),
            ],
            max_winners: 3,
            price_floor: PriceFloor::None([0; 32]),
            gap_tick_size_percentage: Some(0),
            tick_size: Some(3),
        },
        // Bidding after an auction has been explicitly ended should fail.
        Test {
            actions: vec![Action::Bid(0, 5000), Action::End, Action::Bid(1, 6000)],
            max_winners: 3,
            price_floor: PriceFloor::None([0; 32]),
            gap_tick_size_percentage: Some(5),
            tick_size: None,
        },
    ];

    // Run each strategy with a new auction.
    for strategy in strategies.iter() {
        let (
            program_id,
            mut banks_client,
            bidders,
            payer,
            resource,
            mint,
            mint_authority,
            auction_pubkey,
            recent_blockhash,
        ) = setup_auction(
            true,
            strategy.max_winners,
            None,
            strategy.price_floor.clone(),
            strategy.gap_tick_size_percentage,
            strategy.tick_size,
        )
        .await;

        let mut failed = false;

        for action in strategy.actions.iter() {
            failed = handle_failing_action(
                &mut banks_client,
                &recent_blockhash,
                &program_id,
                &bidders,
                &mint,
                &payer,
                &resource,
                &auction_pubkey,
                action,
            )
            .await
            .is_err();
        }

        // Expect to fail.
        assert!(failed);
    }
}

#[cfg(feature = "test-bpf")]
#[tokio::test]
async fn test_place_instant_sale_bid() {
    let instant_sale_price = 5000;
    let bid_price = 6000;

    let (
        program_id,
        mut banks_client,
        bidders,
        payer,
        resource,
        mint,
        mint_authority,
        auction_pubkey,
        recent_blockhash,
    ) = setup_auction(
        true,
        1,
        Some(instant_sale_price),
        PriceFloor::None([0; 32]),
        Some(0),
        None,
    )
    .await;

    // Get balances pre bidding.
    let pre_balance = (
        helpers::get_token_balance(&mut banks_client, &bidders[0].0.pubkey()).await,
        helpers::get_token_balance(&mut banks_client, &bidders[0].1).await,
    );

    let transfer_authority = Keypair::new();
    helpers::approve(
        &mut banks_client,
        &recent_blockhash,
        &payer,
        &transfer_authority.pubkey(),
        &bidders[0].0,
        bid_price,
    )
    .await
    .expect("approve");

    // Make bid with price above instant_sale_price to check if it reduce amount
    helpers::place_bid(
        &mut banks_client,
        &recent_blockhash,
        &program_id,
        &payer,
        &bidders[0].0,
        &bidders[0].1,
        &transfer_authority,
        &resource,
        &mint,
        bid_price,
    )
    .await
    .expect("place_bid");

    let post_balance = (
        helpers::get_token_balance(&mut banks_client, &bidders[0].0.pubkey()).await,
        helpers::get_token_balance(&mut banks_client, &bidders[0].1).await,
    );

    assert_eq!(post_balance.0, pre_balance.0 - instant_sale_price);
    assert_eq!(post_balance.1, pre_balance.1 + instant_sale_price);
}

#[cfg(feature = "test-bpf")]
#[tokio::test]
async fn test_all_bids_are_taken_by_instant_sale_price() {
    // Local wrapper around a small test description described by actions.
    struct Test {
        actions: Vec<Action>,
        expect: Vec<(usize, u64)>,
        max_winners: usize,
        price_floor: PriceFloor,
        seller_collects: u64,
        instant_sale_price: Option<u64>,
    }

    let strategy = Test {
        actions: vec![
            Action::Bid(0, 2000),
            Action::Bid(1, 3000),
            Action::Bid(2, 3000),
            Action::Bid(3, 3000),
        ],
        max_winners: 3,
        price_floor: PriceFloor::None([0; 32]),
        seller_collects: 9000,
        expect: vec![(1, 3000), (2, 3000), (3, 3000)],
        instant_sale_price: Some(3000),
    };

    let (
        program_id,
        mut banks_client,
        bidders,
        payer,
        resource,
        mint,
        mint_authority,
        auction_pubkey,
        recent_blockhash,
    ) = setup_auction(
        true,
        strategy.max_winners,
        strategy.instant_sale_price,
        strategy.price_floor,
        Some(0),
        None,
    )
    .await;

    // Interpret test actions one by one.
    for action in strategy.actions.iter() {
        println!("Strategy: {} Step {:?}", strategy.actions.len(), action);
        match *action {
            Action::Bid(bidder, amount) => {
                // Get balances pre bidding.
                let pre_balance = (
                    helpers::get_token_balance(&mut banks_client, &bidders[bidder].0.pubkey())
                        .await,
                    helpers::get_token_balance(&mut banks_client, &bidders[bidder].1).await,
                );

                let transfer_authority = Keypair::new();
                helpers::approve(
                    &mut banks_client,
                    &recent_blockhash,
                    &payer,
                    &transfer_authority.pubkey(),
                    &bidders[bidder].0,
                    amount,
                )
                .await
                .expect("approve");

                helpers::place_bid(
                    &mut banks_client,
                    &recent_blockhash,
                    &program_id,
                    &payer,
                    &bidders[bidder].0,
                    &bidders[bidder].1,
                    &transfer_authority,
                    &resource,
                    &mint,
                    amount,
                )
                .await
                .expect("place_bid");

                let post_balance = (
                    helpers::get_token_balance(&mut banks_client, &bidders[bidder].0.pubkey())
                        .await,
                    helpers::get_token_balance(&mut banks_client, &bidders[bidder].1).await,
                );

                assert_eq!(post_balance.0, pre_balance.0 - amount);
                assert_eq!(post_balance.1, pre_balance.1 + amount);
            }
            _ => {}
        }
    }

    let auction: AuctionData = try_from_slice_unchecked(
        &banks_client
            .get_account(auction_pubkey)
            .await
            .expect("get_account")
            .expect("account not found")
            .data,
    )
    .unwrap();

    match auction.bid_state {
        BidState::EnglishAuction { ref bids, .. } => {
            // Zip internal bid state with the expected indices this strategy expects winners
            // to result in.
            let results: Vec<(_, _)> = strategy.expect.iter().zip(bids.iter().rev()).collect();
            for (index, bid) in results.iter() {
                let bidder = &bidders[index.0];
                let amount = index.1;

                // Winners should match the keypair indices we expected.
                // bid.0 is the pubkey.
                assert_eq!(bid.0, bidder.0.pubkey());
                // Must have bid the amount we expected.
                // bid.1 is the amount.
                assert_eq!(bid.1, amount);
            }
        }
        _ => {}
    }

    assert_eq!(auction.state, AuctionState::Ended);
}

#[cfg(feature = "test-bpf")]
// #[tokio::test]
// TODO(thlorenz): This test is failing in git@github.com:metaplex-foundation/metaplex.git as well
// Once all contracts were pulled over we need to fix this
async fn test_claim_bid_with_instant_sale_price() {
    let instant_sale_price = 5000;

    let (
        program_id,
        mut banks_client,
        bidders,
        payer,
        resource,
        mint,
        mint_authority,
        auction_pubkey,
        recent_blockhash,
    ) = setup_auction(
        true,
        5,
        Some(instant_sale_price),
        PriceFloor::None([0; 32]),
        Some(0),
        None,
    )
    .await;

    let transfer_authority = Keypair::new();
    helpers::approve(
        &mut banks_client,
        &recent_blockhash,
        &payer,
        &transfer_authority.pubkey(),
        &bidders[0].0,
        instant_sale_price,
    )
    .await
    .expect("approve");

    // Make bid with price above instant_sale_price to check if it reduce amount
    helpers::place_bid(
        &mut banks_client,
        &recent_blockhash,
        &program_id,
        &payer,
        &bidders[0].0,
        &bidders[0].1,
        &transfer_authority,
        &resource,
        &mint,
        instant_sale_price,
    )
    .await
    .expect("place_bid");

    let collection = Keypair::new();

    // Generate Collection Pot.
    helpers::create_token_account(
        &mut banks_client,
        &payer,
        &recent_blockhash,
        &collection,
        &mint,
        &payer.pubkey(),
    )
    .await
    .unwrap();

    helpers::claim_bid(
        &mut banks_client,
        &recent_blockhash,
        &program_id,
        &payer,
        &payer,
        &bidders[0].0,
        &bidders[0].1,
        &collection.pubkey(),
        &resource,
        &mint,
    )
    .await
    .unwrap();

    // Bid pot should be empty
    let balance = helpers::get_token_balance(&mut banks_client, &bidders[0].1).await;
    assert_eq!(balance, 0);

    let balance = helpers::get_token_balance(&mut banks_client, &collection.pubkey()).await;
    assert_eq!(balance, instant_sale_price);
}

#[cfg(feature = "test-bpf")]
#[tokio::test]
async fn test_cancel_bid_with_instant_sale_price() {
    // Local wrapper around a small test description described by actions.
    struct Test {
        actions: Vec<Action>,
        max_winners: usize,
        price_floor: PriceFloor,
        instant_sale_price: Option<u64>,
    }

    let strategy = Test {
        actions: vec![
            Action::Bid(0, 2000),
            Action::Bid(1, 3000),
            Action::Cancel(1),
        ],
        max_winners: 3,
        price_floor: PriceFloor::None([0; 32]),
        instant_sale_price: Some(3000),
    };

    let (
        program_id,
        mut banks_client,
        bidders,
        payer,
        resource,
        mint,
        mint_authority,
        auction_pubkey,
        recent_blockhash,
    ) = setup_auction(
        true,
        strategy.max_winners,
        strategy.instant_sale_price,
        strategy.price_floor,
        Some(0),
        None,
    )
    .await;

    // Interpret test actions one by one.
    for action in strategy.actions.iter() {
        println!("Strategy: {} Step {:?}", strategy.actions.len(), action);
        match *action {
            Action::Bid(bidder, amount) => {
                // Get balances pre bidding.
                let pre_balance = (
                    helpers::get_token_balance(&mut banks_client, &bidders[bidder].0.pubkey())
                        .await,
                    helpers::get_token_balance(&mut banks_client, &bidders[bidder].1).await,
                );

                let transfer_authority = Keypair::new();
                helpers::approve(
                    &mut banks_client,
                    &recent_blockhash,
                    &payer,
                    &transfer_authority.pubkey(),
                    &bidders[bidder].0,
                    amount,
                )
                .await
                .expect("approve");

                helpers::place_bid(
                    &mut banks_client,
                    &recent_blockhash,
                    &program_id,
                    &payer,
                    &bidders[bidder].0,
                    &bidders[bidder].1,
                    &transfer_authority,
                    &resource,
                    &mint,
                    amount,
                )
                .await
                .expect("place_bid");

                let post_balance = (
                    helpers::get_token_balance(&mut banks_client, &bidders[bidder].0.pubkey())
                        .await,
                    helpers::get_token_balance(&mut banks_client, &bidders[bidder].1).await,
                );

                assert_eq!(post_balance.0, pre_balance.0 - amount);
                assert_eq!(post_balance.1, pre_balance.1 + amount);
            }
            Action::Cancel(bidder) => {
                // Get balances pre bidding.
                let pre_balance = (
                    helpers::get_token_balance(&mut banks_client, &bidders[bidder].0.pubkey())
                        .await,
                    helpers::get_token_balance(&mut banks_client, &bidders[bidder].1).await,
                );

                let err = helpers::cancel_bid(
                    &mut banks_client,
                    &recent_blockhash,
                    &program_id,
                    &payer,
                    &bidders[bidder].0,
                    &bidders[bidder].1,
                    &resource,
                    &mint,
                )
                .await
                .unwrap_err()
                .unwrap();

                assert_eq!(
                    err,
                    TransactionError::InstructionError(
                        0,
                        InstructionError::Custom(AuctionError::InvalidState as u32)
                    )
                );
            }
            _ => {}
        }
    }
}

#[cfg(feature = "test-bpf")]
#[tokio::test]
async fn test_fail_spoof_bidder_pot_token() {
    use mpl_testing_utils::{assert_custom_error, assert_error};

    let instant_sale_price = 500;
    let bid_price = 500;
    let (
        program_id,
        mut banks_client,
        bidders,
        payer,
        resource,
        mint,
        mint_authority,
        auction_pubkey,
        recent_blockhash,
    ) = setup_auction(true, 1, None, PriceFloor::None([0; 32]), Some(0), None).await;

    // Get balances pre bidding.
    let pre_balance = (
        helpers::get_token_balance(&mut banks_client, &bidders[0].0.pubkey()).await,
        helpers::get_token_balance(&mut banks_client, &bidders[0].1).await,
    );

    let transfer_authority = Keypair::new();
    helpers::approve(
        &mut banks_client,
        &recent_blockhash,
        &payer,
        &transfer_authority.pubkey(),
        &bidders[0].0,
        bid_price,
    )
    .await
    .expect("approve");
    helpers::approve(
        &mut banks_client,
        &recent_blockhash,
        &payer,
        &transfer_authority.pubkey(),
        &bidders[1].0,
        bid_price,
    )
    .await
    .expect("approve");

    helpers::place_bid(
        &mut banks_client,
        &recent_blockhash,
        &program_id,
        &payer,
        &bidders[0].0,
        &bidders[0].1,
        &transfer_authority,
        &resource,
        &mint,
        bid_price,
    )
    .await
    .expect("place_bid");
    let post_balance = (
        helpers::get_token_balance(&mut banks_client, &bidders[0].0.pubkey()).await,
        helpers::get_token_balance(&mut banks_client, &bidders[0].1).await,
    );
    assert_eq!(post_balance.0, pre_balance.0 - instant_sale_price);
    assert_eq!(post_balance.1, pre_balance.1 + instant_sale_price);

    let err = helpers::place_bid(
        &mut banks_client,
        &recent_blockhash,
        &program_id,
        &payer,
        &bidders[1].0,
        &bidders[0].1,
        &transfer_authority,
        &resource,
        &mint,
        bid_price,
    )
    .await
    .unwrap_err();

    assert_custom_error!(err, AuctionError::BidderPotTokenAccountMustBeNew);

    helpers::cancel_bid(
        &mut banks_client,
        &recent_blockhash,
        &program_id,
        &payer,
        &bidders[0].0,
        &bidders[0].1,
        &resource,
        &mint,
    )
    .await
    .expect("place_bid");

    let post_cancel_balance = (
        helpers::get_token_balance(&mut banks_client, &bidders[0].0.pubkey()).await,
        helpers::get_token_balance(&mut banks_client, &bidders[0].1).await,
    );
    assert_eq!(post_cancel_balance.0, pre_balance.0);
    assert_eq!(post_cancel_balance.1, pre_balance.1);

    helpers::place_bid(
        &mut banks_client,
        &recent_blockhash,
        &program_id,
        &payer,
        &bidders[1].0,
        &bidders[1].1,
        &transfer_authority,
        &resource,
        &mint,
        bid_price,
    )
    .await
    .expect("place_bid");

    let err2 = helpers::cancel_bid(
        &mut banks_client,
        &recent_blockhash,
        &program_id,
        &payer,
        &bidders[0].0,
        &bidders[1].1,
        &resource,
        &mint,
    )
    .await
    .unwrap_err();

    assert_custom_error!(err2, AuctionError::BidderPotTokenAccountOwnerMismatch);
}
