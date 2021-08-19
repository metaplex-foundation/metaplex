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
    /// Total packs amount should be more then 0
    #[error("Total packs amount should be more then 0")]
    WrongTotalPacksAmount,

    /// NFT pack set not fully configured
    #[error("NFT pack set not fully configured")]
    PackSetNotConfigured,

    /// NFT pack set is already activated
    #[error("NFT pack set already activated")]
    PackAlreadyActivated,

    /// NFT pack set is already deactivated
    #[error("NFT pack set already deactivated")]
    PackAlreadyDeactivated,
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
