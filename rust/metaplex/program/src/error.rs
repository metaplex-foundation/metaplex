//! Error types

use {
    num_derive::FromPrimitive,
    solana_program::{
        decode_error::DecodeError,
        msg,
        program_error::{PrintProgramError, ProgramError},
    },
    thiserror::Error,
};

/// Errors that may be returned by the Metaplex program.
#[derive(Clone, Debug, Eq, Error, FromPrimitive, PartialEq)]
pub enum MetaplexError {
    /// Invalid instruction data passed in.
    #[error("Failed to unpack instruction data")]
    InstructionUnpackError,

    /// Lamport balance below rent-exempt threshold.
    #[error("Lamport balance below rent-exempt threshold")]
    NotRentExempt,

    /// Already initialized
    #[error("Already initialized")]
    AlreadyInitialized,

    /// Uninitialized
    #[error("Uninitialized")]
    Uninitialized,

    /// Account does not have correct owner
    #[error("Account does not have correct owner")]
    IncorrectOwner,

    /// NumericalOverflowError
    #[error("NumericalOverflowError")]
    NumericalOverflowError,

    /// Token transfer failed
    #[error("Token transfer failed")]
    TokenTransferFailed,

    /// Invalid transfer authority provided
    #[error("Invalid transfer authority provided")]
    InvalidTransferAuthority,

    /// Vault's authority does not match the expected pda with seed ['metaplex', auction_key]
    #[error("Vault's authority does not match the expected ['metaplex', auction_key]")]
    VaultAuthorityMismatch,

    /// Auction's authority does not match the expected pda with seed ['metaplex', auction_key]
    #[error(
        "Auction's authority does not match the expected pda with seed ['metaplex', auction_key]"
    )]
    AuctionAuthorityMismatch,

    /// The authority passed to the call does not match the authority on the auction manager!
    #[error(
        "The authority passed to the call does not match the authority on the auction manager!"
    )]
    AuctionManagerAuthorityMismatch,

    /// Vault given does not match that on given auction manager!
    #[error("Vault given does not match that on given auction manager!")]
    AuctionManagerVaultMismatch,

    /// The safety deposit box given does not belong to the given vault!
    #[error("The safety deposit box given does not belong to the given vault!")]
    SafetyDepositBoxVaultMismatch,

    /// The store given does not belong to the safety deposit box given!
    #[error("The store given does not belong to the safety deposit box given!")]
    SafetyDepositBoxStoreMismatch,

    /// The metadata given does not match the mint on the safety deposit box given!
    #[error("The metadata given does not match the mint on the safety deposit box given!")]
    SafetyDepositBoxMetadataMismatch,

    /// The Safety Deposit Box mint does not match the one time auth mint on the master edition
    #[error(
        "The Safety Deposit Box mint does not match the one time auth mint on the master edition!"
    )]
    SafetyDepositBoxMasterEditionOneTimeAuthMintMismatch,

    /// The mint given does not match the mint on the given safety deposit box!
    #[error("The mint given does not match the mint on the given safety deposit box!")]
    SafetyDepositBoxMintMismatch,

    /// The token metadata program given does not match the token metadata program on this auction manager!
    #[error("The token metadata program given does not match the token metadata program on this auction manager!")]
    AuctionManagerTokenMetadataProgramMismatch,

    /// The mint is owned by a different token program than the one used by this auction manager!
    #[error(
        "The mint is owned by a different token program than the one used by this auction manager!"
    )]
    TokenProgramMismatch,

    /// The auction given does not match the auction on the auction manager!
    #[error("The auction given does not match the auction on the auction manager!")]
    AuctionManagerAuctionMismatch,

    /// The auction program given does not match the auction program on the auction manager!
    #[error(
        "The auction program given does not match the auction program on the auction manager!"
    )]
    AuctionManagerAuctionProgramMismatch,

    /// The token program given does not match the token program on the auction manager!
    #[error("The token program given does not match the token program on the auction manager!")]
    AuctionManagerTokenProgramMismatch,

    /// The token vault program given does not match the token vault program on the auction manager!
    #[error("The token vault program given does not match the token vault program on the auction manager!")]
    AuctionManagerTokenVaultProgramMismatch,

    /// Only combined vaults may be used in auction managers!
    #[error("Only combined vaults may be used in auction managers!")]
    VaultNotCombined,

    /// Cannot auction off an empty vault!
    #[error("Cannot auction off an empty vault!")]
    VaultCannotEmpty,

    /// Listed a safety deposit box index that does not exist in this vault
    #[error("Listed a safety deposit box index that does not exist in this vault")]
    InvalidSafetyDepositBox,

    /// Cant use a limited supply edition for an open edition as you may run out of editions to print
    #[error("Cant use a limited supply edition for an open edition as you may run out of editions to print")]
    CantUseLimitedSupplyEditionsWithOpenEditionAuction,

    /// This safety deposit box is not listed as a prize in this auction manager!
    #[error("This safety deposit box is not listed as a prize in this auction manager!")]
    SafetyDepositBoxNotUsedInAuction,

    /// Either you have given a non-existent edition address or you have given the address to a different token-metadata program than was used to make this edition!
    #[error("Either you have given a non-existent edition address or you have given the address to a different token-metadata program than was used to make this edition!")]
    InvalidEditionAddress,

    /// There are not enough editions available for this auction!
    #[error("There are not enough editions available for this auction!")]
    NotEnoughEditionsAvailableForAuction,

    /// The store in the safety deposit is empty, so you have nothing to auction!
    #[error("The store in the safety deposit is empty, so you have nothing to auction!")]
    StoreIsEmpty,

    /// Not enough tokens to supply winners!
    #[error("Not enough tokens to supply winners!")]
    NotEnoughTokensToSupplyWinners,

    /// The auction manager must own the payoff account!
    #[error("The auction manager must own the payoff account!")]
    AuctionManagerMustOwnPayoffAccount,

    /// The auction manager must own the oustanding shares  account!
    #[error("The auction manager must own the oustanding shares account!")]
    AuctionManagerMustOwnOutstandingSharesAccount,

    /// The safety deposit box for your winning bid or participation placement does not match the safety deposit box you provided!
    #[error("The safety deposit box for your winning bid or participation placement does not match the safety deposit box you provided!")]
    SafetyDepositIndexMismatch,

    /// This prize has already been claimed!
    #[error("This prize has already been claimed!")]
    PrizeAlreadyClaimed,

    /// The bid redemption key does not match the expected PDA with seed ['metaplex', auction key, bidder metadata key]
    #[error("The bid redemption key does not match the expected PDA with seed ['metaplex', auction key, bidder metadata key]")]
    BidRedemptionMismatch,

    /// This bid has already been redeemed!
    #[error("This bid has already been redeemed!")]
    BidAlreadyRedeemed,

    /// Auction has not ended yet!
    #[error("Auction has not ended yet!")]
    AuctionHasNotEnded,

    /// The original authority lookup does not match the expected PDA of ['metaplex', auction key, metadata key]
    #[error("The original authority lookup does not match the expected PDA of ['metaplex', auction key, metadata key]")]
    OriginalAuthorityLookupKeyMismatch,

    /// The original authority given does not match that on the original authority lookup account!
    #[error("The original authority given does not match that on the original authority lookup account!")]
    OriginalAuthorityMismatch,

    /// The prize you are attempting to claim needs to be claimed from a different endpoint than this one.
    #[error("The prize you are attempting to claim needs to be claimed from a different endpoint than this one.")]
    WrongBidEndpointForPrize,

    /// The bidder given is not the bidder on the bidder metadata!
    #[error("The bidder given is not the bidder on the bidder metadata!")]
    BidderMetadataBidderMismatch,

    /// Printing mint given does not match the mint on master edition!
    #[error("Printing mint given does not match the mint on master edition!")]
    MasterEditionMintMismatch,

    /// One Time Auth mint given does not match the mint on master edition!
    #[error("One Time Auth mint given does not match the mint on master edition!")]
    MasterEditionOneTimeAuthMintMismatch,

    /// The printing token account must be of the printing mint type to hold authorization tokens after auction end
    #[error("The printing token account must be of the printing mint type to hold authorization tokens after auction end")]
    PrintingTokenAccountMintMismatch,

    /// Destination does not have the proper mint!
    #[error("Destination does not have the proper mint!")]
    DestinationMintMismatch,

    /// Invalid edition key
    #[error("Invalid edition key")]
    InvalidEditionKey,

    /// Token mint to failed
    #[error("Token mint to failed")]
    TokenMintToFailed,

    /// The Printing mint authority provided does not match that on the mint
    #[error("The Printing mint authority provided does not match that on the mint")]
    MasterMintAuthorityMismatch,

    /// The safety deposit box is not using the one time authorization mint of the master edition
    #[error(
        "The safety deposit box is not using the one time authorization mint of the master edition"
    )]
    MasterEditionOneTimeAuthorizationMintMismatch,

    /// The accept payment account for this auction manager must match the auction's token mint!
    #[error(
        "The accept payment account for this auction manager must match the auction's token mint!"
    )]
    AuctionAcceptPaymentMintMismatch,

    /// The accept payment owner must be the auction manager!
    #[error("The accept payment owner must be the auction manager!")]
    AcceptPaymentOwnerMismatch,

    /// The accept payment given does not match the accept payment account on the auction manager!
    #[error("The accept payment given does not match the accept payment account on the auction manager!")]
    AcceptPaymentMismatch,

    /// You are not eligible for an participation NFT!
    #[error("You are not eligible for a participation NFT!")]
    NotEligibleForParticipation,

    #[error("Auction manager must be validated to start auction!")]
    /// Auction manager must be validated to start auction!
    AuctionManagerMustBeValidated,

    /// The safety deposit mint type must be the Printing mint of the limited edition!
    #[error("The safety deposit mint type must be the Printing mint of the limited edition!")]
    SafetyDepositBoxMasterMintMismatch,

    /// The mints between the accept payment and account provided do not match
    #[error("The mints between the accept payment and account provided do not match")]
    AcceptPaymentMintMismatch,

    /// You do not have enough to buy this participation NFT!
    #[error("You do not have enough to buy this participation NFT!")]
    NotEnoughBalanceForParticipation,

    /// Derived key invalid
    #[error("Derived key invalid")]
    DerivedKeyInvalid,

    /// Creator is not active on this store!
    #[error("Creator is not active on this store!")]
    WhitelistedCreatorInactive,

    /// This creator is not whitelisted
    #[error("This creator is not whitelisted")]
    InvalidWhitelistedCreator,

    /// Store given does not match store on auction manager!
    #[error("Store given does not match store on auction manager!")]
    AuctionManagerStoreMismatch,

    /// Supplied an invalid creator index to empty payment account
    #[error("Supplied an invalid creator index to empty payment account")]
    InvalidCreatorIndex,

    /// Supplied an invalid winning config index
    #[error("Supplied an invalid winning config index")]
    InvalidWinningConfigIndex,

    /// Metadata has creators and no creator index was supplied!
    #[error("Metadata has creators and no creator index was supplied!")]
    CreatorIndexExpected,

    /// This winning config does not contain this safety deposit box as one of it's prizes
    #[error("This winning config does not contain this safety deposit box as one of it's prizes")]
    WinningConfigSafetyDepositMismatch,

    /// The participation prize does not match the safety deposit given
    #[error("The participation prize does not match the safety deposit given")]
    ParticipationSafetyDepositMismatch,

    /// Participation NFT not present on this auction, so cannot collect money for it
    #[error("Participation NFT not present on this auction, so cannot collect money for it")]
    ParticipationNotPresent,

    /// Not possible to settle until all bids have been claimed
    #[error("Not possible to settle until all bids have been claimed")]
    NotAllBidsClaimed,

    /// Invalid winning config item index provided
    #[error("Invalid winning config item index provided")]
    InvalidWinningConfigItemIndex,

    /// When using a one time authorization token in a winning config item, you can never have amount > 1
    #[error("When using a one time authorization token in a winning config item, you can never have amount > 1")]
    OneTimeAuthorizationTokenMustBeOne,

    /// Adding a reservation list failed
    #[error("Adding a reservation list failed")]
    AddReservationListFailed,

    /// Close account command failed
    #[error("Close account command failed")]
    CloseAccountFailed,

    /// A creator on this metadata has not verified it
    #[error("A creator on this metadata has not verified it")]
    CreatorHasNotVerifiedMetadata,

    /// Duplicate winning config item detected
    #[error("Duplicate winning config item detected")]
    DuplicateWinningConfigItemDetected,

    /// The authorization account provided does not match that on the participation state
    #[error("The authorization account provided does not match that on the participation state")]
    PrintingAuthorizationTokenAccountMismatch,

    /// The transient account provided does not have the correct mint
    #[error("The transient account provided does not have the correct mint")]
    TransientAuthAccountMintMismatch,

    /// The participation printing authorization token account is empty. One person needs to call populate on it!
    #[error("The participation printing authorization token account is empty. One person needs to call populate on it!")]
    ParticipationPrintingEmpty,

    /// The printing authorization token command failed
    #[error("The printing authorization token command failed")]
    PrintingAuthorizationTokensFailed,

    /// Invalid token program
    #[error("Invalid token program")]
    InvalidTokenProgram,

    /// Token metadata program does not match
    #[error("Token metadata program does not match")]
    AuctionManagerTokenMetadataMismatch,

    /// This safety deposit box has already been validated
    #[error("This safety deposit box has already been validated")]
    AlreadyValidated,

    /// Auction must be created
    #[error("Auction must be created")]
    AuctionMustBeCreated,

    /// Accept payment delegate should be none
    #[error("Accept payment delegate should be none")]
    DelegateShouldBeNone,

    /// Accept payment close authority should be none
    #[error("Accept payment close authority should be none")]
    CloseAuthorityShouldBeNone,

    /// Data type mismatch
    #[error("Data type mismatch")]
    DataTypeMismatch,

    /// Auctioneer can't claim a won prize
    #[error("Auctioneer can't claim a won prize")]
    AuctioneerCantClaimWonPrize,

    /// Auctioneer is the only one who can override win indices
    #[error("Auctioneer is the only one who can override win indices")]
    MustBeAuctioneer,

    /// The auction provided has a different amount of winners set than does the auction manager settings
    #[error("The auction provided has a different amount of winners set than does the auction manager settings")]
    WinnerAmountMismatch,
}

impl PrintProgramError for MetaplexError {
    fn print<E>(&self) {
        msg!(&self.to_string());
    }
}

impl From<MetaplexError> for ProgramError {
    fn from(e: MetaplexError) -> Self {
        ProgramError::Custom(e as u32)
    }
}

impl<T> DecodeError<T> for MetaplexError {
    fn type_of() -> &'static str {
        "Metaplex Error"
    }
}
