import { MetaState } from "./types";

export const getEmptyState = (): MetaState => ({
  vault: new Map(),
  safetyDepositBox: new Map(),
  auction: new Map(),
  auctionDataExtended: new Map(),
  bidderMetadata: new Map(),
  bidderPot: new Map(),
  auctionManager: new Map(),
  bidRedemption: new Map(),
  payoutTicket: new Map(),
  prizeTrackingTicket: new Map(),
  safetyDepositConfig: new Map(),
  store: new Map(),
  creator: new Map(),
  metadata: new Map(),
  edition: new Map(),
  masterEdition: new Map(),
});
