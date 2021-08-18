use {
    crate::{
        deprecated_state::AuctionManagerSettingsV1,
        state::{SafetyDepositConfig, TupleNumericType, PREFIX},
    },
    borsh::{BorshDeserialize, BorshSerialize},
    solana_program::{
        instruction::{AccountMeta, Instruction},
        pubkey::Pubkey,
        sysvar,
    },
    spl_token_metadata::state::EDITION_MARKER_BIT_SIZE,
};
#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub struct SetStoreArgs {
    pub public: bool,
}
#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub struct SetWhitelistedCreatorArgs {
    pub activated: bool,
}

#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub struct EmptyPaymentAccountArgs {
    // If not redeeming a participation NFT's contributions, need to provide
    // the winning config index your redeeming for. For participation, just pass None.
    pub winning_config_index: Option<u8>,

    /// If not redeeming a participation NFT, you also need to index into the winning config item's list.
    pub winning_config_item_index: Option<u8>,

    /// index in the metadata creator list, can be None if metadata has no creator list.
    pub creator_index: Option<u8>,
}
#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub enum ProxyCallAddress {
    RedeemBid,
    RedeemFullRightsTransferBid,
}
#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub struct RedeemUnusedWinningConfigItemsAsAuctioneerArgs {
    pub winning_config_item_index: u8,
    pub proxy_call: ProxyCallAddress,
}

#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub struct RedeemPrintingV2BidArgs {
    pub edition_offset: u64,
    pub win_index: u64,
}

#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub struct RedeemParticipationBidV3Args {
    pub win_index: Option<u64>,
}

#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub struct InitAuctionManagerV2Args {
    pub amount_type: TupleNumericType,
    pub length_type: TupleNumericType,
    // how many ranges you can store in the AuctionWinnerTokenTypeTracker. For a limited edition single, you really
    // only need 1, for more complex auctions you may need more. Feel free to scale this
    // with the complexity of your auctions - this thing stores a range of how many unique token types
    // each range of people gets in the most efficient compressed way possible, but if you don't
    // give a high enough list length, while you may save space, you may also blow out your struct size while performing
    // validation and have a failed auction.
    pub max_ranges: u64,
}

/// Instructions supported by the Fraction program.
#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub enum MetaplexInstruction {
    /// Initializes an Auction Manager V1
    ///
    ///   0. `[writable]` Uninitialized, unallocated auction manager account with pda of ['metaplex', auction_key from auction referenced below]
    ///   1. `[]` Combined vault account with authority set to auction manager account (this will be checked)
    ///           Note in addition that this vault account should have authority set to this program's pda of ['metaplex', auction_key]
    ///   2. `[]` Auction with auctioned item being set to the vault given and authority set to this program's pda of ['metaplex', auction_key]
    ///   3. `[]` Authority for the Auction Manager
    ///   4. `[signer]` Payer
    ///   5. `[]` Accept payment account of same token mint as the auction for taking payment for open editions, owner should be auction manager key
    ///   6. `[]` Store that this auction manager will belong to
    ///   7. `[]` System sysvar    
    ///   8. `[]` Rent sysvar
    DeprecatedInitAuctionManagerV1(AuctionManagerSettingsV1),

    /// Validates that a given safety deposit box has in it contents that match the expected WinningConfig in the auction manager.
    /// A stateful call, this will error out if you call it a second time after validation has occurred.
    ///   0. `[writable]` Uninitialized Safety deposit validation ticket, pda of seed ['metaplex', program id, auction manager key, safety deposit key]
    ///   1. `[writable]` Auction manager
    ///   2. `[writable]` Metadata account
    ///   3. `[writable]` Original authority lookup - unallocated uninitialized pda account with seed ['metaplex', auction key, metadata key]
    ///                   We will store original authority here to return it later.
    ///   4. `[]` A whitelisted creator entry for the store of this auction manager pda of ['metaplex', store key, creator key]
    ///   where creator key comes from creator list of metadata, any will do
    ///   5. `[]` The auction manager's store key
    ///   6. `[]` Safety deposit box account
    ///   7. `[]` Safety deposit box storage account where the actual nft token is stored
    ///   8. `[]` Mint account of the token in the safety deposit box
    ///   9. `[]` Edition OR MasterEdition record key
    ///           Remember this does not need to be an existing account (may not be depending on token), just is a pda with seed
    ///            of ['metadata', program id, Printing mint id, 'edition']. - remember PDA is relative to token metadata program.
    ///   10. `[]` Vault account
    ///   11. `[signer]` Authority
    ///   12. `[signer optional]` Metadata Authority - Signer only required if doing a full ownership txfer
    ///   13. `[signer]` Payer
    ///   14. `[]` Token metadata program
    ///   15. `[]` System
    ///   16. `[]` Rent sysvar
    ///   17. `[writable]` Limited edition Printing mint account (optional - only if using sending Limited Edition)
    ///   18. `[signer]` Limited edition Printing mint Authority account, this will TEMPORARILY TRANSFER MINTING AUTHORITY to the auction manager
    ///         until all limited editions have been redeemed for authority tokens.
    DeprecatedValidateSafetyDepositBoxV1,

    /// NOTE: Requires an AuctionManagerV1.
    /// Note: This requires that auction manager be in a Running state.
    ///
    /// If an auction is complete, you can redeem your bid for a specific item here. If you are the first to do this,
    /// The auction manager will switch from Running state to Disbursing state. If you are the last, this may change
    /// the auction manager state to Finished provided that no authorities remain to be delegated for Master Edition tokens.
    ///
    /// NOTE: Please note that it is totally possible to redeem a bid 2x - once for a prize you won and once at the RedeemParticipationBid point for an open edition
    /// that comes as a 'token of appreciation' for bidding. They are not mutually exclusive unless explicitly set to be that way.
    ///
    ///   0. `[writable]` Auction manager
    ///   1. `[writable]` Safety deposit token storage account
    ///   2. `[writable]` Destination account.
    ///   3. `[writable]` Bid redemption key -
    ///        Just a PDA with seed ['metaplex', auction_key, bidder_metadata_key] that we will allocate to mark that you redeemed your bid
    ///   4. `[writable]` Safety deposit box account
    ///   5. `[writable]` Vault account
    ///   6. `[writable]` Fraction mint of the vault
    ///   7. `[]` Auction
    ///   8. `[]` Your BidderMetadata account
    ///   9. `[signer optional]` Your Bidder account - Only needs to be signer if payer does not own
    ///   10. `[signer]` Payer
    ///   11. `[]` Token program
    ///   12. `[]` Token Vault program
    ///   13. `[]` Token metadata program
    ///   14. `[]` Store
    ///   15. `[]` System
    ///   16. `[]` Rent sysvar
    ///   17. `[]` PDA-based Transfer authority to move the tokens from the store to the destination seed ['vault', program_id, vault key]
    ///        but please note that this is a PDA relative to the Token Vault program, with the 'vault' prefix
    ///   18. `[optional/writable]` Master edition (if Printing type of WinningConfig)
    ///   19. `[optional/writable]` Reservation list PDA ['metadata', program id, master edition key, 'reservation', auction manager key]
    ///        relative to token metadata program (if Printing type of WinningConfig)
    ///   20. `[]` Safety deposit config pda of ['metaplex', program id, auction manager, safety deposit]
    ///      This account will only get used AND BE REQUIRED in the event this is an AuctionManagerV2
    RedeemBid,

    /// Note: This requires that auction manager be in a Running state.
    ///
    /// If an auction is complete, you can redeem your bid for the actual Master Edition itself if it's for that prize here.
    /// If you are the first to do this, the auction manager will switch from Running state to Disbursing state.
    /// If you are the last, this may change the auction manager state to Finished provided that no authorities remain to be delegated for Master Edition tokens.
    ///
    /// NOTE: Please note that it is totally possible to redeem a bid 2x - once for a prize you won and once at the RedeemParticipationBid point for an open edition
    /// that comes as a 'token of appreciation' for bidding. They are not mutually exclusive unless explicitly set to be that way.
    ///
    ///   0. `[writable]` Auction manager
    ///   1. `[writable]` Safety deposit token storage account
    ///   2. `[writable]` Destination account.
    ///   3. `[writable]` Bid redemption key -
    ///        Just a PDA with seed ['metaplex', auction_key, bidder_metadata_key] that we will allocate to mark that you redeemed your bid
    ///   4. `[writable]` Safety deposit box account
    ///   5. `[writable]` Vault account
    ///   6. `[writable]` Fraction mint of the vault
    ///   7. `[]` Auction
    ///   8. `[]` Your BidderMetadata account
    ///   9. `[signer optional]` Your Bidder account - Only needs to be signer if payer does not own
    ///   10. `[signer]` Payer
    ///   11. `[]` Token program
    ///   12. `[]` Token Vault program
    ///   13. `[]` Token metadata program
    ///   14. `[]` Store
    ///   15. `[]` System
    ///   16. `[]` Rent sysvar
    ///   17. `[writable]` Master Metadata account (pda of ['metadata', program id, Printing mint id]) - remember PDA is relative to token metadata program
    ///           (This account is optional, and will only be used if metadata is unique, otherwise this account key will be ignored no matter it's value)
    ///   18. `[]` New authority for Master Metadata - If you are taking ownership of a Master Edition in and of itself, or a Limited Edition that isn't newly minted for you during this auction
    ///             ie someone else had it minted for themselves in a prior auction or through some other means, this is the account the metadata for these tokens will be delegated to
    ///             after this transaction. Otherwise this account will be ignored.
    ///   19. `[]` PDA-based Transfer authority to move the tokens from the store to the destination seed ['vault', program_id, vault key]
    ///        but please note that this is a PDA relative to the Token Vault program, with the 'vault' prefix
    ///   20. `[]` Safety deposit config pda of ['metaplex', program id, auction manager, safety deposit]
    ///      This account will only get used AND BE REQUIRED in the event this is an AuctionManagerV2
    RedeemFullRightsTransferBid,

    /// Note: This requires that auction manager be in a Running state.
    ///
    /// If an auction is complete, you can redeem your bid for an Open Edition token if it is eligible. If you are the first to do this,
    /// The auction manager will switch from Running state to Disbursing state. If you are the last, this may change
    /// the auction manager state to Finished provided that no authorities remain to be delegated for Master Edition tokens.
    ///
    /// NOTE: Please note that it is totally possible to redeem a bid 2x - once for a prize you won and once at this end point for a open edition
    /// that comes as a 'token of appreciation' for bidding. They are not mutually exclusive unless explicitly set to be that way.
    ///
    /// NOTE: If you are redeeming a newly minted Open Edition, you must actually supply a destination account containing a token from a brand new
    /// mint. We do not provide the token to you. Our job with this action is to christen this mint + token combo as an official Open Edition.
    ///
    ///   0. `[writable]` Auction manager
    ///   1. `[writable]` Safety deposit token storage account
    ///   2. `[writable]` Destination account for limited edition authority token. Must be same mint as master edition Printing mint.
    ///   3. `[writable]` Bid redemption key -
    ///        Just a PDA with seed ['metaplex', auction_key, bidder_metadata_key] that we will allocate to mark that you redeemed your bid
    ///   4. `[]` Safety deposit box account
    ///   5. `[]` Vault account
    ///   6. `[]` Safety deposit config pda of ['metaplex', program id, auction manager, safety deposit]
    ///      This account will only get used in the event this is an AuctionManagerV2    
    ///   7. `[]` Auction
    ///   8. `[]` Your BidderMetadata account
    ///   9. `[signer optional/writable]` Your Bidder account - Only needs to be signer if payer does not own
    ///   10. `[signer]` Payer
    ///   11. `[]` Token program
    ///   12. `[]` Token Vault program
    ///   13. `[]` Token metadata program
    ///   14. `[]` Store
    ///   15. `[]` System
    ///   16. `[]` Rent sysvar
    ///   17. `[signer]` Transfer authority to move the payment in the auction's token_mint coin from the bidder account for the participation_fixed_price
    ///             on the auction manager to the auction manager account itself.
    ///   18.  `[writable]` The accept payment account for the auction manager
    ///   19.  `[writable]` The token account you will potentially pay for the open edition bid with if necessary
    ///   20. `[writable]` Participation NFT printing holding account (present on participation_state)
    DeprecatedRedeemParticipationBid,

    /// If the auction manager is in Validated state, it can invoke the start command via calling this command here.
    ///
    ///   0. `[writable]` Auction manager
    ///   1. `[writable]` Auction
    ///   3. `[signer]` Auction manager authority
    ///   4. `[]` Store key
    ///   5. `[]` Auction program
    ///   6. `[]` Clock sysvar
    StartAuction,

    /// If the auction manager is in a Disbursing or Finished state, then this means Auction must be in Ended state.
    /// Then this end point can be used as a signed proxy to use auction manager's authority over the auction to claim bid funds
    /// into the accept payment account on the auction manager for a given bid. Auction has no opinions on how bids are redeemed,
    /// only that they exist, have been paid, and have a winning place. It is up to the implementer of the auction to determine redemption,
    /// and auction manager does this via bid redemption tickets and the vault contract which ensure the user always
    /// can get their NFT once they have paid. Therefore, once they have paid, and the auction is over, the artist can claim
    /// funds at any time without any danger to the user of losing out on their NFT, because the AM will honor their bid with an NFT
    /// at ANY time.
    ///
    ///   0. `[writable]` The accept payment account on the auction manager
    ///   1. `[writable]` The bidder pot token account
    ///   2. `[writable]` The bidder pot pda account [seed of ['auction', program_id, auction key, bidder key] -
    ///           relative to the auction program, not auction manager
    ///   3. `[writable]` Auction manager
    ///   4. `[]` The auction
    ///   5. `[]` The bidder wallet
    ///   6. `[]` Token mint of the auction
    ///   7. `[]` Vault
    ///   8. `[]` Store
    ///   9. `[]` Auction program
    ///   10. `[]` Clock sysvar
    ///   11. `[]` Token program
    ClaimBid,

    /// At any time, the auction manager authority may empty whatever funds are in the accept payment account
    /// on the auction manager. Funds come here from fixed price payments for partipation nfts, and from draining bid payments
    /// from the auction.
    ///
    /// This action specifically takes a given safety deposit box, winning config, and creator on a metadata for the token inside that safety deposit box
    /// and pumps the requisite monies out to that creator as required by the royalties formula.
    ///
    /// It's up to the UI to iterate through all winning configs, all safety deposit boxes in a given winning config tier, and all creators for
    /// each metadata attached to each safety deposit box, to get all the money. Note that one safety deposit box can be used in multiple different winning configs,
    /// but this shouldn't make any difference to this function.
    ///
    /// We designed this function to be called in this loop-like manner because there is a limit to the number of accounts that can
    /// be passed up at once (32) and there may be many more than that easily in a given auction, so it's easier for the implementer to just
    /// loop through and call it, and there is an incentive for them to do so (to get paid.) It's permissionless as well as it
    /// will empty into any destination account owned by the creator that has the proper mint, so anybody can call it.
    ///
    /// For the participation NFT, there is no winning config, but the total is figured by summing the winning bids and subtracting
    /// from the total escrow amount present.
    ///
    ///   0. `[writable]` The accept payment account on the auction manager
    ///   1. `[writable]` The destination account of same mint type as the accept payment account. Must be an Associated Token Account.
    ///   2. `[writable]` Auction manager
    ///   3. `[writable]` Payout ticket info to keep track of this artist or auctioneer's payment, pda of [metaplex, auction manager, winning config index OR 'participation', safety deposit key]
    ///   4. `[signer]` payer
    ///   5. `[]` The metadata
    ///   6. `[]` The master edition of the metadata (optional if exists)
    ///           (pda of ['metadata', program id, metadata mint id, 'edition']) - remember PDA is relative to token metadata program
    ///   7. `[]` Safety deposit box account
    ///   8. `[]` The store of the auction manager
    ///   9. `[]` The vault
    ///   10. `[]` Auction
    ///   11. `[]` Token program
    ///   12. `[]` System program
    ///   13. `[]` Rent sysvar
    ///   14. `[]` AuctionWinnerTokenTypeTracker, pda of seed ['metaplex', program id, auction manager key, 'totals']
    ///   15. `[]` Safety deposit config pda of ['metaplex', program id, auction manager, safety deposit]
    EmptyPaymentAccount(EmptyPaymentAccountArgs),

    /// Given a signer wallet, create a store with pda ['metaplex', wallet] (if it does not exist) and/or update it
    /// (if it already exists). Stores can be set to open (anybody can publish) or closed (publish only via whitelist).
    ///
    ///   0. `[writable]` The store key, seed of ['metaplex', admin wallet]
    ///   1. `[signer]`  The admin wallet
    ///   2. `[signer]`  Payer
    ///   3. `[]` Token program
    ///   4. `[]` Token vault program
    ///   5. `[]` Token metadata program
    ///   6. `[]` Auction program
    ///   7. `[]` System
    ///   8. `[]` Rent sysvar
    SetStore(SetStoreArgs),

    /// Given an existing store, add or update an existing whitelisted creator for the store. This creates
    /// a PDA with seed ['metaplex', store key, creator key] if it does not already exist to store attributes there.
    ///
    ///   0. `[writable]` The whitelisted creator pda key, seed of ['metaplex', store key, creator key]
    ///   1. `[signer]`  The admin wallet
    ///   2. `[signer]`  Payer
    ///   3. `[]` The creator key
    ///   4. `[]` The store key, seed of ['metaplex', admin wallet]
    ///   5. `[]` System
    ///   6. `[]` Rent sysvar
    SetWhitelistedCreator(SetWhitelistedCreatorArgs),

    /// NOTE: Requires an AuctionManagerV1.
    ///   Validates an participation nft (if present) on the Auction Manager. Because of the differing mechanics of an open
    ///   edition (required for participation nft), it needs to be validated at a different endpoint than a normal safety deposit box.
    ///   0. `[writable]` Auction manager
    ///   1. `[]` Open edition metadata
    ///   2. `[]` Open edition MasterEdition account
    ///   3. `[]` Printing authorization token holding account - must be of the printing_mint type on the master_edition, used by
    ///        the auction manager to hold printing authorization tokens for all eligible winners of the participation nft when auction ends. Must
    ///         be owned by auction manager account.
    ///   4. `[signer]` Authority for the Auction Manager
    ///   5. `[]` A whitelisted creator entry for this store for the open edition
    ///       pda of ['metaplex', store key, creator key] where creator key comes from creator list of metadata
    ///   6. `[]` The auction manager's store
    ///   7. `[]` Safety deposit box
    ///   8. `[]` Safety deposit token store
    ///   9. `[]` Vault
    ///   10. `[]` Rent sysvar
    DeprecatedValidateParticipation,

    /// NOTE: Requires an AuctionManagerV1.
    /// Needs to be called by someone at the end of the auction - will use the one time authorization token
    /// to fire up a bunch of printing tokens for use in participation redemptions.
    ///
    ///   0. `[writable]` Safety deposit token store
    ///   1. `[writable]` Transient account with mint of one time authorization account on master edition - you can delete after this txn
    ///   2. `[writable]` The printing token account on the participation state of the auction manager
    ///   3. `[writable]` One time printing authorization mint
    ///   4. `[writable]` Printing mint
    ///   5. `[writable]` Safety deposit of the participation prize
    ///   6. `[writable]` Vault info
    ///   7. `[]` Fraction mint
    ///   8. `[]` Auction info
    ///   9. `[]` Auction manager info
    ///   10. `[]` Token program
    ///   11. `[]` Token vault program
    ///   12. `[]` Token metadata program
    ///   13. `[]` Auction manager store
    ///   14. `[]` Master edition
    ///   15. `[]` PDA-based Transfer authority to move the tokens from the store to the destination seed ['vault', program_id]
    ///        but please note that this is a PDA relative to the Token Vault program, with the 'vault' prefix
    ///   16. `[]` Payer who wishes to receive refund for closing of one time transient account once we're done here
    ///   17. `[]` Rent
    DeprecatedPopulateParticipationPrintingAccount,

    /// If you are an auctioneer, redeem an unused winning config entry. You provide the winning index, and if the winning
    /// index has no winner, then the correct redemption method is called with a special flag set to ignore bidder_metadata checks
    /// and a hardcoded winner index to empty this win to you.
    ///
    /// All the keys, in exact sequence, should follow the expected call you wish to proxy to, because these will be passed
    /// to the process_ method of the next call. This method exists primarily to pass in an additional
    /// argument to the other redemption methods that subtly changes their behavior. We made this additional call so that if the auctioneer
    /// calls those methods directly, they still act the same as if the auctioneer were a normal bidder, which is be desirable behavior.
    ///
    /// An auctioneer should never be in the position where the auction can never work the same for them simply because they are an auctioneer.
    /// This special endpoint exists to give them the "out" to unload items via a proxy call once the auction is over.
    RedeemUnusedWinningConfigItemsAsAuctioneer(RedeemUnusedWinningConfigItemsAsAuctioneerArgs),

    /// If you have an auction manager in an Initialized state and for some reason you can't validate it, you want to retrieve
    /// The items inside of it. This will allow you to move it straight to Disbursing, and then you can, as Auctioneer,
    /// Redeem those items using the RedeemUnusedWinningConfigItemsAsAuctioneer endpoint.
    ///
    /// Be WARNED: Because the boxes have not been validated, the logic for redemptions may not work quite right. For instance,
    /// if your validation step failed because you provided an empty box but said there was a token in it, when you go
    /// and try to redeem it, you yourself will experience quite the explosion. It will be up to you to tactfully
    /// request the bids that can be properly redeemed from the ones that cannot.
    ///
    /// If you had a FullRightsTransfer token, and you never validated (and thus transferred) ownership, when the redemption happens
    /// it will skip trying to transfer it to you, so that should work fine.
    ///
    /// 0. `[writable]` Auction Manager
    /// 1. `[writable]` Auction
    /// 2. `[Signer]` Authority of the Auction Manager
    /// 3. `[]` Vault
    /// 4. `[]` Store
    /// 5. `[]` Auction program
    /// 6. `[]` Clock sysvar
    DecommissionAuctionManager,

    /// Note: This requires that auction manager be in a Running state and that be of the V1 type.
    ///
    /// If an auction is complete, you can redeem your printing v2 bid for a specific item here. If you are the first to do this,
    /// The auction manager will switch from Running state to Disbursing state. If you are the last, this may change
    /// the auction manager state to Finished provided that no authorities remain to be delegated for Master Edition tokens.
    ///
    /// NOTE: Please note that it is totally possible to redeem a bid 2x - once for a prize you won and once at the RedeemParticipationBid point for an open edition
    /// that comes as a 'token of appreciation' for bidding. They are not mutually exclusive unless explicitly set to be that way.
    ///
    ///   0. `[writable]` Auction manager
    ///   1. `[writable]` Safety deposit token storage account
    ///   2. `[writable]` Account containing 1 token of your new mint type.
    ///   MUST be an associated token account of pda [wallet, token program, mint] relative to ata program.
    ///   3. `[writable]` Bid redemption key -
    ///        Just a PDA with seed ['metaplex', auction_key, bidder_metadata_key] that we will allocate to mark that you redeemed your bid
    ///   4. `[writable]` Safety deposit box account
    ///   5. `[writable]` Vault account
    ///   6. `[]` Safety deposit config pda of ['metaplex', program id, auction manager, safety deposit]
    ///      This account will only get used in the event this is an AuctionManagerV2
    ///   7. `[]` Auction
    ///   8. `[]` Your BidderMetadata account
    ///   9. `[]` Your Bidder account - Only needs to be signer if payer does not own
    ///   10. `[signer]` Payer
    ///   11. `[]` Token program
    ///   12. `[]` Token Vault program
    ///   13. `[]` Token metadata program
    ///   14. `[]` Store
    ///   15. `[]` System
    ///   16. `[]` Rent sysvar
    ///   17. `[writable]` Prize tracking ticket (pda of ['metaplex', program id, auction manager key, metadata mint id])
    ///   18. `[writable]` New Metadata key (pda of ['metadata', program id, mint id])
    ///   19. `[writable]` New Edition (pda of ['metadata', program id, mint id, 'edition'])
    ///   20. `[writable]` Master Edition of token in vault V2 (pda of ['metadata', program id, master metadata mint id, 'edition']) PDA is relative to token metadata.
    ///   21. `[writable]` Mint of new token
    ///   22. `[writable]` Edition pda to mark creation - will be checked for pre-existence. (pda of ['metadata', program id, master metadata mint id, 'edition', edition_number])
    ///        where edition_number is NOT the edition number you pass in args but actually edition_number = floor(edition/EDITION_MARKER_BIT_SIZE). PDA is relative to token metadata.
    ///   23. `[signer]` Mint authority of new mint - THIS WILL TRANSFER AUTHORITY AWAY FROM THIS KEY
    ///   24. `[]` Metadata account of token in vault
    RedeemPrintingV2Bid(RedeemPrintingV2BidArgs),

    /// Permissionless call to redeem the master edition in a given safety deposit for a PrintingV2 winning config to the
    /// ATA of the Auctioneer. Can only be called once all redemptions have been met.
    ///
    ///   0. `[writable]` Auction manager
    ///   1. `[writable]` Safety deposit token storage account
    ///   2. `[writable]` Associated token account owned by auction manager authority of same mint as token storage account
    ///   3. `[writable]` Safety deposit box account
    ///   4. `[writable]` Vault account
    ///   5. `[writable]` Fraction mint of the vault
    ///   6. `[]` Prize tracking ticket (pda of ['metaplex', program id, auction manager key, metadata mint id])
    ///   7. `[]` PDA-based Vault transfer authority ['vault', program_id, vault key]
    ///        but please note that this is a PDA relative to the Token Vault program, with the 'vault' prefix
    ///   8. `[]` Auction
    ///   9. `[]` Auction data extended (pda relative to auction of ['auction', program id, vault key, 'extended'])
    ///   10. `[]` Token program
    ///   11. `[]` Token Vault program
    ///   12. `[]` Store
    ///   13. `[]` Rent sysvar
    ///   14. `[]` Safety deposit config pda of ['metaplex', program id, auction manager, safety deposit]
    ///      This account will only get used in the event this is an AuctionManagerV2
    WithdrawMasterEdition,

    /// Note: This requires that auction manager be in a Running state.
    ///
    /// Second note: Unlike it's predecessor, V2 is permissionless.
    /// You can in theory pay for someone else's participation NFT and gift it to them.
    ///
    /// If an auction is complete, you can redeem your bid for an Open Edition token if it is eligible. If you are the first to do this,
    /// The auction manager will switch from Running state to Disbursing state. If you are the last, this may change
    /// the auction manager state to Finished provided that no authorities remain to be delegated for Master Edition tokens.
    ///
    /// NOTE: Please note that it is totally possible to redeem a bid 2x - once for a prize you won and once at this end point for a open edition
    /// that comes as a 'token of appreciation' for bidding. They are not mutually exclusive unless explicitly set to be that way.
    ///
    /// NOTE: If you are redeeming a newly minted Open Edition, you must actually supply a destination account containing a token from a brand new
    /// mint. We do not provide the token to you. Our job with this action is to christen this mint + token combo as an official Open Edition.
    ///
    ///   0. `[writable]` Auction manager
    ///   1. `[writable]` Safety deposit token storage account
    ///   2. `[writable]` Account containing 1 token of your new mint type.
    ///   MUST be an associated token account of pda [wallet, token program, mint] relative to ata program.
    ///   3. `[writable]` Bid redemption key -
    ///        Just a PDA with seed ['metaplex', auction_key, bidder_metadata_key] that we will allocate to mark that you redeemed your bid
    ///   4. `[]` Safety deposit box account
    ///   5. `[]` Vault account
    ///   6. `[writable]` Safety deposit config pda of ['metaplex', program id, auction manager, safety deposit]
    ///      This account will only get used in the event this is an AuctionManagerV2
    ///   7. `[]` Auction
    ///   8. `[]` Your BidderMetadata account
    ///   9. `[]` Your Bidder account
    ///   10. `[signer]` Payer
    ///   11. `[]` Token program
    ///   12. `[]` Token Vault program
    ///   13. `[]` Token metadata program
    ///   14. `[]` Store
    ///   15. `[]` System
    ///   16. `[]` Rent sysvar
    ///   17. `[signer]` Transfer authority to move the payment in the auction's token_mint coin from the bidder account for the participation_fixed_price
    ///             on the auction manager to the auction manager account itself.
    ///   18.  `[writable]` The accept payment account for the auction manager
    ///   19.  `[writable]` The token account you will potentially pay for the open edition bid with if necessary.
    ///   20. `[writable]` Prize tracking ticket (pda of ['metaplex', program id, auction manager key, metadata mint id])
    ///   21. `[writable]` New Metadata key (pda of ['metadata', program id, mint id])
    ///   22. `[writable]` New Edition (pda of ['metadata', program id, mint id, 'edition'])
    ///   23. `[writable]` Master Edition of token in vault V2 (pda of ['metadata', program id, master metadata mint id, 'edition']) PDA is relative to token metadata.
    ///   24. `[writable]` Mint of new token
    ///   25. `[writable]` Edition pda to mark creation - will be checked for pre-existence. (pda of ['metadata', program id, master metadata mint id, 'edition', edition_number])
    ///        where edition_number is NOT the edition number you pass in args but actually edition_number = floor(edition/EDITION_MARKER_BIT_SIZE). PDA is relative to token metadata.
    ///   26. `[signer]` Mint authority of new mint - THIS WILL TRANSFER AUTHORITY AWAY FROM THIS KEY
    ///   27. `[]` Metadata account of token in vault
    //    28. `[]` Auction data extended - pda of ['auction', auction program id, vault key, 'extended'] relative to auction program
    DeprecatedRedeemParticipationBidV2,

    /// Initializes an Auction Manager V2
    ///
    /// NOTE: It is not possible to use MasterEditionV1s for participation nfts with these managers.
    ///
    ///   0. `[writable]` Uninitialized, unallocated auction manager account with pda of ['metaplex', auction_key from auction referenced below]
    ///   1. `[writable]` AuctionWinnerTokenTypeTracker, pda of seed ['metaplex', program id, auction manager key, 'totals']
    ///   2. `[]` Combined vault account with authority set to auction manager account (this will be checked)
    ///           Note in addition that this vault account should have authority set to this program's pda of ['metaplex', auction_key]
    ///   3. `[]` Auction with auctioned item being set to the vault given and authority set to this program's pda of ['metaplex', auction_key]
    ///   4. `[]` Authority for the Auction Manager
    ///   5. `[signer]` Payer
    ///   6. `[]` Accept payment account of same token mint as the auction for taking payment for open editions, owner should be auction manager key
    ///   7. `[]` Store that this auction manager will belong to
    ///   8. `[]` System sysvar    
    ///   9. `[]` Rent sysvar
    InitAuctionManagerV2(InitAuctionManagerV2Args),

    /// NOTE: Requires an AuctionManagerV2.
    ///
    /// Validates that a given safety deposit box has in it contents that match the given SafetyDepositConfig, and creates said config.
    /// A stateful call, this will error out if you call it a second time after validation has occurred.
    ///   0. `[writable]` Uninitialized Safety deposit config, pda of seed ['metaplex', program id, auction manager key, safety deposit key]
    ///   1. `[writable]` AuctionWinnerTokenTypeTracker, pda of seed ['metaplex', program id, auction manager key, 'totals']
    ///   2. `[writable]` Auction manager
    ///   3. `[writable]` Metadata account
    ///   4. `[writable]` Original authority lookup - unallocated uninitialized pda account with seed ['metaplex', auction key, metadata key]
    ///                   We will store original authority here to return it later.
    ///   5. `[]` A whitelisted creator entry for the store of this auction manager pda of ['metaplex', store key, creator key]
    ///   where creator key comes from creator list of metadata, any will do
    ///   6. `[]` The auction manager's store key
    ///   7. `[]` Safety deposit box account
    ///   8. `[]` Safety deposit box storage account where the actual nft token is stored
    ///   9. `[]` Mint account of the token in the safety deposit box
    ///   10. `[]` Edition OR MasterEdition record key
    ///           Remember this does not need to be an existing account (may not be depending on token), just is a pda with seed
    ///            of ['metadata', program id, Printing mint id, 'edition']. - remember PDA is relative to token metadata program.
    ///   11. `[]` Vault account
    ///   12. `[signer]` Authority
    ///   13. `[signer optional]` Metadata Authority - Signer only required if doing a full ownership txfer
    ///   14. `[signer]` Payer
    ///   15. `[]` Token metadata program
    ///   16. `[]` System
    ///   17. `[]` Rent sysvar
    ValidateSafetyDepositBoxV2(SafetyDepositConfig),

    /// Note: This requires that auction manager be in a Running state.
    ///
    /// Second note: V3 is the same as V2, but it requires an additional argument because it is intended to be used with AuctionManagerV2s,
    /// not V1s, which use BidRedemptionTicketV2s, which require this additional argument (the user_provided_win_index).
    /// You can in theory pay for someone else's participation NFT and gift it to them.
    ///
    /// If an auction is complete, you can redeem your bid for an Open Edition token if it is eligible. If you are the first to do this,
    /// The auction manager will switch from Running state to Disbursing state. If you are the last, this may change
    /// the auction manager state to Finished provided that no authorities remain to be delegated for Master Edition tokens.
    ///
    /// NOTE: Please note that it is totally possible to redeem a bid 2x - once for a prize you won and once at this end point for a open edition
    /// that comes as a 'token of appreciation' for bidding. They are not mutually exclusive unless explicitly set to be that way.
    ///
    /// NOTE: If you are redeeming a newly minted Open Edition, you must actually supply a destination account containing a token from a brand new
    /// mint. We do not provide the token to you. Our job with this action is to christen this mint + token combo as an official Open Edition.
    ///
    ///   0. `[writable]` Auction manager
    ///   1. `[writable]` Safety deposit token storage account
    ///   2. `[writable]` Account containing 1 token of your new mint type.
    ///   MUST be an associated token account of pda [wallet, token program, mint] relative to ata program.
    ///   3. `[writable]` Bid redemption key -
    ///        Just a PDA with seed ['metaplex', auction_key, bidder_metadata_key] that we will allocate to mark that you redeemed your bid
    ///   4. `[]` Safety deposit box account
    ///   5. `[]` Vault account
    ///   6. `[writable]` Safety deposit config pda of ['metaplex', program id, auction manager, safety deposit]
    ///      This account will only get used in the event this is an AuctionManagerV2
    ///   7. `[]` Auction
    ///   8. `[]` Your BidderMetadata account
    ///   9. `[]` Your Bidder account
    ///   10. `[signer]` Payer
    ///   11. `[]` Token program
    ///   12. `[]` Token Vault program
    ///   13. `[]` Token metadata program
    ///   14. `[]` Store
    ///   15. `[]` System
    ///   16. `[]` Rent sysvar
    ///   17. `[signer]` Transfer authority to move the payment in the auction's token_mint coin from the bidder account for the participation_fixed_price
    ///             on the auction manager to the auction manager account itself.
    ///   18.  `[writable]` The accept payment account for the auction manager
    ///   19.  `[writable]` The token account you will potentially pay for the open edition bid with if necessary.
    ///   20. `[writable]` Prize tracking ticket (pda of ['metaplex', program id, auction manager key, metadata mint id])
    ///   21. `[writable]` New Metadata key (pda of ['metadata', program id, mint id])
    ///   22. `[writable]` New Edition (pda of ['metadata', program id, mint id, 'edition'])
    ///   23. `[writable]` Master Edition of token in vault V2 (pda of ['metadata', program id, master metadata mint id, 'edition']) PDA is relative to token metadata.
    ///   24. `[writable]` Mint of new token
    ///   25. `[writable]` Edition pda to mark creation - will be checked for pre-existence. (pda of ['metadata', program id, master metadata mint id, 'edition', edition_number])
    ///        where edition_number is NOT the edition number you pass in args but actually edition_number = floor(edition/EDITION_MARKER_BIT_SIZE). PDA is relative to token metadata.
    ///   26. `[signer]` Mint authority of new mint - THIS WILL TRANSFER AUTHORITY AWAY FROM THIS KEY
    ///   27. `[]` Metadata account of token in vault
    //    28. `[]` Auction data extended - pda of ['auction', auction program id, vault key, 'extended'] relative to auction program
    RedeemParticipationBidV3(RedeemParticipationBidV3Args),
}

/// Creates an DeprecatedInitAuctionManager instruction
#[allow(clippy::too_many_arguments)]
pub fn create_deprecated_init_auction_manager_v1_instruction(
    program_id: Pubkey,
    auction_manager: Pubkey,
    vault: Pubkey,
    auction: Pubkey,
    auction_manager_authority: Pubkey,
    payer: Pubkey,
    accept_payment_account_key: Pubkey,
    store: Pubkey,
    settings: AuctionManagerSettingsV1,
) -> Instruction {
    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(auction_manager, false),
            AccountMeta::new_readonly(vault, false),
            AccountMeta::new_readonly(auction, false),
            AccountMeta::new_readonly(auction_manager_authority, false),
            AccountMeta::new_readonly(payer, true),
            AccountMeta::new_readonly(accept_payment_account_key, false),
            AccountMeta::new_readonly(store, false),
            AccountMeta::new_readonly(solana_program::system_program::id(), false),
            AccountMeta::new_readonly(sysvar::rent::id(), false),
        ],
        data: MetaplexInstruction::DeprecatedInitAuctionManagerV1(settings)
            .try_to_vec()
            .unwrap(),
    }
}

/// Creates an InitAuctionManager instruction
#[allow(clippy::too_many_arguments)]
pub fn create_init_auction_manager_v2_instruction(
    program_id: Pubkey,
    auction_manager: Pubkey,
    vault: Pubkey,
    auction: Pubkey,
    auction_manager_authority: Pubkey,
    payer: Pubkey,
    accept_payment_account_key: Pubkey,
    store: Pubkey,
    amount_type: TupleNumericType,
    length_type: TupleNumericType,
    max_ranges: u64,
) -> Instruction {
    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(auction_manager, false),
            AccountMeta::new_readonly(vault, false),
            AccountMeta::new_readonly(auction, false),
            AccountMeta::new_readonly(auction_manager_authority, false),
            AccountMeta::new_readonly(payer, true),
            AccountMeta::new_readonly(accept_payment_account_key, false),
            AccountMeta::new_readonly(store, false),
            AccountMeta::new_readonly(solana_program::system_program::id(), false),
            AccountMeta::new_readonly(sysvar::rent::id(), false),
        ],
        data: MetaplexInstruction::InitAuctionManagerV2(InitAuctionManagerV2Args {
            amount_type,
            length_type,
            max_ranges,
        })
        .try_to_vec()
        .unwrap(),
    }
}

/// Creates an ValidateParticipation instruction
#[allow(clippy::too_many_arguments)]
pub fn deprecated_create_validate_participation_instruction(
    program_id: Pubkey,
    auction_manager: Pubkey,
    open_edition_metadata: Pubkey,
    open_edition_master_edition: Pubkey,
    printing_authorization_token_account: Pubkey,
    auction_manager_authority: Pubkey,
    whitelisted_creator: Pubkey,
    store: Pubkey,
    safety_deposit_box: Pubkey,
    safety_deposit_box_token_store: Pubkey,
    vault: Pubkey,
) -> Instruction {
    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(auction_manager, false),
            AccountMeta::new_readonly(open_edition_metadata, false),
            AccountMeta::new_readonly(open_edition_master_edition, false),
            AccountMeta::new_readonly(printing_authorization_token_account, false),
            AccountMeta::new_readonly(auction_manager_authority, true),
            AccountMeta::new_readonly(whitelisted_creator, false),
            AccountMeta::new_readonly(store, false),
            AccountMeta::new_readonly(safety_deposit_box, false),
            AccountMeta::new_readonly(safety_deposit_box_token_store, false),
            AccountMeta::new_readonly(vault, false),
            AccountMeta::new_readonly(sysvar::rent::id(), false),
        ],
        data: MetaplexInstruction::DeprecatedValidateParticipation
            .try_to_vec()
            .unwrap(),
    }
}

/// Creates an DeprecatedValidateSafetyDepositBoxV1 instruction
#[allow(clippy::too_many_arguments)]
pub fn create_deprecated_validate_safety_deposit_box_v1_instruction(
    program_id: Pubkey,
    auction_manager: Pubkey,
    metadata: Pubkey,
    original_authority_lookup: Pubkey,
    whitelisted_creator: Pubkey,
    store: Pubkey,
    safety_deposit_box: Pubkey,
    safety_deposit_token_store: Pubkey,
    safety_deposit_mint: Pubkey,
    edition: Pubkey,
    vault: Pubkey,
    auction_manager_authority: Pubkey,
    metadata_authority: Pubkey,
    payer: Pubkey,
    printing_mint: Option<Pubkey>,
    printing_mint_authority: Option<Pubkey>,
) -> Instruction {
    let (validation, _) = Pubkey::find_program_address(
        &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            auction_manager.as_ref(),
            safety_deposit_box.as_ref(),
        ],
        &program_id,
    );
    let mut accounts = vec![
        AccountMeta::new(validation, false),
        AccountMeta::new(auction_manager, false),
        AccountMeta::new(metadata, false),
        AccountMeta::new(original_authority_lookup, false),
        AccountMeta::new_readonly(whitelisted_creator, false),
        AccountMeta::new_readonly(store, false),
        AccountMeta::new_readonly(safety_deposit_box, false),
        AccountMeta::new_readonly(safety_deposit_token_store, false),
        AccountMeta::new_readonly(safety_deposit_mint, false),
        AccountMeta::new_readonly(edition, false),
        AccountMeta::new_readonly(vault, false),
        AccountMeta::new_readonly(auction_manager_authority, true),
        AccountMeta::new_readonly(metadata_authority, true),
        AccountMeta::new_readonly(payer, true),
        AccountMeta::new_readonly(spl_token_metadata::id(), false),
        AccountMeta::new_readonly(solana_program::system_program::id(), false),
        AccountMeta::new_readonly(sysvar::rent::id(), false),
    ];

    if let Some(key) = printing_mint {
        accounts.push(AccountMeta::new(key, false))
    }

    if let Some(key) = printing_mint_authority {
        accounts.push(AccountMeta::new_readonly(key, true))
    }

    Instruction {
        program_id,
        accounts,
        data: MetaplexInstruction::DeprecatedValidateSafetyDepositBoxV1
            .try_to_vec()
            .unwrap(),
    }
}

/// Creates an ValidateSafetyDepositBoxV2 instruction
#[allow(clippy::too_many_arguments)]
pub fn create_validate_safety_deposit_box_v2_instruction(
    program_id: Pubkey,
    auction_manager: Pubkey,
    metadata: Pubkey,
    original_authority_lookup: Pubkey,
    whitelisted_creator: Pubkey,
    store: Pubkey,
    safety_deposit_box: Pubkey,
    safety_deposit_token_store: Pubkey,
    safety_deposit_mint: Pubkey,
    edition: Pubkey,
    vault: Pubkey,
    auction_manager_authority: Pubkey,
    metadata_authority: Pubkey,
    payer: Pubkey,
    safety_deposit_config: SafetyDepositConfig,
) -> Instruction {
    let (validation, _) = Pubkey::find_program_address(
        &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            auction_manager.as_ref(),
            safety_deposit_box.as_ref(),
        ],
        &program_id,
    );
    let accounts = vec![
        AccountMeta::new(validation, false),
        AccountMeta::new(auction_manager, false),
        AccountMeta::new(metadata, false),
        AccountMeta::new(original_authority_lookup, false),
        AccountMeta::new_readonly(whitelisted_creator, false),
        AccountMeta::new_readonly(store, false),
        AccountMeta::new_readonly(safety_deposit_box, false),
        AccountMeta::new_readonly(safety_deposit_token_store, false),
        AccountMeta::new_readonly(safety_deposit_mint, false),
        AccountMeta::new_readonly(edition, false),
        AccountMeta::new_readonly(vault, false),
        AccountMeta::new_readonly(auction_manager_authority, true),
        AccountMeta::new_readonly(metadata_authority, true),
        AccountMeta::new_readonly(payer, true),
        AccountMeta::new_readonly(spl_token_metadata::id(), false),
        AccountMeta::new_readonly(solana_program::system_program::id(), false),
        AccountMeta::new_readonly(sysvar::rent::id(), false),
    ];

    Instruction {
        program_id,
        accounts,
        data: MetaplexInstruction::ValidateSafetyDepositBoxV2(safety_deposit_config)
            .try_to_vec()
            .unwrap(),
    }
}

/// Creates an RedeemBid instruction
#[allow(clippy::too_many_arguments)]
pub fn create_redeem_bid_instruction(
    program_id: Pubkey,
    auction_manager: Pubkey,
    safety_deposit_token_store: Pubkey,
    destination: Pubkey,
    bid_redemption: Pubkey,
    safety_deposit_box: Pubkey,
    vault: Pubkey,
    fraction_mint: Pubkey,
    auction: Pubkey,
    bidder_metadata: Pubkey,
    bidder: Pubkey,
    payer: Pubkey,
    store: Pubkey,
    transfer_authority: Pubkey,
) -> Instruction {
    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(auction_manager, false),
            AccountMeta::new(safety_deposit_token_store, false),
            AccountMeta::new(destination, false),
            AccountMeta::new(bid_redemption, false),
            AccountMeta::new(safety_deposit_box, false),
            AccountMeta::new(vault, false),
            AccountMeta::new(fraction_mint, false),
            AccountMeta::new_readonly(auction, false),
            AccountMeta::new_readonly(bidder_metadata, false),
            AccountMeta::new_readonly(bidder, true),
            AccountMeta::new_readonly(payer, true),
            AccountMeta::new_readonly(spl_token::id(), false),
            AccountMeta::new_readonly(spl_token_vault::id(), false),
            AccountMeta::new_readonly(spl_token_metadata::id(), false),
            AccountMeta::new_readonly(store, false),
            AccountMeta::new_readonly(solana_program::system_program::id(), false),
            AccountMeta::new_readonly(sysvar::rent::id(), false),
            AccountMeta::new_readonly(transfer_authority, false),
        ],
        data: MetaplexInstruction::RedeemBid.try_to_vec().unwrap(),
    }
}

/// Creates an RedeemFullRightsTransferBid instruction
#[allow(clippy::too_many_arguments)]
pub fn create_redeem_full_rights_transfer_bid_instruction(
    program_id: Pubkey,
    auction_manager: Pubkey,
    safety_deposit_token_store: Pubkey,
    destination: Pubkey,
    bid_redemption: Pubkey,
    safety_deposit_box: Pubkey,
    vault: Pubkey,
    fraction_mint: Pubkey,
    auction: Pubkey,
    bidder_metadata: Pubkey,
    bidder: Pubkey,
    payer: Pubkey,
    store: Pubkey,
    master_metadata: Pubkey,
    new_metadata_authority: Pubkey,
    transfer_authority: Pubkey,
) -> Instruction {
    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(auction_manager, false),
            AccountMeta::new(safety_deposit_token_store, false),
            AccountMeta::new(destination, false),
            AccountMeta::new(bid_redemption, false),
            AccountMeta::new(safety_deposit_box, false),
            AccountMeta::new(vault, false),
            AccountMeta::new(fraction_mint, false),
            AccountMeta::new_readonly(auction, false),
            AccountMeta::new_readonly(bidder_metadata, false),
            AccountMeta::new_readonly(bidder, true),
            AccountMeta::new_readonly(payer, true),
            AccountMeta::new_readonly(spl_token::id(), false),
            AccountMeta::new_readonly(spl_token_vault::id(), false),
            AccountMeta::new_readonly(spl_token_metadata::id(), false),
            AccountMeta::new_readonly(store, false),
            AccountMeta::new_readonly(solana_program::system_program::id(), false),
            AccountMeta::new_readonly(sysvar::rent::id(), false),
            AccountMeta::new(master_metadata, false),
            AccountMeta::new_readonly(new_metadata_authority, false),
            AccountMeta::new_readonly(transfer_authority, false),
        ],
        data: MetaplexInstruction::RedeemFullRightsTransferBid
            .try_to_vec()
            .unwrap(),
    }
}

/// Creates an RedeemOpenEditionBid instruction
#[allow(clippy::too_many_arguments)]
pub fn create_deprecated_redeem_participation_bid_instruction(
    program_id: Pubkey,
    auction_manager: Pubkey,
    safety_deposit_token_store: Pubkey,
    destination: Pubkey,
    bid_redemption: Pubkey,
    safety_deposit_box: Pubkey,
    vault: Pubkey,
    fraction_mint: Pubkey,
    auction: Pubkey,
    bidder_metadata: Pubkey,
    bidder: Pubkey,
    payer: Pubkey,
    store: Pubkey,
    transfer_authority: Pubkey,
    accept_payment: Pubkey,
    paying_token_account: Pubkey,
    printing_authorization_token_account: Pubkey,
) -> Instruction {
    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(auction_manager, false),
            AccountMeta::new(safety_deposit_token_store, false),
            AccountMeta::new(destination, false),
            AccountMeta::new(bid_redemption, false),
            AccountMeta::new_readonly(safety_deposit_box, false),
            AccountMeta::new_readonly(vault, false),
            AccountMeta::new_readonly(fraction_mint, false),
            AccountMeta::new_readonly(auction, false),
            AccountMeta::new_readonly(bidder_metadata, false),
            AccountMeta::new_readonly(bidder, true),
            AccountMeta::new(payer, true),
            AccountMeta::new_readonly(spl_token::id(), false),
            AccountMeta::new_readonly(spl_token_vault::id(), false),
            AccountMeta::new_readonly(spl_token_metadata::id(), false),
            AccountMeta::new_readonly(store, false),
            AccountMeta::new_readonly(solana_program::system_program::id(), false),
            AccountMeta::new_readonly(sysvar::rent::id(), false),
            AccountMeta::new_readonly(transfer_authority, true),
            AccountMeta::new(accept_payment, false),
            AccountMeta::new(paying_token_account, false),
            AccountMeta::new(printing_authorization_token_account, false),
        ],
        data: MetaplexInstruction::DeprecatedRedeemParticipationBid
            .try_to_vec()
            .unwrap(),
    }
}

/// Creates an StartAuction instruction
#[allow(clippy::too_many_arguments)]
pub fn create_start_auction_instruction(
    program_id: Pubkey,
    auction_manager: Pubkey,
    auction: Pubkey,
    auction_manager_authority: Pubkey,
    store: Pubkey,
) -> Instruction {
    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(auction_manager, false),
            AccountMeta::new(auction, false),
            AccountMeta::new_readonly(auction_manager_authority, true),
            AccountMeta::new_readonly(store, false),
            AccountMeta::new_readonly(spl_auction::id(), false),
            AccountMeta::new_readonly(sysvar::clock::id(), false),
        ],
        data: MetaplexInstruction::StartAuction.try_to_vec().unwrap(),
    }
}

/// Creates an SetStore instruction
pub fn create_set_store_instruction(
    program_id: Pubkey,
    store: Pubkey,
    admin: Pubkey,
    payer: Pubkey,
    public: bool,
) -> Instruction {
    let accounts = vec![
        AccountMeta::new(store, false),
        AccountMeta::new_readonly(admin, true),
        AccountMeta::new_readonly(payer, true),
        AccountMeta::new_readonly(spl_token::id(), false),
        AccountMeta::new_readonly(spl_token_vault::id(), false),
        AccountMeta::new_readonly(spl_token_metadata::id(), false),
        AccountMeta::new_readonly(spl_auction::id(), false),
        AccountMeta::new_readonly(solana_program::system_program::id(), false),
        AccountMeta::new_readonly(sysvar::rent::id(), false),
    ];
    Instruction {
        program_id,
        accounts,
        data: MetaplexInstruction::SetStore(SetStoreArgs { public })
            .try_to_vec()
            .unwrap(),
    }
}

pub fn create_deprecated_populate_participation_printing_account_instruction(
    program_id: Pubkey,
    safety_deposit_token_store: Pubkey,
    transient_one_time_mint_account: Pubkey,
    participation_state_printing_account: Pubkey,
    one_time_printing_authorization_mint: Pubkey,
    printing_mint: Pubkey,
    participation_safety_deposit_box: Pubkey,
    vault: Pubkey,
    fraction_mint: Pubkey,
    auction: Pubkey,
    auction_manager: Pubkey,
    store: Pubkey,
    master_edition: Pubkey,
    transfer_authority: Pubkey,
    payer: Pubkey,
) -> Instruction {
    let accounts = vec![
        AccountMeta::new(safety_deposit_token_store, false),
        AccountMeta::new(transient_one_time_mint_account, false),
        AccountMeta::new(participation_state_printing_account, false),
        AccountMeta::new(one_time_printing_authorization_mint, false),
        AccountMeta::new(printing_mint, false),
        AccountMeta::new(participation_safety_deposit_box, false),
        AccountMeta::new(vault, false),
        AccountMeta::new_readonly(fraction_mint, false),
        AccountMeta::new_readonly(auction, false),
        AccountMeta::new_readonly(auction_manager, false),
        AccountMeta::new_readonly(spl_token::id(), false),
        AccountMeta::new_readonly(spl_token_vault::id(), false),
        AccountMeta::new_readonly(spl_token_metadata::id(), false),
        AccountMeta::new_readonly(store, false),
        AccountMeta::new_readonly(master_edition, false),
        AccountMeta::new_readonly(transfer_authority, false),
        AccountMeta::new_readonly(payer, false),
        AccountMeta::new_readonly(sysvar::rent::id(), false),
    ];
    Instruction {
        program_id,
        accounts,
        data: MetaplexInstruction::DeprecatedPopulateParticipationPrintingAccount
            .try_to_vec()
            .unwrap(),
    }
}

/// Creates an DecommissionAuctionManager instruction
pub fn create_decommission_auction_manager_instruction(
    program_id: Pubkey,
    auction_manager: Pubkey,
    auction: Pubkey,
    authority: Pubkey,
    vault: Pubkey,
    store: Pubkey,
) -> Instruction {
    let accounts = vec![
        AccountMeta::new(auction_manager, false),
        AccountMeta::new(auction, false),
        AccountMeta::new_readonly(authority, true),
        AccountMeta::new_readonly(vault, false),
        AccountMeta::new_readonly(store, false),
        AccountMeta::new_readonly(spl_auction::id(), false),
        AccountMeta::new_readonly(sysvar::clock::id(), false),
    ];
    Instruction {
        program_id,
        accounts,
        data: MetaplexInstruction::DecommissionAuctionManager
            .try_to_vec()
            .unwrap(),
    }
}

/// Creates an RedeemPrintingV2Bid instruction
#[allow(clippy::too_many_arguments)]
pub fn create_redeem_printing_v2_bid_instruction(
    program_id: Pubkey,
    auction_manager: Pubkey,
    safety_deposit_token_store: Pubkey,
    destination: Pubkey,
    bid_redemption: Pubkey,
    safety_deposit_box: Pubkey,
    vault: Pubkey,
    auction: Pubkey,
    bidder_metadata: Pubkey,
    bidder: Pubkey,
    payer: Pubkey,
    store: Pubkey,
    new_metadata: Pubkey,
    original_mint: Pubkey,
    new_mint: Pubkey,
    new_mint_authority: Pubkey,
    edition: u64,
    win_index: u64,
) -> Instruction {
    let (config, _) = Pubkey::find_program_address(
        &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            auction_manager.as_ref(),
            safety_deposit_box.as_ref(),
        ],
        &program_id,
    );

    let (prize_tracking_ticket, _) = Pubkey::find_program_address(
        &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            auction_manager.as_ref(),
            original_mint.as_ref(),
        ],
        &program_id,
    );

    let edition_offset = edition.checked_rem(EDITION_MARKER_BIT_SIZE).unwrap();
    let edition_number = edition.checked_div(EDITION_MARKER_BIT_SIZE).unwrap();

    let (edition_mark_pda, _) = Pubkey::find_program_address(
        &[
            spl_token_metadata::state::PREFIX.as_bytes(),
            spl_token_metadata::id().as_ref(),
            original_mint.as_ref(),
            spl_token_metadata::state::EDITION.as_bytes(),
            edition_number.to_string().as_bytes(),
        ],
        &spl_token_metadata::id(),
    );

    let (metadata, _) = Pubkey::find_program_address(
        &[
            spl_token_metadata::state::PREFIX.as_bytes(),
            spl_token_metadata::id().as_ref(),
            original_mint.as_ref(),
        ],
        &spl_token_metadata::id(),
    );

    let (master_edition, _) = Pubkey::find_program_address(
        &[
            spl_token_metadata::state::PREFIX.as_bytes(),
            spl_token_metadata::id().as_ref(),
            original_mint.as_ref(),
            spl_token_metadata::state::EDITION.as_bytes(),
        ],
        &spl_token_metadata::id(),
    );

    let (new_edition, _) = Pubkey::find_program_address(
        &[
            spl_token_metadata::state::PREFIX.as_bytes(),
            spl_token_metadata::id().as_ref(),
            new_mint.as_ref(),
            spl_token_metadata::state::EDITION.as_bytes(),
        ],
        &spl_token_metadata::id(),
    );

    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(auction_manager, false),
            AccountMeta::new(safety_deposit_token_store, false),
            AccountMeta::new(destination, false),
            AccountMeta::new(bid_redemption, false),
            AccountMeta::new(safety_deposit_box, false),
            AccountMeta::new(vault, false),
            AccountMeta::new(config, false),
            AccountMeta::new_readonly(auction, false),
            AccountMeta::new_readonly(bidder_metadata, false),
            AccountMeta::new_readonly(bidder, false),
            AccountMeta::new(payer, true),
            AccountMeta::new_readonly(spl_token::id(), false),
            AccountMeta::new_readonly(spl_token_vault::id(), false),
            AccountMeta::new_readonly(spl_token_metadata::id(), false),
            AccountMeta::new_readonly(store, false),
            AccountMeta::new_readonly(solana_program::system_program::id(), false),
            AccountMeta::new_readonly(sysvar::rent::id(), false),
            AccountMeta::new(prize_tracking_ticket, false),
            AccountMeta::new(new_metadata, false),
            AccountMeta::new(new_edition, false),
            AccountMeta::new(master_edition, false),
            AccountMeta::new(new_mint, false),
            AccountMeta::new(edition_mark_pda, false),
            AccountMeta::new_readonly(new_mint_authority, true),
            AccountMeta::new_readonly(metadata, false),
        ],
        data: MetaplexInstruction::RedeemPrintingV2Bid(RedeemPrintingV2BidArgs {
            edition_offset,
            win_index,
        })
        .try_to_vec()
        .unwrap(),
    }
}

/// Creates an WithdrawMasterEdition instruction
#[allow(clippy::too_many_arguments)]
pub fn create_withdraw_master_edition(
    program_id: Pubkey,
    auction_manager: Pubkey,
    safety_deposit_token_store: Pubkey,
    destination: Pubkey,
    safety_deposit_box: Pubkey,
    vault: Pubkey,
    fraction_mint: Pubkey,
    auction: Pubkey,
    store: Pubkey,
    mint: Pubkey,
) -> Instruction {
    let (prize_tracking_ticket, _) = Pubkey::find_program_address(
        &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            auction_manager.as_ref(),
            mint.as_ref(),
        ],
        &program_id,
    );

    let (vault_authority, _) = Pubkey::find_program_address(
        &[
            spl_token_vault::state::PREFIX.as_bytes(),
            spl_token_vault::id().as_ref(),
            vault.as_ref(),
        ],
        &spl_token_vault::id(),
    );

    let (auction_data_extended, _) = Pubkey::find_program_address(
        &[
            spl_auction::PREFIX.as_bytes(),
            spl_auction::id().as_ref(),
            vault.as_ref(),
            spl_auction::EXTENDED.as_bytes(),
        ],
        &spl_auction::id(),
    );

    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(auction_manager, false),
            AccountMeta::new(safety_deposit_token_store, false),
            AccountMeta::new(destination, false),
            AccountMeta::new(safety_deposit_box, false),
            AccountMeta::new(vault, false),
            AccountMeta::new(fraction_mint, false),
            AccountMeta::new_readonly(prize_tracking_ticket, false),
            AccountMeta::new_readonly(vault_authority, false),
            AccountMeta::new_readonly(auction, false),
            AccountMeta::new_readonly(auction_data_extended, false),
            AccountMeta::new_readonly(spl_token::id(), false),
            AccountMeta::new_readonly(spl_token_vault::id(), false),
            AccountMeta::new_readonly(store, false),
            AccountMeta::new_readonly(sysvar::rent::id(), false),
        ],
        data: MetaplexInstruction::WithdrawMasterEdition
            .try_to_vec()
            .unwrap(),
    }
}

/// Creates an RedeemParticipationBidV2 instruction
#[allow(clippy::too_many_arguments)]
pub fn create_redeem_participation_bid_v3_instruction(
    program_id: Pubkey,
    auction_manager: Pubkey,
    safety_deposit_token_store: Pubkey,
    destination: Pubkey,
    bid_redemption: Pubkey,
    safety_deposit_box: Pubkey,
    vault: Pubkey,
    auction: Pubkey,
    bidder_metadata: Pubkey,
    bidder: Pubkey,
    payer: Pubkey,
    store: Pubkey,
    transfer_authority: Pubkey,
    accept_payment: Pubkey,
    paying_token_account: Pubkey,
    new_metadata: Pubkey,
    original_mint: Pubkey,
    new_mint: Pubkey,
    new_mint_authority: Pubkey,
    desired_edition: u64,
    win_index: Option<u64>,
) -> Instruction {
    let (config, _) = Pubkey::find_program_address(
        &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            auction_manager.as_ref(),
            safety_deposit_box.as_ref(),
        ],
        &program_id,
    );

    let (prize_tracking_ticket, _) = Pubkey::find_program_address(
        &[
            PREFIX.as_bytes(),
            program_id.as_ref(),
            auction_manager.as_ref(),
            original_mint.as_ref(),
        ],
        &program_id,
    );

    let edition_number = desired_edition
        .checked_div(EDITION_MARKER_BIT_SIZE)
        .unwrap();

    let (edition_mark_pda, _) = Pubkey::find_program_address(
        &[
            spl_token_metadata::state::PREFIX.as_bytes(),
            spl_token_metadata::id().as_ref(),
            original_mint.as_ref(),
            spl_token_metadata::state::EDITION.as_bytes(),
            edition_number.to_string().as_bytes(),
        ],
        &spl_token_metadata::id(),
    );

    let (metadata, _) = Pubkey::find_program_address(
        &[
            spl_token_metadata::state::PREFIX.as_bytes(),
            spl_token_metadata::id().as_ref(),
            original_mint.as_ref(),
        ],
        &spl_token_metadata::id(),
    );

    let (master_edition, _) = Pubkey::find_program_address(
        &[
            spl_token_metadata::state::PREFIX.as_bytes(),
            spl_token_metadata::id().as_ref(),
            original_mint.as_ref(),
            spl_token_metadata::state::EDITION.as_bytes(),
        ],
        &spl_token_metadata::id(),
    );

    let (new_edition, _) = Pubkey::find_program_address(
        &[
            spl_token_metadata::state::PREFIX.as_bytes(),
            spl_token_metadata::id().as_ref(),
            new_mint.as_ref(),
            spl_token_metadata::state::EDITION.as_bytes(),
        ],
        &spl_token_metadata::id(),
    );

    let (extended, _) = Pubkey::find_program_address(
        &[
            spl_auction::PREFIX.as_bytes(),
            spl_auction::id().as_ref(),
            vault.as_ref(),
            spl_auction::EXTENDED.as_bytes(),
        ],
        &spl_auction::id(),
    );

    Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(auction_manager, false),
            AccountMeta::new(safety_deposit_token_store, false),
            AccountMeta::new(destination, false),
            AccountMeta::new(bid_redemption, false),
            AccountMeta::new_readonly(safety_deposit_box, false),
            AccountMeta::new_readonly(vault, false),
            AccountMeta::new(config, false),
            AccountMeta::new_readonly(auction, false),
            AccountMeta::new_readonly(bidder_metadata, false),
            AccountMeta::new_readonly(bidder, true),
            AccountMeta::new(payer, true),
            AccountMeta::new_readonly(spl_token::id(), false),
            AccountMeta::new_readonly(spl_token_vault::id(), false),
            AccountMeta::new_readonly(spl_token_metadata::id(), false),
            AccountMeta::new_readonly(store, false),
            AccountMeta::new_readonly(solana_program::system_program::id(), false),
            AccountMeta::new_readonly(sysvar::rent::id(), false),
            AccountMeta::new_readonly(transfer_authority, true),
            AccountMeta::new(accept_payment, false),
            AccountMeta::new(paying_token_account, false),
            AccountMeta::new(prize_tracking_ticket, false),
            AccountMeta::new(new_metadata, false),
            AccountMeta::new(new_edition, false),
            AccountMeta::new(master_edition, false),
            AccountMeta::new(new_mint, false),
            AccountMeta::new(edition_mark_pda, false),
            AccountMeta::new_readonly(new_mint_authority, true),
            AccountMeta::new_readonly(metadata, false),
            AccountMeta::new_readonly(extended, false),
        ],
        data: MetaplexInstruction::RedeemParticipationBidV3(RedeemParticipationBidV3Args {
            win_index,
        })
        .try_to_vec()
        .unwrap(),
    }
}
