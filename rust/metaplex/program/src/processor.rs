use {
    crate::instruction::MetaplexInstruction,
    borsh::BorshDeserialize,
    claim_bid::process_claim_bid,
    decommission_auction_manager::process_decommission_auction_manager,
    empty_payment_account::process_empty_payment_account,
    init_auction_manager::process_init_auction_manager,
    populate_participation_printing_account::process_populate_participation_printing_account,
    redeem_bid::process_redeem_bid,
    redeem_full_rights_transfer_bid::process_full_rights_transfer_bid,
    redeem_participation_bid::process_redeem_participation_bid,
    redeem_unused_winning_config_items_as_auctioneer::process_redeem_unused_winning_config_items_as_auctioneer,
    set_store::process_set_store,
    set_whitelisted_creator::process_set_whitelisted_creator,
    solana_program::{account_info::AccountInfo, entrypoint::ProgramResult, msg, pubkey::Pubkey},
    start_auction::process_start_auction,
    validate_participation::process_validate_participation,
    validate_safety_deposit_box::process_validate_safety_deposit_box,
};

pub mod claim_bid;
pub mod decommission_auction_manager;
pub mod empty_payment_account;
pub mod init_auction_manager;
pub mod populate_participation_printing_account;
pub mod redeem_bid;
pub mod redeem_full_rights_transfer_bid;
pub mod redeem_participation_bid;
pub mod redeem_unused_winning_config_items_as_auctioneer;
pub mod set_store;
pub mod set_whitelisted_creator;
pub mod start_auction;
pub mod validate_participation;
pub mod validate_safety_deposit_box;

pub fn process_instruction<'a>(
    program_id: &'a Pubkey,
    accounts: &'a [AccountInfo<'a>],
    input: &[u8],
) -> ProgramResult {
    let instruction = MetaplexInstruction::try_from_slice(input)?;
    match instruction {
        MetaplexInstruction::InitAuctionManager(auction_manager_settings) => {
            msg!("Instruction: Init Auction Manager");
            process_init_auction_manager(program_id, accounts, auction_manager_settings)
        }
        MetaplexInstruction::ValidateSafetyDepositBox => {
            msg!("Instruction: Validate Safety Deposit Box");
            process_validate_safety_deposit_box(program_id, accounts)
        }
        MetaplexInstruction::RedeemBid => {
            msg!("Instruction: Redeem Normal Token Bid");
            process_redeem_bid(program_id, accounts, None)
        }
        MetaplexInstruction::RedeemFullRightsTransferBid => {
            msg!("Instruction: Redeem Full Rights Transfer Bid");
            process_full_rights_transfer_bid(program_id, accounts, None)
        }
        MetaplexInstruction::RedeemParticipationBid => {
            msg!("Instruction: Redeem Participation Bid");
            process_redeem_participation_bid(program_id, accounts)
        }
        MetaplexInstruction::StartAuction => {
            msg!("Instruction: Start Auction");
            process_start_auction(program_id, accounts)
        }
        MetaplexInstruction::ClaimBid => {
            msg!("Instruction: Claim Bid");
            process_claim_bid(program_id, accounts)
        }
        MetaplexInstruction::EmptyPaymentAccount(args) => {
            msg!("Instruction: Empty Payment Account");
            process_empty_payment_account(program_id, accounts, args)
        }
        MetaplexInstruction::SetStore(args) => {
            msg!("Instruction: Set Store");
            process_set_store(program_id, accounts, args.public)
        }
        MetaplexInstruction::SetWhitelistedCreator(args) => {
            msg!("Instruction: Set Whitelisted Creator");
            process_set_whitelisted_creator(program_id, accounts, args.activated)
        }
        MetaplexInstruction::ValidateParticipation => {
            msg!("Instruction: Validate Open Edition");
            process_validate_participation(program_id, accounts)
        }
        MetaplexInstruction::PopulateParticipationPrintingAccount => {
            msg!("Instruction: Populate Participation Printing Account");
            process_populate_participation_printing_account(program_id, accounts)
        }
        MetaplexInstruction::RedeemUnusedWinningConfigItemsAsAuctioneer(args) => {
            msg!("Instruction: Redeem Unused Winning Config Items As Auctioneer");
            process_redeem_unused_winning_config_items_as_auctioneer(program_id, accounts, args)
        }
        MetaplexInstruction::DecommissionAuctionManager => {
            msg!("Instruction: Decomission Auction Manager");
            process_decommission_auction_manager(program_id, accounts)
        }
    }
}
