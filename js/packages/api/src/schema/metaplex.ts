import { enumType, objectType } from 'nexus';

export const MetaplexKey = enumType({
  name: 'MetaplexKey',
  members: {
    Uninitialized: 0,
    OriginalAuthorityLookupV1: 1,
    BidRedemptionTicketV1: 2,
    StoreV1: 3,
    WhitelistedCreatorV1: 4,
    PayoutTicketV1: 5,
    SafetyDepositValidationTicketV1: 6,
    AuctionManagerV1: 7,
    PrizeTrackingTicketV1: 8,
    SafetyDepositConfigV1: 9,
    AuctionManagerV2: 10,
    BidRedemptionTicketV2: 11,
    AuctionWinnerTokenTypeTrackerV1: 12,
  },
});

// TODO: all type
export const AuctionManagerV1 = objectType({
  name: 'AuctionManagerV1',
  definition(t) {
    t.field('key', { type: MetaplexKey });
  },
});

// TODO: all type
export const AuctionManagerV2 = objectType({
  name: 'AuctionManagerV2',
  definition(t) {
    t.field('key', { type: MetaplexKey });
  },
});

// TODO: has 2 versoins, check fields
export const BidRedemptionTicket = objectType({
  name: 'BidRedemptionTicket',
  definition(t) {
    t.field('key', { type: MetaplexKey });
  },
});

export const PayoutTicket = objectType({
  name: 'PayoutTicket',
  definition(t) {
    t.field('key', { type: MetaplexKey });
    t.pubkey('recipient');
    t.bn('amountPaid');
  },
});

export const PrizeTrackingTicket = objectType({
  name: 'PrizeTrackingTicket',
  definition(t) {
    t.field('key', { type: MetaplexKey });
    t.pubkey('metadata');
    t.bn('supplySnapshot');
    t.bn('expectedRedemptions');
    t.bn('redemptions');
  },
});

export const Store = objectType({
  name: 'Store',
  definition(t) {
    t.field('key', { type: MetaplexKey });
    t.boolean('public');
    t.pubkey('auctionProgram');
    t.pubkey('tokenVaultProgram');
    t.pubkey('tokenMetadataProgram');
    t.pubkey('tokenProgram');
  },
});

export const SafetyDepositConfig = objectType({
  name: 'SafetyDepositConfig',
  definition(t) {
    t.field('key', { type: MetaplexKey });
    t.pubkey('auctionManager');
    t.bn('order');
    t.field('winningConfigType', { type: WinningConfigType });
    t.field('amountType', { type: TupleNumericType });
    t.field('lengthType', { type: TupleNumericType });
    t.list.field('amountRanges', { type: AmountRange });
    t.nullable.field('participationConfig', { type: ParticipationConfigV2 });
    t.nullable.field('participationState', { type: ParticipationStateV2 });
  },
});

// TODO: duplicated with metadata/creator
// TODO: has extra props
export const WhitelistedCreator = objectType({
  name: 'WhitelistedCreator',
  definition(t) {
    t.field('key', { type: MetaplexKey });
    t.pubkey('address');
    t.boolean('activated');
  },
});

export const AmountRange = objectType({
  name: 'AmountRange',
  definition(t) {
    t.bn('amount');
    t.bn('length');
  },
});

export const WinningConfigType = enumType({
  name: 'WinningConfigType',
  members: {
    TokenOnlyTransfer: 0,
    FullRightsTransfer: 1,
    PrintingV1: 2,
    PrintingV2: 3,
    Participation: 4,
  },
});

export const TupleNumericType = enumType({
  name: 'TupleNumericType',
  members: {
    U8: 1,
    U16: 2,
    U32: 4,
    U64: 8,
  },
});

export const WinningConstraint = enumType({
  name: 'WinningConstraint',
  members: {
    NoParticipationPrize: 0,
    ParticipationPrizeGiven: 1,
  },
});

export const NonWinningConstraint = enumType({
  name: 'NonWinningConstraint',
  members: {
    NoParticipationPrize: 0,
    GivenForFixedPrice: 1,
    GivenForBidPrice: 2,
  },
});

export const ParticipationConfigV2 = objectType({
  name: 'ParticipationConfigV2',
  definition(t) {
    t.field('winnerConstraint', { type: WinningConstraint });
    t.field('nonWinningConstraint', { type: NonWinningConstraint });
    t.nullable.bn('fixedPrice');
  },
});

export const ParticipationStateV2 = objectType({
  name: 'ParticipationStateV2',
  definition(t) {
    t.nullable.bn('collectedToAcceptPayment');
  },
});
