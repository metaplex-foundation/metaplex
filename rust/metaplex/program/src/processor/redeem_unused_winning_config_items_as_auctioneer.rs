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
