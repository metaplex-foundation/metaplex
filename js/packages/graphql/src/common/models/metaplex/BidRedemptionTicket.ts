import type { MetaplexKey } from './MetaplexKey';

export interface BidRedemptionTicket {
  key: MetaplexKey;

  getBidRedeemed(order: number): boolean;
}
