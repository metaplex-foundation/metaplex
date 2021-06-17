use {
    crate::{
        instruction::RedeemUnusedWinningConfigItemsAsAuctioneerArgs,
        processor::redeem_bid::process_redeem_bid,
        processor::redeem_full_rights_transfer_bid::process_full_rights_transfer_bid,
    },
    solana_program::{account_info::AccountInfo, entrypoint::ProgramResult, pubkey::Pubkey},
};
pub fn process_redeem_unused_winning_config_items_as_auctioneer<'a>(
    program_id: &'a Pubkey,
    accounts: &'a [AccountInfo<'a>],
    args: RedeemUnusedWinningConfigItemsAsAuctioneerArgs,
) -> ProgramResult {
    // Be aware, we actually take this overwrite win index, pass it in, and do all sorts of checks with it
    // in the common_redeem_checks method. Specifically, if it is present, we bypass doing anything
    // with bidder metadata or bid redemption structs as we know those wont exist, but we DO check if
    // there are any winners for this index and blow up if there are. If there arent, then we sure as HECK
    // check that you ARE the auction authority, because nobody else should be claiming this unused prize.
    // We also still make sure this prize hasnt been claimed more than once.
    match args.proxy_call {
        crate::instruction::ProxyCallAddress::RedeemBid => process_redeem_bid(
            program_id,
            accounts,
            Some(args.winning_config_item_index as usize),
        ),
        crate::instruction::ProxyCallAddress::RedeemFullRightsTransferBid => {
            process_full_rights_transfer_bid(
                program_id,
                accounts,
                Some(args.winning_config_item_index as usize),
            )
        }
    }
}
