import { MetaState } from './types';

export const getEmptyState = (): MetaState => ({
  vaults: new Map(),
  safetyDepositBoxes: new Map(),
  auctions: new Map(),
  auctionsDataExtended: new Map(),
  bidderMetadatas: new Map(),
  bidderPots: new Map(),
  auctionManagers: new Map(),
  bidRedemptions: new Map(),
  payoutTickets: new Map(),
  prizeTrackingTickets: new Map(),
  safetyDepositConfigs: new Map(),
  stores: new Map(),
  creators: new Map(),
  metadata: new Map(),
  editions: new Map(),
  masterEditions: new Map(),
});
