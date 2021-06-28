use {
    num_derive::FromPrimitive,
    solana_program::{
        decode_error::DecodeError,
        msg,
        program_error::{PrintProgramError, ProgramError},
    },
    thiserror::Error,
};

/// Errors that may be returned by the Auction program.
#[derive(Clone, Debug, Eq, Error, FromPrimitive, PartialEq)]
pub enum AuctionError {
    /// Account does not have correct owner
    #[error("Account does not have correct owner")]
    IncorrectOwner,

    /// Lamport balance below rent-exempt threshold.
    #[error("Lamport balance below rent-exempt threshold")]
    NotRentExempt,

    /// Bid account provided does not match the derived address.
    #[error("Bid account provided does not match the derived address.")]
    InvalidBidAccount,

    /// Auction account specified is invalid.
    #[error("Auction account specified is invalid.")]
    InvalidAuctionAccount,

    /// Balance too low to make bid.
    #[error("Balance too low to make bid.")]
    BalanceTooLow,

    /// Auction is not currently running.
    #[error("Auction is not currently running.")]
    InvalidState,

    /// Bid is too small.
    #[error("Bid is too small.")]
    BidTooSmall,

    /// Invalid transition, auction state may only transition: Created -> Started -> Stopped
    #[error("Invalid auction state transition.")]
    AuctionTransitionInvalid,

    /// Failed to derive an account from seeds.
    #[error("Failed to derive an account from seeds.")]
    DerivedKeyInvalid,

    /// Token transfer failed
    #[error("Token transfer failed")]
    TokenTransferFailed,

    /// Token mint to failed
    #[error("Token mint to failed")]
    TokenMintToFailed,

    /// Token burn failed
    #[error("Token burn failed")]
    TokenBurnFailed,

    /// Invalid authority
    #[error("Invalid authority")]
    InvalidAuthority,

    /// Authority not signer
    #[error("Authority not signer")]
    AuthorityNotSigner,

    /// Numerical overflow
    #[error("Numerical overflow")]
    NumericalOverflowError,

    /// Bidder pot token account does not match
    #[error("Bidder pot token account does not match")]
    BidderPotTokenAccountOwnerMismatch,

    /// Uninitialized
    #[error("Uninitialized")]
    Uninitialized,

    /// Metadata account is missing or invalid.
    #[error("Metadata account is missing or invalid.")]
    MetadataInvalid,

    /// Bidder pot is missing, and required for SPL trades.
    #[error("Bidder pot is missing, and required for SPL trades.")]
    BidderPotDoesNotExist,

    /// Existing Bid is already active.
    #[error("Existing Bid is already active.")]
    BidAlreadyActive,

    /// Incorrect mint specified, must match auction.
    #[error("Incorrect mint specified, must match auction.")]
    IncorrectMint,

    /// Must reveal price when ending a blinded auction.
    #[error("Must reveal price when ending a blinded auction.")]
    MustReveal,

    /// The revealing hash is invalid.
    #[error("The revealing hash is invalid.")]
    InvalidReveal,

    /// The pot for this bid is already empty.
    #[error("The pot for this bid is already empty.")]
    BidderPotEmpty,

    /// This is not a valid token program
    #[error(" This is not a valid token program")]
    InvalidTokenProgram,

    /// Accept payment delegate should be none
    #[error("Accept payment delegate should be none")]
    DelegateShouldBeNone,

    /// Accept payment close authority should be none
    #[error("Accept payment close authority should be none")]
    CloseAuthorityShouldBeNone,

    /// Data type mismatch
    #[error("Data type mismatch")]
    DataTypeMismatch,

    /// Bid must be multiple of tick size
    #[error("Bid must be multiple of tick size")]
    BidMustBeMultipleOfTickSize,

    /// During the gap window, gap between next lowest bid must be of a certain percentage
    #[error("During the gap window, gap between next lowest bid must be of a certain percentage")]
    GapBetweenBidsTooSmall,

    /// Gap tick size percentage must be between 0 and 100
    #[error("Gap tick size percentage must be between 0 and 100")]
    InvalidGapTickSizePercentage,
}

impl PrintProgramError for AuctionError {
    fn print<E>(&self) {
        msg!(&self.to_string());
    }
}

impl From<AuctionError> for ProgramError {
    fn from(e: AuctionError) -> Self {
        ProgramError::Custom(e as u32)
    }
}

impl<T> DecodeError<T> for AuctionError {
    fn type_of() -> &'static str {
        "Vault Error"
    }
}
