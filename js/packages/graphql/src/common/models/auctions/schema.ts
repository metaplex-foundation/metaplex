import {
  BidState,
  AuctionData,
  PriceFloor,
  BidderPot,
  AuctionDataExtended,
  BidderMetadata,
  Bid,
} from './entities';
import {
  CreateAuctionArgs,
  WinnerLimit,
  StartAuctionArgs,
  PlaceBidArgs,
  CancelBidArgs,
  SetAuthorityArgs,
} from './auction';

export const AUCTION_SCHEMA = new Map<any, any>([
  [
    CreateAuctionArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['winners', WinnerLimit],
        ['endAuctionAt', { kind: 'option', type: 'u64' }],
        ['auctionGap', { kind: 'option', type: 'u64' }],
        ['tokenMint', 'pubkeyAsString'],
        ['authority', 'pubkeyAsString'],
        ['resource', 'pubkeyAsString'],
        ['priceFloor', PriceFloor],
        ['tickSize', { kind: 'option', type: 'u64' }],
        ['gapTickSizePercentage', { kind: 'option', type: 'u8' }],
      ],
    },
  ],
  [
    WinnerLimit,
    {
      kind: 'struct',
      fields: [
        ['type', 'u8'],
        ['usize', 'u64'],
      ],
    },
  ],
  [
    StartAuctionArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['resource', 'pubkeyAsString'],
      ],
    },
  ],
  [
    PlaceBidArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['amount', 'u64'],
        ['resource', 'pubkeyAsString'],
      ],
    },
  ],
  [
    CancelBidArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['resource', 'pubkeyAsString'],
      ],
    },
  ],

  [
    SetAuthorityArgs,
    {
      kind: 'struct',
      fields: [['instruction', 'u8']],
    },
  ],
  [
    AuctionData,
    {
      kind: 'struct',
      fields: [
        ['authority', 'pubkeyAsString'],
        ['tokenMint', 'pubkeyAsString'],
        ['lastBid', { kind: 'option', type: 'u64' }],
        ['endedAt', { kind: 'option', type: 'u64' }],
        ['endAuctionAt', { kind: 'option', type: 'u64' }],
        ['auctionGap', { kind: 'option', type: 'u64' }],
        ['priceFloor', PriceFloor],
        ['state', 'u8'],
        ['bidState', BidState],
      ],
    },
  ],
  [
    AuctionDataExtended,
    {
      kind: 'struct',
      fields: [
        ['totalUncancelledBids', 'u64'],
        ['tickSize', { kind: 'option', type: 'u64' }],
        ['gapTickSizePercentage', { kind: 'option', type: 'u8' }],
      ],
    },
  ],
  [
    PriceFloor,
    {
      kind: 'struct',
      fields: [
        ['type', 'u8'],
        ['hash', [32]],
      ],
    },
  ],
  [
    BidState,
    {
      kind: 'struct',
      fields: [
        ['type', 'u8'],
        ['bids', [Bid]],
        ['max', 'u64'],
      ],
    },
  ],
  [
    Bid,
    {
      kind: 'struct',
      fields: [
        ['key', 'pubkeyAsString'],
        ['amount', 'u64'],
      ],
    },
  ],
  [
    BidderMetadata,
    {
      kind: 'struct',
      fields: [
        ['bidderPubkey', 'pubkeyAsString'],
        ['auctionPubkey', 'pubkeyAsString'],
        ['lastBid', 'u64'],
        ['lastBidTimestamp', 'u64'],
        ['cancelled', 'u8'],
      ],
    },
  ],
  [
    BidderPot,
    {
      kind: 'struct',
      fields: [
        ['bidderPot', 'pubkeyAsString'],
        ['bidderAct', 'pubkeyAsString'],
        ['auctionAct', 'pubkeyAsString'],
        ['emptied', 'u8'],
      ],
    },
  ],
]);
