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

/// Errors that may be returned by the Metadata program.
#[derive(Clone, Debug, Eq, Error, FromPrimitive, PartialEq)]
pub enum MetadataError {
    /// Failed to unpack instruction data
    #[error("Failed to unpack instruction data")]
    InstructionUnpackError,

    /// Failed to pack instruction data
    #[error("Failed to pack instruction data")]
    InstructionPackError,

    /// Lamport balance below rent-exempt threshold.
    #[error("Lamport balance below rent-exempt threshold")]
    NotRentExempt,

    /// Already initialized
    #[error("Already initialized")]
    AlreadyInitialized,

    /// Uninitialized
    #[error("Uninitialized")]
    Uninitialized,

    ///  Metadata's key must match seed of ['metadata', program id, mint] provided
    #[error(" Metadata's key must match seed of ['metadata', program id, mint] provided")]
    InvalidMetadataKey,

    ///  Edition's key must match seed of ['metadata', program id, name, 'edition'] provided
    #[error("Edition's key must match seed of ['metadata', program id, name, 'edition'] provided")]
    InvalidEditionKey,

    /// Update Authority given does not match
    #[error("Update Authority given does not match")]
    UpdateAuthorityIncorrect,

    /// Update Authority needs to be signer to update  metadata
    #[error("Update Authority needs to be signer to update metadata")]
    UpdateAuthorityIsNotSigner,

    /// You must be the mint authority and signer on this transaction
    #[error("You must be the mint authority and signer on this transaction")]
    NotMintAuthority,

    /// Mint authority provided does not match the authority on the mint
    #[error("Mint authority provided does not match the authority on the mint")]
    InvalidMintAuthority,

    /// Name too long
    #[error("Name too long")]
    NameTooLong,

    /// Symbol too long
    #[error("Symbol too long")]
    SymbolTooLong,

    /// URI too long
    #[error("URI too long")]
    UriTooLong,

    /// Update authority must be equivalent to the metadata's authority and also signer of this transaction
    #[error("Update authority must be equivalent to the metadata's authority and also signer of this transaction")]
    UpdateAuthorityMustBeEqualToMetadataAuthorityAndSigner,

    /// Mint given does not match mint on Metadata
    #[error("Mint given does not match mint on Metadata")]
    MintMismatch,

    /// Editions must have exactly one token
    #[error("Editions must have exactly one token")]
    EditionsMustHaveExactlyOneToken,

    /// Maximum editions printed already
    #[error("Maximum editions printed already")]
    MaxEditionsMintedAlready,

    /// Token mint to failed
    #[error("Token mint to failed")]
    TokenMintToFailed,

    /// The master edition record passed must match the master record on the edition given
    #[error("The master edition record passed must match the master record on the edition given")]
    MasterRecordMismatch,

    /// The destination account does not have the right mint
    #[error("The destination account does not have the right mint")]
    DestinationMintMismatch,

    /// An edition can only mint one of its kind!
    #[error("An edition can only mint one of its kind!")]
    EditionAlreadyMinted,

    /// Printing mint decimals should be zero
    #[error("Printing mint decimals should be zero")]
    PrintingMintDecimalsShouldBeZero,

    /// OneTimePrintingAuthorizationMint mint decimals should be zero
    #[error("OneTimePrintingAuthorization mint decimals should be zero")]
    OneTimePrintingAuthorizationMintDecimalsShouldBeZero,

    /// Edition mint decimals should be zero
    #[error("EditionMintDecimalsShouldBeZero")]
    EditionMintDecimalsShouldBeZero,

    /// Token burn failed
    #[error("Token burn failed")]
    TokenBurnFailed,

    /// The One Time authorization mint does not match that on the token account!
    #[error("The One Time authorization mint does not match that on the token account!")]
    TokenAccountOneTimeAuthMintMismatch,

    /// Derived key invalid
    #[error("Derived key invalid")]
    DerivedKeyInvalid,

    /// The Printing mint does not match that on the master edition!
    #[error("The Printing mint does not match that on the master edition!")]
    PrintingMintMismatch,

    /// The  One Time Printing Auth mint does not match that on the master edition!
    #[error("The One Time Printing Auth mint does not match that on the master edition!")]
    OneTimePrintingAuthMintMismatch,

    /// The mint of the token account does not match the Printing mint!
    #[error("The mint of the token account does not match the Printing mint!")]
    TokenAccountMintMismatch,

    /// The mint of the token account does not match the master metadata mint!
    #[error("The mint of the token account does not match the master metadata mint!")]
    TokenAccountMintMismatchV2,

    /// Not enough tokens to mint a limited edition
    #[error("Not enough tokens to mint a limited edition")]
    NotEnoughTokens,

    /// The mint on your authorization token holding account does not match your Printing mint!
    #[error(
        "The mint on your authorization token holding account does not match your Printing mint!"
    )]
    PrintingMintAuthorizationAccountMismatch,

    /// The authorization token account has a different owner than the update authority for the master edition!
    #[error("The authorization token account has a different owner than the update authority for the master edition!")]
    AuthorizationTokenAccountOwnerMismatch,

    /// This feature is currently disabled.
    #[error("This feature is currently disabled.")]
    Disabled,

    /// Creators list too long
    #[error("Creators list too long")]
    CreatorsTooLong,

    /// Creators must be at least one if set
    #[error("Creators must be at least one if set")]
    CreatorsMustBeAtleastOne,

    /// If using a creators array, you must be one of the creators listed
    #[error("If using a creators array, you must be one of the creators listed")]
    MustBeOneOfCreators,

    /// This metadata does not have creators
    #[error("This metadata does not have creators")]
    NoCreatorsPresentOnMetadata,

    /// This creator address was not found
    #[error("This creator address was not found")]
    CreatorNotFound,

    /// Basis points cannot be more than 10000
    #[error("Basis points cannot be more than 10000")]
    InvalidBasisPoints,

    /// Primary sale can only be flipped to true and is immutable
    #[error("Primary sale can only be flipped to true and is immutable")]
    PrimarySaleCanOnlyBeFlippedToTrue,

    /// Owner does not match that on the account given
    #[error("Owner does not match that on the account given")]
    OwnerMismatch,

    /// This account has no tokens to be used for authorization
    #[error("This account has no tokens to be used for authorization")]
    NoBalanceInAccountForAuthorization,

    /// Share total must equal 100 for creator array
    #[error("Share total must equal 100 for creator array")]
    ShareTotalMustBe100,

    /// This reservation list already exists!
    #[error("This reservation list already exists!")]
    ReservationExists,

    /// This reservation list does not exist!
    #[error("This reservation list does not exist!")]
    ReservationDoesNotExist,

    /// This reservation list exists but was never set with reservations
    #[error("This reservation list exists but was never set with reservations")]
    ReservationNotSet,

    /// This reservation list has already been set!
    #[error("This reservation list has already been set!")]
    ReservationAlreadyMade,

    /// Provided more addresses than max allowed in single reservation
    #[error("Provided more addresses than max allowed in single reservation")]
    BeyondMaxAddressSize,

    /// NumericalOverflowError
    #[error("NumericalOverflowError")]
    NumericalOverflowError,

    /// This reservation would go beyond the maximum supply of the master edition!
    #[error("This reservation would go beyond the maximum supply of the master edition!")]
    ReservationBreachesMaximumSupply,

    /// Address not in reservation!
    #[error("Address not in reservation!")]
    AddressNotInReservation,

    /// You cannot unilaterally verify another creator, they must sign
    #[error("You cannot unilaterally verify another creator, they must sign")]
    CannotVerifyAnotherCreator,

    /// You cannot unilaterally unverify another creator
    #[error("You cannot unilaterally unverify another creator")]
    CannotUnverifyAnotherCreator,

    /// In initial reservation setting, spots remaining should equal total spots
    #[error("In initial reservation setting, spots remaining should equal total spots")]
    SpotMismatch,

    /// Incorrect account owner
    #[error("Incorrect account owner")]
    IncorrectOwner,

    /// printing these tokens would breach the maximum supply limit of the master edition
    #[error("printing these tokens would breach the maximum supply limit of the master edition")]
    PrintingWouldBreachMaximumSupply,

    /// Data is immutable
    #[error("Data is immutable")]
    DataIsImmutable,

    /// No duplicate creator addresses
    #[error("No duplicate creator addresses")]
    DuplicateCreatorAddress,

    /// Reservation spots remaining should match total spots when first being created
    #[error("Reservation spots remaining should match total spots when first being created")]
    ReservationSpotsRemainingShouldMatchTotalSpotsAtStart,

    /// Invalid token program
    #[error("Invalid token program")]
    InvalidTokenProgram,

    /// Data type mismatch
    #[error("Data type mismatch")]
    DataTypeMismatch,

    /// Beyond alotted address size in reservation!
    #[error("Beyond alotted address size in reservation!")]
    BeyondAlottedAddressSize,

    /// The reservation has only been partially alotted
    #[error("The reservation has only been partially alotted")]
    ReservationNotComplete,

    /// You cannot splice over an existing reservation!
    #[error("You cannot splice over an existing reservation!")]
    TriedToReplaceAnExistingReservation,

    /// Invalid operation
    #[error("Invalid operation")]
    InvalidOperation,

    /// Invalid owner
    #[error("Invalid Owner")]
    InvalidOwner,

    /// Printing mint supply must be zero for conversion
    #[error("Printing mint supply must be zero for conversion")]
    PrintingMintSupplyMustBeZeroForConversion,

    /// One Time Auth mint supply must be zero for conversion
    #[error("One Time Auth mint supply must be zero for conversion")]
    OneTimeAuthMintSupplyMustBeZeroForConversion,

    /// You tried to insert one edition too many into an edition mark pda
    #[error("You tried to insert one edition too many into an edition mark pda")]
    InvalidEditionIndex,

    // In the legacy system the reservation needs to be of size one for cpu limit reasons
    #[error("In the legacy system the reservation needs to be of size one for cpu limit reasons")]
    ReservationArrayShouldBeSizeOne,
}

impl PrintProgramError for MetadataError {
    fn print<E>(&self) {
        msg!(&self.to_string());
    }
}

impl From<MetadataError> for ProgramError {
    fn from(e: MetadataError) -> Self {
        ProgramError::Custom(e as u32)
    }
}

impl<T> DecodeError<T> for MetadataError {
    fn type_of() -> &'static str {
        "Metadata Error"
    }
}
