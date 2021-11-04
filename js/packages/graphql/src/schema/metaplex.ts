import { enumType, objectType } from 'nexus';

export const AuctionManagerV1 = objectType({
  name: 'AuctionManagerV1',
  definition(t) {
    t.int('key');
    t.pubkey('store');
    t.pubkey('authority');
    t.pubkey('auction');
    t.pubkey('vault');
    t.pubkey('acceptPayment');
    t.field('state', { type: AuctionManagerStateV1 });
    // settings: AuctionManagerSettingsV1;
  },
});

// TODO: all type
export const AuctionManagerV2 = objectType({
  name: 'AuctionManagerV2',
  definition(t) {
    t.int('key');
    t.pubkey('store');
    t.pubkey('authority');
    t.pubkey('auction');
    t.pubkey('vault');
    t.pubkey('acceptPayment');
    t.field('state', { type: AuctionManagerStateV2 });
  },
});

// TODO: has 2 versoins, check fields
export const BidRedemptionTicket = objectType({
  name: 'BidRedemptionTicket',
  definition(t) {
    t.int('key');
  },
});

export const PayoutTicket = objectType({
  name: 'PayoutTicket',
  definition(t) {
    t.int('key');
    t.pubkey('recipient');
    t.bn('amountPaid');
  },
});

export const PrizeTrackingTicket = objectType({
  name: 'PrizeTrackingTicket',
  definition(t) {
    t.int('key');
    t.pubkey('metadata');
    t.bn('supplySnapshot');
    t.bn('expectedRedemptions');
    t.bn('redemptions');
  },
});

export const SafetyDepositConfig = objectType({
  name: 'SafetyDepositConfig',
  definition(t) {
    t.int('key');
    t.pubkey('auctionManager');
    t.bn('order');
    t.field('winningConfigType', { type: WinningConfigType });
    t.field('amountType', { type: TupleNumericType });
    t.field('lengthType', { type: TupleNumericType });
    t.list.field('amountRanges', { type: AmountRange });
    t.nullable.field('participationConfig', { type: ParticipationConfig });
    t.nullable.field('participationState', { type: ParticipationStateV2 });
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

export const ParticipationConfig = objectType({
  name: 'ParticipationConfig',
  definition(t) {
    t.field('winnerConstraint', { type: WinningConstraint });
    t.field('nonWinningConstraint', { type: NonWinningConstraint });
    t.int('safetyDepositBoxIndex');
    t.nullable.bn('fixedPrice');
  },
});

export const ParticipationStateV2 = objectType({
  name: 'ParticipationStateV2',
  definition(t) {
    t.nullable.bn('collectedToAcceptPayment');
  },
});

export const AuctionManagerStateV1 = objectType({
  name: 'AuctionManagerStateV1',
  definition(t) {
    t.int('status'); // AuctionManagerStatus
    t.int('winningConfigItemsValidated');
    // winningConfigStates: WinningConfigState[] = [];
    // participationState: ParticipationStateV1 | null = null;
  },
});

export const AuctionManagerStateV2 = objectType({
  name: 'AuctionManagerStateV2',
  definition(t) {
    t.int('status'); // AuctionManagerStatus
    t.bn('safetyConfigItemsValidated');
    t.bn('bidsPushedToAcceptPayment');
    t.boolean('hasParticipation');
  },
});
