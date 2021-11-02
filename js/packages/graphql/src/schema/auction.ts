import dedent from 'dedent';
import { enumType, objectType } from 'nexus';
import { getAuctionState } from '../common';

export const AuctionViewState = enumType({
  name: 'AuctionViewState',
  members: {
    Live: '0',
    Upcoming: '1',
    Ended: '2',
    BuyNow: '3',
    Defective: '-1',
  },
});

export const AuctionState = enumType({
  name: 'AuctionState',
  members: {
    Created: 0,
    Started: 1,
    Ended: 2,
  },
});

export const BidStateType = enumType({
  name: 'BidStateType',
  members: {
    EnglishAuction: 0,
    OpenEdition: 1,
  },
});

export const Bid = objectType({
  name: 'Bid',
  definition(t) {
    t.nonNull.pubkey('key');
    t.nonNull.bn('amount');
  },
});

// TODO: has extra props/methods
export const BidState = objectType({
  name: 'BidState',
  definition(t) {
    t.nonNull.field('type', { type: BidStateType });
    t.nonNull.list.field('bids', { type: Bid });
    t.nonNull.bn('max');
  },
});

export const PriceFloorType = enumType({
  name: 'PriceFloorType',
  members: {
    None: 0,
    Minimum: 1,
    BlindedPrice: 2,
  },
});

// TODO: has extra props/methods
export const PriceFloor = objectType({
  name: 'PriceFloor',
  definition(t) {
    t.nonNull.field('type', { type: PriceFloorType });
    t.nullable.bn('minPrice');
    // t.nonNull.uint8("hash", {
    //   description: dedent`
    //   It's an array of 32 u8s, when minimum, only first 8 are used (a u64), when blinded price, the entire
    //   thing is a hash and not actually a public key, and none is all zeroes
    // `,
    // });
  },
});

export const Auction = objectType({
  name: 'Auction',
  definition(t) {
    t.nonNull.pubkey('pubkey');
    t.nonNull.pubkey('authority', {
      description:
        'Pubkey of the authority with permission to modify this auction.',
    });
    t.nonNull.pubkey('tokenMint', {
      description: 'Token mint for the SPL token being used to bid',
    });
    t.nullable.bn('lastBid', {
      description:
        'The time the last bid was placed, used to keep track of auction timing.',
    });
    t.nullable.bn('endedAt', {
      description: 'Slot time the auction was officially ended by.',
    });
    t.nullable.bn('endAuctionAt', {
      description:
        'End time is the cut-off point that the auction is forced to end by.',
    });
    t.nullable.bn('auctionGap', {
      description:
        'Gap time is the amount of time in slots after the previous bid at which the auction ends.',
    });
    t.nonNull.field('priceFloor', {
      type: PriceFloor,
      description: 'Minimum price for any bid to meet.',
    });
    t.nonNull.field('state', {
      type: AuctionState,
      description:
        'The state the auction is in, whether it has started or ended.',
    });
    t.nonNull.field('bidState', {
      type: BidState,
      description: 'Auction Bids, each user may have one bid open at a time.',
    });
    t.nullable.pubkey('bidRedemptionKey', {
      description:
        'Used for precalculation on the front end, not a backend key',
    });
    t.nonNull.field('manager', {
      type: AuctionManager,
    });
    t.nonNull.field('viewState', {
      type: AuctionViewState,
      resolve: item => getAuctionState(item),
    });
    // t.nullable.field("thumbnail", {
    //   type: Artwork,
    //   resolve: (item, args, { api }) => api.getAuctionThumbnail(item),
    // });
    // t.nullable.field("highestBid", {
    //   type: BidderMetadata,
    //   resolve: (item, args, { api }) => api.getAuctionHighestBid(item),
    // });
    // t.nonNull.field("bids", {
    //   type: list(nonNull(BidderMetadata)),
    //   resolve: (item, args, { api }) => api.getAuctionBids(item),
    // });
    t.nonNull.bn('numWinners', {
      resolve: item => item.bidState.max,
    });
  },
});

export const AuctionDataExtended = objectType({
  name: 'AuctionDataExtended',
  definition(t) {
    t.bn('totalUncancelledBids');
    t.nullable.bn('tickSize');
    t.nullable.int('gapTickSizePercentage');
  },
});

export const BidderMetadata = objectType({
  name: 'BidderMetadata',
  definition(t) {
    t.nonNull.pubkey('bidderPubkey', {
      description: "Relationship with the bidder who's metadata this covers.",
    });
    t.nonNull.pubkey('auctionPubkey', {
      description: 'Relationship with the auction this bid was placed on.',
    });
    t.nonNull.bn('lastBid', { description: 'Amount that the user bid' });
    t.nonNull.bn('lastBidTimestamp', {
      description: 'Tracks the last time this user bid.',
    });
    t.nonNull.boolean('cancelled', {
      description: dedent`
      Whether the last bid the user made was cancelled. This should also be enough to know if the
      user is a winner, as if cancelled it implies previous bids were also cancelled.
    `,
    });
  },
});

export const BidderPot = objectType({
  name: 'BidderPot',
  definition(t) {
    t.pubkey('bidderPot', {
      description: 'Points at actual pot that is a token account',
    });
    t.pubkey('bidderAct');
    t.pubkey('auctionAct');
    t.boolean('emptied');
  },
});

export const AuctionManager = objectType({
  name: 'AuctionManager',
  definition(t) {
    t.nonNull.pubkey('store');
    t.nonNull.pubkey('authority');
    t.nonNull.pubkey('auction');
    t.nonNull.pubkey('vault');
    t.nonNull.pubkey('acceptPayment');
    // t.nonNull.bn("safetyDepositBoxesExpected", {
    //   resolve: async (item, args, { service }) =>
    //     service.getSafetyDepositBoxesExpected(item),
    // });
    // t.nonNull.field("safetyDepositBoxes", {
    //   type: list(nonNull(SafetyDepositBox)),
    //   resolve: async (item, args, { api }) => api.getSafetyDepositBoxes(item),
    // });
    // t.nullable.field("participationConfig", {
    //   type: ParticipationConfig,
    //   resolve: (item, args, { api }) => api.getParticipationConfig(item),
    // });
  },
});
