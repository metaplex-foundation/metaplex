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

/// Errors that may be returned by the Vault program.
#[derive(Clone, Debug, Eq, Error, FromPrimitive, PartialEq)]
pub enum VaultError {
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

    /// Provided token account contains no tokens
    #[error("Provided token account contains no tokens")]
    TokenAccountContainsNoTokens,

    /// Provided token account cannot provide amount specified
    #[error("Provided token account cannot provide amount specified")]
    TokenAccountAmountLessThanAmountSpecified,

    /// Provided vault account contains is not empty
    #[error("Provided vault account contains is not empty")]
    VaultAccountIsNotEmpty,

    /// Provided vault account is not owned by program
    #[error("Provided vault account is not owned by program derived address with seed of prefix and program id")]
    VaultAccountIsNotOwnedByProgram,

    /// The provided safety deposit account address does not match the expected program derived address
    #[error(
        "The provided safety deposit account address does not match the expected program derived address"
    )]
    SafetyDepositAddressInvalid,

    /// Token transfer failed
    #[error("Token transfer failed")]
    TokenTransferFailed,
    /// Token mint to failed
    #[error("Token mint to failed")]
    TokenMintToFailed,
    /// Token burn failed
    #[error("Token burn failed")]
    TokenBurnFailed,

    /// Vault mint not empty on int
    #[error("Vault mint not empty on init")]
    VaultMintNotEmpty,

    /// Vault mint's authority not set to program
    #[error("Vault mint's authority not set to program PDA with seed of prefix and program id")]
    VaultAuthorityNotProgram,

    /// Vault treasury not empty on init
    #[error("Vault treasury not empty on init")]
    TreasuryNotEmpty,

    /// Vault treasury's owner not set to program
    #[error("Vault treasury's owner not set to program pda with seed of prefix and program id")]
    TreasuryOwnerNotProgram,

    /// Vault should be inactive
    #[error("Vault should be inactive")]
    VaultShouldBeInactive,

    /// Vault should be active
    #[error("Vault should be active")]
    VaultShouldBeActive,

    /// Vault should be combined
    #[error("Vault should be combined")]
    VaultShouldBeCombined,

    /// Vault treasury needs to match fraction mint
    #[error("Vault treasury needs to match fraction mint")]
    VaultTreasuryMintDoesNotMatchVaultMint,

    /// Redeem Treasury cannot be same mint as fraction
    #[error("Redeem Treasury cannot be same mint as fraction")]
    RedeemTreasuryCantShareSameMintAsFraction,

    /// Invalid program authority provided
    #[error("Invalid program authority provided")]
    InvalidAuthority,

    /// Redeem treasury mint must match lookup mint
    #[error("Redeem treasury mint must match lookup mint")]
    RedeemTreasuryMintMustMatchLookupMint,

    /// You must pay with the same mint as the external pricing oracle
    #[error("You must pay with the same mint as the external pricing oracle")]
    PaymentMintShouldMatchPricingMint,

    /// Your share account should match the mint of the fractional mint
    #[error("Your share account should match the mint of the fractional mint")]
    ShareMintShouldMatchFractionalMint,

    /// Vault mint provided does not match that on the token vault
    #[error("Vault mint provided does not match that on the token vault")]
    VaultMintNeedsToMatchVault,

    /// Redeem treasury provided does not match that on the token vault
    #[error("Redeem treasury provided does not match that on the token vault")]
    RedeemTreasuryNeedsToMatchVault,

    /// Fraction treasury provided does not match that on the token vault
    #[error("Fraction treasury provided does not match that on the token vault")]
    FractionTreasuryNeedsToMatchVault,

    /// Not allowed to combine at this time
    #[error("Not allowed to combine at this time")]
    NotAllowedToCombine,

    /// You cannot afford to combine this pool
    #[error("You cannot afford to combine this vault")]
    CannotAffordToCombineThisVault,

    /// You have no shares to redeem
    #[error("You have no shares to redeem")]
    NoShares,

    /// Your outstanding share account is the incorrect mint
    #[error("Your outstanding share account is the incorrect mint")]
    OutstandingShareAccountNeedsToMatchFractionalMint,

    /// Your destination account is the incorrect mint
    #[error("Your destination account is the incorrect mint")]
    DestinationAccountNeedsToMatchRedeemMint,

    /// Fractional mint is empty
    #[error("Fractional mint is empty")]
    FractionSupplyEmpty,

    /// Token Program Provided Needs To Match Vault
    #[error("Token Program Provided Needs To Match Vault")]
    TokenProgramProvidedDoesNotMatchVault,

    /// Authority of vault needs to be signer for this action
    #[error("Authority of vault needs to be signer for this action")]
    AuthorityIsNotSigner,

    /// Authority of vault does not match authority provided
    #[error("Authority of vault does not match authority provided")]
    AuthorityDoesNotMatch,

    /// This safety deposit box does not belong to this vault!
    #[error("This safety deposit box does not belong to this vault!")]
    SafetyDepositBoxVaultMismatch,

    /// The store provided does not match the store key on the safety deposit box!
    #[error("The store provided does not match the store key on the safety deposit box!")]
    StoreDoesNotMatchSafetyDepositBox,

    /// This safety deposit box is empty!
    #[error("This safety deposit box is empty!")]
    StoreEmpty,

    /// The destination account to receive your token needs to be the same mint as the token's mint
    #[error("The destination account to receive your token needs to be the same mint as the token's mint")]
    DestinationAccountNeedsToMatchTokenMint,

    /// The destination account to receive your shares needs to be the same mint as the vault's fraction mint
    #[error("The destination account to receive your shares needs to be the same mint as the vault's fraction mint")]
    DestinationAccountNeedsToMatchFractionMint,

    /// The source account to send your shares from needs to be the same mint as the vault's fraction mint
    #[error("The source account to send your shares from needs to be the same mint as the vault's fraction mint")]
    SourceAccountNeedsToMatchFractionMint,

    /// This vault does not allow the minting of new shares!
    #[error("This vault does not allow the minting of new shares!")]
    VaultDoesNotAllowNewShareMinting,

    /// There are not enough shares
    #[error("There are not enough shares")]
    NotEnoughShares,

    /// External price account must be signer
    #[error("External price account must be signer")]
    ExternalPriceAccountMustBeSigner,

    ///Very bad, someone changed external account's price mint after vault creation!
    #[error("Very bad, someone changed external account's price mint after vault creation!")]
    RedeemTreasuryMintShouldMatchPricingMint,

    /// Store has less than amount desired
    #[error("Store has less than amount desired")]
    StoreLessThanAmount,

    /// Invalid token program
    #[error("Invalid token program")]
    InvalidTokenProgram,

    /// Data type mismatch
    #[error("Data type mismatch")]
    DataTypeMismatch,

    /// Accept payment delegate should be none
    #[error("Accept payment delegate should be none")]
    DelegateShouldBeNone,

    /// Accept payment close authority should be none
    #[error("Accept payment close authority should be none")]
    CloseAuthorityShouldBeNone,

    /// Derived key invalid
    #[error("Derived key invalid")]
    DerivedKeyInvalid,
}

impl PrintProgramError for VaultError {
    fn print<E>(&self) {
        msg!(&self.to_string());
    }
}

impl From<VaultError> for ProgramError {
    fn from(e: VaultError) -> Self {
        ProgramError::Custom(e as u32)
    }
}

impl<T> DecodeError<T> for VaultError {
    fn type_of() -> &'static str {
        "Vault Error"
    }
}
