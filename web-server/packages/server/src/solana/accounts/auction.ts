import { StringPublicKey } from "../ids";
import BN from 'bn.js';
import moment from 'moment';
import {deserializeUnchecked} from 'borsh';

export class AuctionData {
  /// Pubkey of the authority with permission to modify this auction.
  authority: StringPublicKey;
  /// Token mint for the SPL token being used to bid
  tokenMint: StringPublicKey;
  /// The time the last bid was placed, used to keep track of auction timing.
  lastBid: BN | null;
  /// Slot time the auction was officially ended by.
  endedAt: BN | null;
  /// End time is the cut-off point that the auction is forced to end by.
  endAuctionAt: BN | null;
  /// Gap time is the amount of time in slots after the previous bid at which the auction ends.
  auctionGap: BN | null;
  /// Minimum price for any bid to meet.
  priceFloor: PriceFloor;
  /// The state the auction is in, whether it has started or ended.
  state: AuctionState;
  /// Auction Bids, each user may have one bid open at a time.
  bidState: BidState;
  /// Used for precalculation on the front end, not a backend key
  bidRedemptionKey?: StringPublicKey;

  auctionDataExtended?: StringPublicKey;

  public timeToEnd(): CountdownState {
    const now = moment().unix();
    const ended = { days: 0, hours: 0, minutes: 0, seconds: 0 };
    let endAt = this.endedAt?.toNumber() || 0;

    if (this.auctionGap && this.lastBid) {
      endAt = Math.max(
        endAt,
        this.auctionGap.toNumber() + this.lastBid.toNumber()
      );
    }

    let delta = endAt - now;

    if (!endAt || delta <= 0) return ended;

    const days = Math.floor(delta / 86400);
    delta -= days * 86400;

    const hours = Math.floor(delta / 3600) % 24;
    delta -= hours * 3600;

    const minutes = Math.floor(delta / 60) % 60;
    delta -= minutes * 60;

    const seconds = Math.floor(delta % 60);

    return { days, hours, minutes, seconds };
  }

  public ended() {
    const now = moment().unix();
    if (!this.endedAt) return false;

    if (this.endedAt.toNumber() > now) return false;

    if (this.endedAt.toNumber() < now) {
      if (this.auctionGap && this.lastBid) {
        const newEnding = this.auctionGap.toNumber() + this.lastBid.toNumber();
        return newEnding < now;
      } else return true;
    }
  }

  constructor(args: {
    authority: StringPublicKey;
    tokenMint: StringPublicKey;
    lastBid: BN | null;
    endedAt: BN | null;
    endAuctionAt: BN | null;
    auctionGap: BN | null;
    priceFloor: PriceFloor;
    state: AuctionState;
    bidState: BidState;
    totalUncancelledBids: BN;
  }) {
    this.authority = args.authority;
    this.tokenMint = args.tokenMint;
    this.lastBid = args.lastBid;
    this.endedAt = args.endedAt;
    this.endAuctionAt = args.endAuctionAt;
    this.auctionGap = args.auctionGap;
    this.priceFloor = args.priceFloor;
    this.state = args.state;
    this.bidState = args.bidState;
  }
}


export enum PriceFloorType {
  None = 0,
  Minimum = 1,
  BlindedPrice = 2,
}

export class PriceFloor {
  type: PriceFloorType;
  // It's an array of 32 u8s, when minimum, only first 8 are used (a u64), when blinded price, the entire
  // thing is a hash and not actually a public key, and none is all zeroes
  hash: Uint8Array;

  minPrice?: BN;

  constructor(args: {
    type: PriceFloorType;
    hash?: Uint8Array;
    minPrice?: BN;
  }) {
    this.type = args.type;
    this.hash = args.hash || new Uint8Array(32);
    if (this.type === PriceFloorType.Minimum) {
      if (args.minPrice) {
        this.hash.set(args.minPrice.toArrayLike(Buffer, 'le', 8), 0);
      } else {
        this.minPrice = new BN(
          (args.hash || new Uint8Array(0)).slice(0, 8),
          'le',
        );
      }
    }
  }
}

export enum AuctionState {
  Created = 0,
  Started,
  Ended,
}

export enum BidStateType {
  EnglishAuction = 0,
  OpenEdition = 1,
}

export class Bid {
  key: StringPublicKey;
  amount: BN;
  constructor(args: { key: StringPublicKey; amount: BN }) {
    this.key = args.key;
    this.amount = args.amount;
  }
}

export class BidState {
  type: BidStateType;
  bids: Bid[];
  max: BN;

  public getWinnerAt(winnerIndex: number): StringPublicKey | null {
    const convertedIndex = this.bids.length - winnerIndex - 1;

    if (convertedIndex >= 0 && convertedIndex < this.bids.length) {
      return this.bids[convertedIndex].key;
    } else {
      return null;
    }
  }

  public getAmountAt(winnerIndex: number): BN | null {
    const convertedIndex = this.bids.length - winnerIndex - 1;

    if (convertedIndex >= 0 && convertedIndex < this.bids.length) {
      return this.bids[convertedIndex].amount;
    } else {
      return null;
    }
  }

  public getWinnerIndex(bidder: StringPublicKey): number | null {
    if (!this.bids) return null;

    const index = this.bids.findIndex((b) => b.key === bidder);
    // auction stores data in reverse order
    if (index !== -1) {
      const zeroBased = this.bids.length - index - 1;
      return zeroBased < this.max.toNumber() ? zeroBased : null;
    } else return null;
  }

  constructor(args: { type: BidStateType; bids: Bid[]; max: BN }) {
    this.type = args.type;
    this.bids = args.bids;
    this.max = args.max;
  }
}

export interface CountdownState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}


export class AuctionDataExtended {
  /// Total uncancelled bids
  totalUncancelledBids: BN;
  tickSize: BN | null;
  gapTickSizePercentage: number | null;
  instantSalePrice: BN | null;
  name: number[] | null;

  constructor(args: {
    totalUncancelledBids: BN;
    tickSize: BN | null;
    gapTickSizePercentage: number | null;
    instantSalePrice: BN | null;
    name: number[] | null;
  }) {
    this.totalUncancelledBids = args.totalUncancelledBids;
    this.tickSize = args.tickSize;
    this.gapTickSizePercentage = args.gapTickSizePercentage;
    this.instantSalePrice = args.instantSalePrice;
    this.name = args.name;
  }
}

export const AUCTION_SCHEMA = new Map<any, any>([
  [
    AuctionData,
    {
      kind: "struct",
      fields: [
        ["authority", "pubkeyAsString"],
        ["tokenMint", "pubkeyAsString"],
        ["lastBid", { kind: "option", type: "u64" }],
        ["endedAt", { kind: "option", type: "u64" }],
        ["endAuctionAt", { kind: "option", type: "u64" }],
        ["auctionGap", { kind: "option", type: "u64" }],
        ["priceFloor", PriceFloor],
        ["state", "u8"],
        ["bidState", BidState],
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
        ['instantSalePrice', { kind: 'option', type: 'u64' }],
        ['name', { kind: 'option', type: [32] }],
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
  [Bid,
  {
    kind: 'struct',
    fields: [
      ['key', 'pubkeyAsString'],
      ['amount', 'u64'],
    ],
  },
]]);

export const decodeAuctionData = (buffer: Buffer) => {
  return deserializeUnchecked(
    AUCTION_SCHEMA,
    AuctionData,
    buffer,
  ) as AuctionData;
};

export const decodeAuctionDataExtended = (buffer: Buffer) => {
  return deserializeUnchecked(
    AUCTION_SCHEMA,
    AuctionDataExtended,
    buffer,
  ) as AuctionDataExtended;
};
