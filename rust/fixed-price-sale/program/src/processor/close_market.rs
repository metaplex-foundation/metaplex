use crate::{error::ErrorCode, state::MarketState, CloseMarket};
use anchor_lang::prelude::*;

impl<'info> CloseMarket<'info> {
    pub fn process(&mut self) -> Result<()> {
        let market = &mut self.market;
        let clock = &self.clock;

        // Check, that `Market` is with unlimited duration
        if market.end_date.is_some() {
            return Err(ErrorCode::MarketDurationIsNotUnlimited.into());
        }

        // Check, that `Market` is started
        if market.start_date > clock.unix_timestamp as u64 {
            return Err(ErrorCode::MarketIsNotStarted.into());
        }

        market.state = MarketState::Ended;

        Ok(())
    }
}
