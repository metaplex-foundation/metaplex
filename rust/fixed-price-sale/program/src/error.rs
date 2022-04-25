//! Module provide program defined errors

use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    // 6000
    #[msg("No valid signer present")]
    NoValidSignerPresent,
    // 6001
    #[msg("Some string variable is longer than allowed")]
    StringIsTooLong,
    // 6002
    #[msg("Name string variable is longer than allowed")]
    NameIsTooLong,
    // 6003
    #[msg("Description string variable is longer than allowed")]
    DescriptionIsTooLong,
    // 6004
    #[msg("Provided supply is gt than available")]
    SupplyIsGtThanAvailable,
    // 6005
    #[msg("Supply is not provided")]
    SupplyIsNotProvided,
    // 6006
    #[msg("Derived key invalid")]
    DerivedKeyInvalid,
    // 6007
    #[msg("Invalid selling resource owner provided")]
    SellingResourceOwnerInvalid,
    // 6008
    #[msg("PublicKeyMismatch")]
    PublicKeyMismatch,
    // 6009
    #[msg("Pieces in one wallet cannot be greater than Max Supply value")]
    PiecesInOneWalletIsTooMuch,
    // 6010
    #[msg("StartDate cannot be in the past")]
    StartDateIsInPast,
    // 6011
    #[msg("EndDate should not be earlier than StartDate")]
    EndDateIsEarlierThanBeginDate,
    // 6012
    #[msg("Incorrect account owner")]
    IncorrectOwner,
    // 6013
    #[msg("Market is not started")]
    MarketIsNotStarted,
    // 6014
    #[msg("Market is ended")]
    MarketIsEnded,
    // 6015
    #[msg("User reach buy limit")]
    UserReachBuyLimit,
    // 6016
    #[msg("Math overflow")]
    MathOverflow,
    // 6017
    #[msg("Supply is gt than max supply")]
    SupplyIsGtThanMaxSupply,
    // 6018
    #[msg("Market duration is not unlimited")]
    MarketDurationIsNotUnlimited,
    // 6019
    #[msg("Market is suspended")]
    MarketIsSuspended,
    // 6020
    #[msg("Market is immutable")]
    MarketIsImmutable,
    // 6021
    #[msg("Market in invalid state")]
    MarketInInvalidState,
    // 6022
    #[msg("Price is zero")]
    PriceIsZero,
    // 6023
    #[msg("Funder is invalid")]
    FunderIsInvalid,
    // 6024
    #[msg("Payout ticket exists")]
    PayoutTicketExists,
    // 6025
    #[msg("Funder provide invalid destination")]
    InvalidFunderDestination,
    // 6026
    #[msg("Treasury is not empty")]
    TreasuryIsNotEmpty,
    // 6027
    #[msg("Selling resource in invalid state")]
    SellingResourceInInvalidState,
    // 6028
    #[msg("Metadata creators is empty")]
    MetadataCreatorsIsEmpty,
    // 6029
    #[msg("User wallet must match user token account")]
    UserWalletMustMatchUserTokenAccount,
    // 6030
    #[msg("Metadata should be mutable")]
    MetadataShouldBeMutable,
    // 6031
    #[msg("Primary sale is not allowed")]
    PrimarySaleIsNotAllowed,
    // 6032
    #[msg("Creators is gt than allowed")]
    CreatorsIsGtThanAvailable,
    // 6033
    #[msg("Creators is empty")]
    CreatorsIsEmpty,
    // 6034
    #[msg("Market owner doesn't receive shares at primary sale")]
    MarketOwnerDoesntHaveShares,
    // 6035
    #[msg("PrimaryMetadataCreatorsNotProvided")]
    PrimaryMetadataCreatorsNotProvided,
    // 6036
    #[msg("Gating token is missing")]
    GatingTokenMissing,
    // 6037
    #[msg("Invalid program owner for the gating token account")]
    InvalidOwnerForGatingToken,
    // 6038
    #[msg("Wrong Metadata account for the gating token")]
    WrongGatingMetadataAccount,
    // 6039
    #[msg("Wrong owner in token gating account")]
    WrongOwnerInTokenGatingAcc,
    // 6040
    #[msg("Wrong gating date send")]
    WrongGatingDate,
    // 6041
    #[msg("Collection mint is missing")]
    CollectionMintMissing,
    // 6042
    #[msg("Wrong collection mint key")]
    WrongCollectionMintKey,
}
