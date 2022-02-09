use crate::{EXTENDED, PREFIX};
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    sysvar,
};

pub use crate::processor::{
    cancel_bid::CancelBidArgs, claim_bid::ClaimBidArgs, create_auction::CreateAuctionArgs,
    create_auction_v2::CreateAuctionArgsV2, end_auction::EndAuctionArgs, place_bid::PlaceBidArgs,
    start_auction::StartAuctionArgs,
};

#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq)]
pub enum AuctionInstruction {
    /// Cancel a bid on a running auction.
    ///   0. `[signer]` The bidders primary account, for PDA calculation/transit auth.
    ///   1. `[writable]` The bidders token account they'll receive refund with
    ///   2. `[writable]` The pot, containing a reference to the stored SPL token account.
    ///   3. `[writable]` The pot SPL account, where the tokens will be deposited.
    ///   4. `[writable]` The metadata account, storing information about the bidders actions.
    ///   5. `[writable]` Auction account, containing data about the auction and item being bid on.
    ///   6. `[writable]` Token mint, for transfer instructions and verification.
    ///   7. `[]` Clock sysvar
    ///   8. `[]` Rent sysvar
    ///   9. `[]` System program
    ///   10. `[]` SPL Token Program
    CancelBid(CancelBidArgs),

    /// Create a new auction account bound to a resource, initially in a pending state.
    ///   0. `[signer]` The account creating the auction, which is authorised to make changes.
    ///   1. `[writable]` Uninitialized auction account.
    ///   2. `[writable]` Auction extended data account (pda relative to auction of ['auction', program id, vault key, 'extended']).
    ///   3. `[]` Rent sysvar
    ///   4. `[]` System account
    CreateAuction(CreateAuctionArgs),

    /// Move SPL tokens from winning bid to the destination account.
    ///   0. `[writable]` The destination account
    ///   1. `[writable]` The bidder pot token account
    ///   2. `[]` The bidder pot pda account [seed of ['auction', program_id, auction key, bidder key]]
    ///   3. `[signer]` The authority on the auction
    ///   4. `[]` The auction
    ///   5. `[]` The bidder wallet
    ///   6. `[]` Token mint of the auction
    ///   7. `[]` Clock sysvar
    ///   8. `[]` Token program
    ///   9. `[]` Auction extended (pda relative to auction of ['auction', program id, vault key, 'extended'])
    ClaimBid(ClaimBidArgs),

    /// Ends an auction, regardless of end timing conditions
    ///
    ///   0. `[writable, signer]` Auction authority
    ///   1. `[writable]` Auction
    ///   6. `[]` Clock sysvar
    EndAuction(EndAuctionArgs),

    /// Start an inactive auction.
    ///   0. `[signer]` The creator/authorised account.
    ///   1. `[writable]` Initialized auction account.
    ///   2. `[]` Clock sysvar
    StartAuction(StartAuctionArgs),

    /// Update the authority for an auction account.
    ///   0. `[writable]` auction (pda of ['auction', program id, resource id])
    ///   1. `[signer]` authority
    ///   2. `[]` newAuthority
    SetAuthority,

    /// Place a bid on a running auction.
    ///   0. `[signer]` The bidders primary account, for PDA calculation/transit auth.
    ///   1. `[writable]` The bidders token account they'll pay with
    ///   2. `[writable]` The pot, containing a reference to the stored SPL token account.
    ///   3. `[writable]` The pot SPL account, where the tokens will be deposited.
    ///   4. `[writable]` The metadata account, storing information about the bidders actions.
    ///   5. `[writable]` Auction account, containing data about the auction and item being bid on.
    ///   6. `[writable]` Token mint, for transfer instructions and verification.
    ///   7. `[signer]` Transfer authority, for moving tokens into the bid pot.
    ///   8. `[signer]` Payer
    ///   9. `[]` Clock sysvar
    ///   10. `[]` Rent sysvar
    ///   11. `[]` System program
    ///   12. `[]` SPL Token Program
    PlaceBid(PlaceBidArgs),

    /// Create a new auction account bound to a resource, initially in a pending state.
    /// The only one difference with above instruction it's additional parameters in CreateAuctionArgsV2
    ///   0. `[signer]` The account creating the auction, which is authorised to make changes.
    ///   1. `[writable]` Uninitialized auction account.
    ///   2. `[writable]` Auction extended data account (pda relative to auction of ['auction', program id, vault key, 'extended']).
    ///   3. `[]` Rent sysvar
    ///   4. `[]` System account
    CreateAuctionV2(CreateAuctionArgsV2),
}

/// Creates an CreateAuction instruction.
pub fn create_auction_instruction(
    program_id: Pubkey,
    creator_pubkey: Pubkey,
    args: CreateAuctionArgs,
) -> Instruction {
    let seeds = &[
        PREFIX.as_bytes(),
        &program_id.as_ref(),
        args.resource.as_ref(),
    ];
    let (auction_pubkey, _) = Pubkey::find_program_address(seeds, &program_id);

    let seeds = &[
        PREFIX.as_bytes(),
        program_id.as_ref(),
        args.resource.as_ref(),
        EXTENDED.as_bytes(),
    ];
    let (auction_extended_pubkey, _) = Pubkey::find_program_address(seeds, &program_id);

    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(creator_pubkey, true),
            AccountMeta::new(auction_pubkey, false),
            AccountMeta::new(auction_extended_pubkey, false),
            AccountMeta::new_readonly(sysvar::rent::id(), false),
            AccountMeta::new_readonly(solana_program::system_program::id(), false),
        ],
        data: AuctionInstruction::CreateAuction(args)
            .try_to_vec()
            .unwrap(),
    }
}

/// Creates an CreateAuctionV2 instruction.
pub fn create_auction_instruction_v2(
    program_id: Pubkey,
    creator_pubkey: Pubkey,
    args: CreateAuctionArgsV2,
) -> Instruction {
    let seeds = &[
        PREFIX.as_bytes(),
        &program_id.as_ref(),
        args.resource.as_ref(),
    ];
    let (auction_pubkey, _) = Pubkey::find_program_address(seeds, &program_id);

    let seeds = &[
        PREFIX.as_bytes(),
        program_id.as_ref(),
        args.resource.as_ref(),
        EXTENDED.as_bytes(),
    ];
    let (auction_extended_pubkey, _) = Pubkey::find_program_address(seeds, &program_id);

    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(creator_pubkey, true),
            AccountMeta::new(auction_pubkey, false),
            AccountMeta::new(auction_extended_pubkey, false),
            AccountMeta::new_readonly(sysvar::rent::id(), false),
            AccountMeta::new_readonly(solana_program::system_program::id(), false),
        ],
        data: AuctionInstruction::CreateAuctionV2(args)
            .try_to_vec()
            .unwrap(),
    }
}

/// Creates an SetAuthority instruction.
pub fn set_authority_instruction(
    program_id: Pubkey,
    resource: Pubkey,
    authority: Pubkey,
    new_authority: Pubkey,
) -> Instruction {
    let seeds = &[PREFIX.as_bytes(), &program_id.as_ref(), resource.as_ref()];
    let (auction_pubkey, _) = Pubkey::find_program_address(seeds, &program_id);
    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(auction_pubkey, false),
            AccountMeta::new_readonly(authority, true),
            AccountMeta::new_readonly(new_authority, false),
        ],
        data: AuctionInstruction::SetAuthority.try_to_vec().unwrap(),
    }
}

/// Creates an StartAuction instruction.
pub fn start_auction_instruction(
    program_id: Pubkey,
    authority_pubkey: Pubkey,
    args: StartAuctionArgs,
) -> Instruction {
    // Derive Auction Key
    let seeds = &[
        PREFIX.as_bytes(),
        &program_id.as_ref(),
        args.resource.as_ref(),
    ];
    let (auction_pubkey, _) = Pubkey::find_program_address(seeds, &program_id);

    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(authority_pubkey, true),
            AccountMeta::new(auction_pubkey, false),
            AccountMeta::new_readonly(sysvar::clock::id(), false),
        ],
        data: AuctionInstruction::StartAuction(args).try_to_vec().unwrap(),
    }
}

/// Creates an PlaceBid instruction.
pub fn place_bid_instruction(
    program_id: Pubkey,
    bidder_pubkey: Pubkey,
    bidder_token_pubkey: Pubkey,
    bidder_pot_token_pubkey: Pubkey,
    token_mint_pubkey: Pubkey,
    transfer_authority: Pubkey,
    payer: Pubkey,
    args: PlaceBidArgs,
) -> Instruction {
    // Derive Auction Key
    let seeds = &[
        PREFIX.as_bytes(),
        program_id.as_ref(),
        args.resource.as_ref(),
    ];
    let (auction_pubkey, _) = Pubkey::find_program_address(seeds, &program_id);

    let seeds = &[
        PREFIX.as_bytes(),
        program_id.as_ref(),
        args.resource.as_ref(),
        EXTENDED.as_bytes(),
    ];
    let (auction_extended_pubkey, _) = Pubkey::find_program_address(seeds, &program_id);

    // Derive Bidder Pot
    let seeds = &[
        PREFIX.as_bytes(),
        &program_id.as_ref(),
        auction_pubkey.as_ref(),
        bidder_pubkey.as_ref(),
    ];
    let (bidder_pot_pubkey, _) = Pubkey::find_program_address(seeds, &program_id);

    // Derive Bidder Meta
    let seeds = &[
        PREFIX.as_bytes(),
        &program_id.as_ref(),
        auction_pubkey.as_ref(),
        bidder_pubkey.as_ref(),
        "metadata".as_bytes(),
    ];
    let (bidder_meta_pubkey, _) = Pubkey::find_program_address(seeds, &program_id);

    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(bidder_pubkey, true),
            AccountMeta::new(bidder_token_pubkey, false),
            AccountMeta::new(bidder_pot_pubkey, false),
            AccountMeta::new(bidder_pot_token_pubkey, false),
            AccountMeta::new(bidder_meta_pubkey, false),
            AccountMeta::new(auction_pubkey, false),
            AccountMeta::new(auction_extended_pubkey, false),
            AccountMeta::new(token_mint_pubkey, false),
            AccountMeta::new_readonly(transfer_authority, true),
            AccountMeta::new_readonly(payer, true),
            AccountMeta::new_readonly(sysvar::clock::id(), false),
            AccountMeta::new_readonly(sysvar::rent::id(), false),
            AccountMeta::new_readonly(solana_program::system_program::id(), false),
            AccountMeta::new_readonly(spl_token::id(), false),
        ],
        data: AuctionInstruction::PlaceBid(args).try_to_vec().unwrap(),
    }
}

/// Creates an CancelBidinstruction.
pub fn cancel_bid_instruction(
    program_id: Pubkey,
    bidder_pubkey: Pubkey,
    bidder_token_pubkey: Pubkey,
    bidder_pot_token_pubkey: Pubkey,
    token_mint_pubkey: Pubkey,
    args: CancelBidArgs,
) -> Instruction {
    // Derive Auction Key
    let seeds = &[
        PREFIX.as_bytes(),
        program_id.as_ref(),
        args.resource.as_ref(),
    ];
    let (auction_pubkey, _) = Pubkey::find_program_address(seeds, &program_id);

    let seeds = &[
        PREFIX.as_bytes(),
        program_id.as_ref(),
        args.resource.as_ref(),
        EXTENDED.as_bytes(),
    ];
    let (auction_extended_pubkey, _) = Pubkey::find_program_address(seeds, &program_id);

    // Derive Bidder Pot
    let seeds = &[
        PREFIX.as_bytes(),
        &program_id.as_ref(),
        auction_pubkey.as_ref(),
        bidder_pubkey.as_ref(),
    ];
    let (bidder_pot_pubkey, _) = Pubkey::find_program_address(seeds, &program_id);

    // Derive Bidder Meta
    let seeds = &[
        PREFIX.as_bytes(),
        &program_id.as_ref(),
        auction_pubkey.as_ref(),
        bidder_pubkey.as_ref(),
        "metadata".as_bytes(),
    ];
    let (bidder_meta_pubkey, _) = Pubkey::find_program_address(seeds, &program_id);

    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(bidder_pubkey, true),
            AccountMeta::new(bidder_token_pubkey, false),
            AccountMeta::new(bidder_pot_pubkey, false),
            AccountMeta::new(bidder_pot_token_pubkey, false),
            AccountMeta::new(bidder_meta_pubkey, false),
            AccountMeta::new(auction_pubkey, false),
            AccountMeta::new(auction_extended_pubkey, false),
            AccountMeta::new(token_mint_pubkey, false),
            AccountMeta::new_readonly(sysvar::clock::id(), false),
            AccountMeta::new_readonly(sysvar::rent::id(), false),
            AccountMeta::new_readonly(solana_program::system_program::id(), false),
            AccountMeta::new_readonly(spl_token::id(), false),
        ],
        data: AuctionInstruction::CancelBid(args).try_to_vec().unwrap(),
    }
}

pub fn end_auction_instruction(
    program_id: Pubkey,
    authority_pubkey: Pubkey,
    args: EndAuctionArgs,
) -> Instruction {
    // Derive Auction Key
    let seeds = &[
        PREFIX.as_bytes(),
        &program_id.as_ref(),
        args.resource.as_ref(),
    ];
    let (auction_pubkey, _) = Pubkey::find_program_address(seeds, &program_id);

    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(authority_pubkey, true),
            AccountMeta::new(auction_pubkey, false),
            AccountMeta::new_readonly(sysvar::clock::id(), false),
        ],
        data: AuctionInstruction::EndAuction(args).try_to_vec().unwrap(),
    }
}

pub fn claim_bid_instruction(
    program_id: Pubkey,
    destination_pubkey: Pubkey,
    authority_pubkey: Pubkey,
    bidder_pubkey: Pubkey,
    bidder_pot_token_pubkey: Pubkey,
    token_mint_pubkey: Pubkey,
    auction_extended_pubkey: Option<Pubkey>,
    args: ClaimBidArgs,
) -> Instruction {
    // Derive Auction Key
    let seeds = &[
        PREFIX.as_bytes(),
        &program_id.as_ref(),
        args.resource.as_ref(),
    ];
    let (auction_pubkey, _) = Pubkey::find_program_address(seeds, &program_id);

    // Derive Bidder Pot
    let seeds = &[
        PREFIX.as_bytes(),
        &program_id.as_ref(),
        auction_pubkey.as_ref(),
        bidder_pubkey.as_ref(),
    ];
    let (bidder_pot_pubkey, _) = Pubkey::find_program_address(seeds, &program_id);

    let mut accounts = vec![
        AccountMeta::new(destination_pubkey, false),
        AccountMeta::new(bidder_pot_token_pubkey, false),
        AccountMeta::new(bidder_pot_pubkey, false),
        AccountMeta::new_readonly(authority_pubkey, true),
        AccountMeta::new_readonly(auction_pubkey, false),
        AccountMeta::new_readonly(bidder_pubkey, false),
        AccountMeta::new_readonly(token_mint_pubkey, false),
        AccountMeta::new_readonly(sysvar::clock::id(), false),
        AccountMeta::new_readonly(spl_token::id(), false),        
    ];

    if let Some(auction_extended) = auction_extended_pubkey {
        accounts.push(AccountMeta::new_readonly(auction_extended, false));
    }

    Instruction {
        program_id,
        accounts,
        data: AuctionInstruction::ClaimBid(args).try_to_vec().unwrap(),
    }
}
