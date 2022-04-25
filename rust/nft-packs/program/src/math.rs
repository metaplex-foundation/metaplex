//! Safe math implementation
use solana_program::program_error::ProgramError;

use crate::error::NFTPacksError;

/// Safe math
pub trait SafeMath<T> {
    /// error if overflow
    fn error_increment(self) -> Result<T, ProgramError>;
    /// error if overflow
    fn error_add(self, rhs: T) -> Result<T, ProgramError>;
    /// error if underflow
    fn error_sub(self, rhs: T) -> Result<T, ProgramError>;
    /// error if underflow
    fn error_decrement(self) -> Result<T, ProgramError>;
    /// error if overflow
    fn error_mul(self, rhs: T) -> Result<T, ProgramError>;
    /// error if underflow
    fn error_div(self, rhs: T) -> Result<T, ProgramError>;
}

impl SafeMath<u16> for u16 {
    fn error_increment(self) -> Result<u16, ProgramError> {
        self.checked_add(1)
            .ok_or_else(|| NFTPacksError::Overflow.into())
    }

    fn error_decrement(self) -> Result<u16, ProgramError> {
        self.checked_sub(1)
            .ok_or_else(|| NFTPacksError::Underflow.into())
    }

    fn error_add(self, rhs: u16) -> Result<u16, ProgramError> {
        self.checked_add(rhs)
            .ok_or_else(|| NFTPacksError::Overflow.into())
    }

    fn error_sub(self, rhs: u16) -> Result<u16, ProgramError> {
        self.checked_sub(rhs)
            .ok_or_else(|| NFTPacksError::Underflow.into())
    }

    fn error_mul(self, rhs: u16) -> Result<u16, ProgramError> {
        self.checked_mul(rhs)
            .ok_or_else(|| NFTPacksError::Overflow.into())
    }

    fn error_div(self, rhs: u16) -> Result<u16, ProgramError> {
        self.checked_div(rhs)
            .ok_or_else(|| NFTPacksError::Underflow.into())
    }
}

impl SafeMath<u32> for u32 {
    fn error_increment(self) -> Result<u32, ProgramError> {
        self.checked_add(1)
            .ok_or_else(|| NFTPacksError::Overflow.into())
    }

    fn error_decrement(self) -> Result<u32, ProgramError> {
        self.checked_sub(1)
            .ok_or_else(|| NFTPacksError::Underflow.into())
    }

    fn error_add(self, rhs: u32) -> Result<u32, ProgramError> {
        self.checked_add(rhs)
            .ok_or_else(|| NFTPacksError::Overflow.into())
    }

    fn error_sub(self, rhs: u32) -> Result<u32, ProgramError> {
        self.checked_sub(rhs)
            .ok_or_else(|| NFTPacksError::Underflow.into())
    }

    fn error_mul(self, rhs: u32) -> Result<u32, ProgramError> {
        self.checked_mul(rhs)
            .ok_or_else(|| NFTPacksError::Overflow.into())
    }

    fn error_div(self, rhs: u32) -> Result<u32, ProgramError> {
        self.checked_div(rhs)
            .ok_or_else(|| NFTPacksError::Underflow.into())
    }
}

impl SafeMath<u64> for u64 {
    fn error_increment(self) -> Result<u64, ProgramError> {
        self.checked_add(1)
            .ok_or_else(|| NFTPacksError::Overflow.into())
    }

    fn error_decrement(self) -> Result<u64, ProgramError> {
        self.checked_sub(1)
            .ok_or_else(|| NFTPacksError::Underflow.into())
    }

    fn error_add(self, rhs: u64) -> Result<u64, ProgramError> {
        self.checked_add(rhs)
            .ok_or_else(|| NFTPacksError::Overflow.into())
    }

    fn error_sub(self, rhs: u64) -> Result<u64, ProgramError> {
        self.checked_sub(rhs)
            .ok_or_else(|| NFTPacksError::Underflow.into())
    }

    fn error_mul(self, rhs: u64) -> Result<u64, ProgramError> {
        self.checked_mul(rhs)
            .ok_or_else(|| NFTPacksError::Overflow.into())
    }

    fn error_div(self, rhs: u64) -> Result<u64, ProgramError> {
        self.checked_div(rhs)
            .ok_or_else(|| NFTPacksError::Underflow.into())
    }
}

impl SafeMath<u128> for u128 {
    fn error_increment(self) -> Result<u128, ProgramError> {
        self.checked_add(1)
            .ok_or_else(|| NFTPacksError::Overflow.into())
    }

    fn error_decrement(self) -> Result<u128, ProgramError> {
        self.checked_sub(1)
            .ok_or_else(|| NFTPacksError::Underflow.into())
    }

    fn error_add(self, rhs: u128) -> Result<u128, ProgramError> {
        self.checked_add(rhs)
            .ok_or_else(|| NFTPacksError::Overflow.into())
    }

    fn error_sub(self, rhs: u128) -> Result<u128, ProgramError> {
        self.checked_sub(rhs)
            .ok_or_else(|| NFTPacksError::Underflow.into())
    }

    fn error_mul(self, rhs: u128) -> Result<u128, ProgramError> {
        self.checked_mul(rhs)
            .ok_or_else(|| NFTPacksError::Overflow.into())
    }

    fn error_div(self, rhs: u128) -> Result<u128, ProgramError> {
        self.checked_div(rhs)
            .ok_or_else(|| NFTPacksError::Underflow.into())
    }
}
