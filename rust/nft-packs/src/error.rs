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

    /// Proved vouchers mismatch pack vouchers
    #[error("Proved vouchers mismatch pack vouchers")]
    ProvedVouchersMismatchPackVouchers,

    /// Pack is already open
    #[error("Pack is already open")]
    PackIsAlreadyOpen,

    /// NFT pack set not fully configured
    #[error("NFT pack set not fully configured")]
    PackSetNotConfigured,

    /// NFT pack set is already activated
    #[error("NFT pack set already activated")]
    PackAlreadyActivated,

    /// NFT pack set is already deactivated
    #[error("NFT pack set already deactivated")]
    PackAlreadyDeactivated,

    /// Pack set should be activated
    #[error("Pack set should be activated")]
    PackSetNotActivated,

    /// Pack is in ended state can't be activated
    #[error("Pack is in ended state can't be activated")]
    PackInEndedState,

    /// Can't change pack data at current state
    #[error("Can't change pack data at current state")]
    WrongPackStateToChangeData,

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

    /// Total packs can't be less then pack cards amount
    #[error("Total packs can't be less then pack cards amount")]
    SmallTotalPacksAmount,

    /// Can't set the same value
    #[error("Can't set the same value")]
    CantSetTheSameValue,

    /// Wrong pack card received
    #[error("Wrong pack card received")]
    WrongPackCard,

    /// Wrong pack voucher received
    #[error("Wrong pack voucher received")]
    WrongPackVoucher,

    /// Max supply can't be less then current supply
    #[error("Max supply can't be less then current supply")]
    SmallMaxSupply,

    /// Wrong max supply value
    #[error("Wrong max supply value")]
    WrongMaxSupply,

    /// Wrong amount of NFTs to open pack
    #[error("Wrong amount of NFTs to open pack")]
    WrongNumberToOpen,

    /// Random oracle updated long time ago
    #[error("Random oracle updated long time ago")]
    RandomOracleOutOfDate,

    /// Card ran out of editions
    #[error("Card ran out of editions")]
    CardDoesntHaveEditions,

    /// User redeemed all allowed cards
    #[error("User redeemed all allowed cards")]
    UserRedeemedAllCards,
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
