//! Error types

use num_derive::FromPrimitive;
use num_traits::FromPrimitive;
use solana_program::{
    decode_error::DecodeError,
    msg,
    program_error::{PrintProgramError, ProgramError},
};
use thiserror::Error;

/// Errors that may be returned by the Metaplex NFT packs program.
#[derive(Clone, Debug, Eq, Error, FromPrimitive, PartialEq)]
pub enum NFTPacksError {
    /// Allowed amount to redeem should be more then 0
    #[error("Allowed amount to redeem should be more then 0")]
    WrongAllowedAmountToRedeem,

    /// Wrong redeem date
    #[error("Wrong redeem date")]
    WrongRedeemDate,

    /// Card probability is missing
    #[error("Card probability is missing")]
    CardProbabilityMissing,

    /// Wrong card probability value
    #[error("Wrong card probability value")]
    WrongCardProbability,

    /// Cards for this pack shouldn't have probability value
    #[error("Cards for this pack shouldn't have probability value")]
    CardShouldntHaveProbabilityValue,

    /// Proved vouchers mismatch pack vouchers
    #[error("Proved vouchers mismatch pack vouchers")]
    ProvedVouchersMismatchPackVouchers,

    /// Pack is already ended
    #[error("Pack is already ended")]
    PackIsAlreadyEnded,

    /// NFT pack set not fully configured
    #[error("NFT pack set not fully configured")]
    PackSetNotConfigured,

    /// Can't activate NFT pack in current state
    #[error("Can't activate NFT pack in current state")]
    CantActivatePack,

    /// Pack set should be activated
    #[error("Pack set should be activated")]
    PackSetNotActivated,

    /// Proving process for this pack is completed
    #[error("Proving process for this pack is completed")]
    ProvingPackProcessCompleted,

    /// Proving process for this voucher is completed
    #[error("Proving process for this voucher is completed")]
    ProvingVoucherProcessCompleted,

    /// Received edition from wrong master
    #[error("Received edition from wrong master")]
    WrongEdition,

    /// Received wrong edition mint
    #[error("Received wrong edition mint")]
    WrongEditionMint,

    /// Overflow
    #[error("Overflow")]
    Overflow,

    /// Underflow
    #[error("Underflow")]
    Underflow,

    /// Pack set should be empty to delete it
    #[error("Pack set should be empty to delete it")]
    NotEmptyPackSet,

    /// Wrong pack state to change data
    #[error("Wrong pack state to change data")]
    WrongPackState,

    /// Pack set is immutable
    #[error("Pack set is immutable")]
    ImmutablePackSet,

    /// Can't set the same value
    #[error("Can't set the same value")]
    CantSetTheSameValue,

    /// Wrong max supply value
    #[error("Wrong max supply value")]
    WrongMaxSupply,

    /// Voucher should have supply greater then 0
    #[error("Voucher should have supply greater then 0")]
    WrongVoucherSupply,

    /// Card ran out of editions
    #[error("Card ran out of editions")]
    CardDoesntHaveEditions,

    /// User redeemed all allowed cards
    #[error("User redeemed all allowed cards")]
    UserRedeemedAllCards,

    /// URI too long
    #[error("URI too long")]
    UriTooLong,

    /// Card doesn't have max supply
    #[error("Card doesn't have max supply")]
    CardDoesntHaveMaxSupply,

    /// Master edition should have unlimited supply
    #[error("Master edition should have unlimited supply")]
    WrongMasterSupply,

    /// Pack set doesn't have total editions
    #[error("Pack set doesn't have total editions")]
    MissingEditionsInPack,

    /// User already got next card to redeem
    #[error("User already got next card to redeem")]
    AlreadySetNextCardToRedeem,

    /// Can't close the pack before end date
    #[error("Can't close the pack before end date")]
    EndDateNotArrived,

    /// Pack description too long
    #[error("Pack description too long")]
    DescriptionTooLong,

    /// Whitelisted creator inactive
    #[error("Whitelisted creator inactive")]
    WhitelistedCreatorInactive,

    /// Wrong whitelisted creator address
    #[error("Wrong whitelisted creator address")]
    WrongWhitelistedCreator,

    /// Voucher owner mismatch
    #[error("Voucher owner mismatch")]
    WrongVoucherOwner,

    /// Cards for this pack shouldn't have supply value
    #[error("Cards for this pack shouldn't have supply value")]
    CardShouldntHaveSupplyValue,

    /// Pack is already full of cards
    #[error("Pack is already full of cards")]
    PackIsFullWithCards,

    /// Card weights should be cleaned up
    #[error("Card weights should be cleaned up")]
    WeightsNotCleanedUp,

    /// User already redeemed this card
    #[error("User already redeemed this card")]
    CardAlreadyRedeemed,

    /// User can't redeem this card
    #[error("User can't redeem this card")]
    UserCantRedeemThisCard,

    /// Invalid weight position
    #[error("Invalid weight position")]
    InvalidWeightPosition,
}

impl From<NFTPacksError> for ProgramError {
    fn from(e: NFTPacksError) -> Self {
        ProgramError::Custom(e as u32)
    }
}

impl<T> DecodeError<T> for NFTPacksError {
    fn type_of() -> &'static str {
        "NFTPacksError"
    }
}

impl PrintProgramError for NFTPacksError {
    fn print<E>(&self)
    where
        E: 'static + std::error::Error + DecodeError<E> + PrintProgramError + FromPrimitive,
    {
        msg!(&self.to_string())
    }
}
