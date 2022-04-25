use crate::{error::ErrorCode, state::MarketState, ResumeMarket};
use anchor_lang::prelude::*;

impl<'info> ResumeMarket<'info> {
    pub fn process(&mut self) -> Result<()> {
        let market = &mut self.market;
        let clock = &self.clock;

        // Check, that `Market` is not in `Ended` state
        if market.state == MarketState::Ended {
            return Err(ErrorCode::MarketIsEnded.into());
        }

        if let Some(end_date) = market.end_date {
            if clock.unix_timestamp as u64 > end_date {
                return Err(ErrorCode::MarketIsEnded.into());
            }
        }

        // Check, that `Market` is in `Suspended` state
        if market.state != MarketState::Suspended {
            return Err(ErrorCode::MarketInInvalidState.into());
        }

        market.state = MarketState::Active;

        Ok(())
    }
}
