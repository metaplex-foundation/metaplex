use crate::{error::ErrorCode, state::MarketState, SuspendMarket};
use anchor_lang::prelude::*;

impl<'info> SuspendMarket<'info> {
    pub fn process(&mut self) -> Result<()> {
        let market = &mut self.market;
        let clock = &self.clock;

        // Check, that `Market` is in `Active` state
        if market.state == MarketState::Ended {
            return Err(ErrorCode::MarketIsEnded.into());
        }

        if let Some(end_date) = market.end_date {
            if clock.unix_timestamp as u64 > end_date {
                return Err(ErrorCode::MarketIsEnded.into());
            }
        }

        // Check, that `Market` is started
        if market.start_date > clock.unix_timestamp as u64 {
            return Err(ErrorCode::MarketIsNotStarted.into());
        }

        // Check, that `Market` is mutable
        if !market.mutable {
            return Err(ErrorCode::MarketIsImmutable.into());
        }

        // Check, that `Market` is not in `Suspended` state
        if market.state == MarketState::Suspended {
            return Err(ErrorCode::MarketIsSuspended.into());
        }

        market.state = MarketState::Suspended;

        Ok(())
    }
}
