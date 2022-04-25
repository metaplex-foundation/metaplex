import { config, Program } from '@metaplex-foundation/mpl-core';
import { PublicKey } from '@solana/web3.js';

export enum MetaplexKey {
  Uninitialized = 0,
  OriginalAuthorityLookupV1 = 1,
  BidRedemptionTicketV1 = 2,
  StoreV1 = 3,
  WhitelistedCreatorV1 = 4,
  PayoutTicketV1 = 5,
  SafetyDepositValidationTicketV1 = 6,
  AuctionManagerV1 = 7,
  PrizeTrackingTicketV1 = 8,
  SafetyDepositConfigV1 = 9,
  AuctionManagerV2 = 10,
  BidRedemptionTicketV2 = 11,
  AuctionWinnerTokenTypeTrackerV1 = 12,
  StoreIndexerV1 = 13,
  AuctionCacheV1 = 14,
  StoreConfigV1 = 15,
}

export class MetaplexProgram extends Program {
  static readonly PREFIX = 'metaplex';
  static readonly CONFIG = 'config';
  static readonly TOTALS = 'totals';
  static readonly PUBKEY = new PublicKey(config.programs.metaplex);
}
