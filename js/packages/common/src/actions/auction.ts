import {
  AccountInfo,
  PublicKey,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import { programIds } from '../utils/ids';
import { deserializeUnchecked, serialize } from 'borsh';
import BN from 'bn.js';
import { AccountParser } from '../contexts';
import moment from 'moment';
import { findProgramAddress } from '../utils';
export const AUCTION_PREFIX = 'auction';
export const METADATA = 'metadata';
export const EXTENDED = 'extended';
export const MAX_AUCTION_DATA_EXTENDED_SIZE = 8 + 9 + 2 + 200;

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
  key: PublicKey;
  amount: BN;
  constructor(args: { key: PublicKey; amount: BN }) {
    this.key = args.key;
    this.amount = args.amount;
  }
}

export class BidState {
  type: BidStateType;
  bids: Bid[];
  max: BN;

  public getWinnerIndex(bidder: PublicKey): number | null {
    if (!this.bids) return null;

    const index = this.bids.findIndex(
      b => b.key.toBase58() === bidder.toBase58(),
    );
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

export const AuctionParser: AccountParser = (
  pubkey: PublicKey,
  account: AccountInfo<Buffer>,
) => ({
  pubkey,
  account,
  info: decodeAuction(account.data),
});

export const decodeAuction = (buffer: Buffer) => {
  return deserializeUnchecked(
    AUCTION_SCHEMA,
    AuctionData,
    buffer,
  ) as AuctionData;
};

export const BidderPotParser: AccountParser = (
  pubkey: PublicKey,
  account: AccountInfo<Buffer>,
) => ({
  pubkey,
  account,
  info: decodeBidderPot(account.data),
});

export const decodeBidderPot = (buffer: Buffer) => {
  return deserializeUnchecked(AUCTION_SCHEMA, BidderPot, buffer) as BidderPot;
};

export const AuctionDataExtendedParser: AccountParser = (
  pubkey: PublicKey,
  account: AccountInfo<Buffer>,
) => ({
  pubkey,
  account,
  info: decodeAuctionDataExtended(account.data),
});

export const decodeAuctionDataExtended = (buffer: Buffer) => {
  return deserializeUnchecked(
    AUCTION_SCHEMA,
    AuctionDataExtended,
    buffer,
  ) as AuctionDataExtended;
};

export const BidderMetadataParser: AccountParser = (
  pubkey: PublicKey,
  account: AccountInfo<Buffer>,
) => ({
  pubkey,
  account,
  info: decodeBidderMetadata(account.data),
});

export const decodeBidderMetadata = (buffer: Buffer) => {
  return deserializeUnchecked(
    AUCTION_SCHEMA,
    BidderMetadata,
    buffer,
  ) as BidderMetadata;
};

export const BASE_AUCTION_DATA_SIZE =
  32 + 32 + 32 + 9 + 9 + 9 + 9 + 1 + 32 + 1 + 8 + 8;

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

export class AuctionDataExtended {
  /// Total uncancelled bids
  totalUncancelledBids: BN;
  tickSize: BN | null;
  gapTickSizePercentage: number | null;

  constructor(args: {
    totalUncancelledBids: BN;
    tickSize: BN | null;
    gapTickSizePercentage: number | null;
  }) {
    this.totalUncancelledBids = args.totalUncancelledBids;
    this.tickSize = args.tickSize;
    this.gapTickSizePercentage = args.gapTickSizePercentage;
  }
}

export interface CountdownState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export class AuctionData {
  /// Pubkey of the authority with permission to modify this auction.
  authority: PublicKey;
  /// Token mint for the SPL token being used to bid
  tokenMint: PublicKey;
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
  /// Total uncancelled bids
  totalUncancelledBids: BN;
  /// Used for precalculation on the front end, not a backend key
  bidRedemptionKey?: PublicKey;

  public timeToEnd(): CountdownState {
    const now = moment().unix();
    const ended = { days: 0, hours: 0, minutes: 0, seconds: 0 };
    let endAt = this.endedAt?.toNumber() || 0;

    if (this.auctionGap && this.lastBid) {
      endAt = Math.max(
        endAt,
        this.auctionGap.toNumber() + this.lastBid.toNumber(),
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
    authority: PublicKey;
    tokenMint: PublicKey;
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
    this.totalUncancelledBids = args.totalUncancelledBids;
  }
}

export const BIDDER_METADATA_LEN = 32 + 32 + 8 + 8 + 1;
export class BidderMetadata {
  // Relationship with the bidder who's metadata this covers.
  bidderPubkey: PublicKey;
  // Relationship with the auction this bid was placed on.
  auctionPubkey: PublicKey;
  // Amount that the user bid.
  lastBid: BN;
  // Tracks the last time this user bid.
  lastBidTimestamp: BN;
  // Whether the last bid the user made was cancelled. This should also be enough to know if the
  // user is a winner, as if cancelled it implies previous bids were also cancelled.
  cancelled: boolean;
  constructor(args: {
    bidderPubkey: PublicKey;
    auctionPubkey: PublicKey;
    lastBid: BN;
    lastBidTimestamp: BN;
    cancelled: boolean;
  }) {
    this.bidderPubkey = args.bidderPubkey;
    this.auctionPubkey = args.auctionPubkey;
    this.lastBid = args.lastBid;
    this.lastBidTimestamp = args.lastBidTimestamp;
    this.cancelled = args.cancelled;
  }
}

export const BIDDER_POT_LEN = 32 + 32 + 32 + 1;
export class BidderPot {
  /// Points at actual pot that is a token account
  bidderPot: PublicKey;
  bidderAct: PublicKey;
  auctionAct: PublicKey;
  emptied: boolean;
  constructor(args: {
    bidderPot: PublicKey;
    bidderAct: PublicKey;
    auctionAct: PublicKey;
    emptied: boolean;
  }) {
    this.bidderPot = args.bidderPot;
    this.bidderAct = args.bidderAct;
    this.auctionAct = args.auctionAct;
    this.emptied = args.emptied;
  }
}

export enum WinnerLimitType {
  Unlimited = 0,
  Capped = 1,
}

export class WinnerLimit {
  type: WinnerLimitType;
  usize: BN;
  constructor(args: { type: WinnerLimitType; usize: BN }) {
    this.type = args.type;
    this.usize = args.usize;
  }
}

export interface IPartialCreateAuctionArgs {
  /// How many winners are allowed for this auction. See AuctionData.
  winners: WinnerLimit;
  /// End time is the cut-off point that the auction is forced to end by. See AuctionData.
  endAuctionAt: BN | null;
  /// Gap time is how much time after the previous bid where the auction ends. See AuctionData.
  auctionGap: BN | null;
  /// Token mint for the SPL token used for bidding.
  tokenMint: PublicKey;

  priceFloor: PriceFloor;

  tickSize: BN | null;

  gapTickSizePercentage: number | null;
}

export class CreateAuctionArgs implements IPartialCreateAuctionArgs {
  instruction: number = 1;
  /// How many winners are allowed for this auction. See AuctionData.
  winners: WinnerLimit;
  /// End time is the cut-off point that the auction is forced to end by. See AuctionData.
  endAuctionAt: BN | null;
  /// Gap time is how much time after the previous bid where the auction ends. See AuctionData.
  auctionGap: BN | null;
  /// Token mint for the SPL token used for bidding.
  tokenMint: PublicKey;
  /// Authority
  authority: PublicKey;
  /// The resource being auctioned. See AuctionData.
  resource: PublicKey;

  priceFloor: PriceFloor;

  tickSize: BN | null;

  gapTickSizePercentage: number | null;

  constructor(args: {
    winners: WinnerLimit;
    endAuctionAt: BN | null;
    auctionGap: BN | null;
    tokenMint: PublicKey;
    authority: PublicKey;
    resource: PublicKey;
    priceFloor: PriceFloor;
    tickSize: BN | null;
    gapTickSizePercentage: number | null;
  }) {
    this.winners = args.winners;
    this.endAuctionAt = args.endAuctionAt;
    this.auctionGap = args.auctionGap;
    this.tokenMint = args.tokenMint;
    this.authority = args.authority;
    this.resource = args.resource;
    this.priceFloor = args.priceFloor;
    this.tickSize = args.tickSize;
    this.gapTickSizePercentage = args.gapTickSizePercentage;
  }
}

class StartAuctionArgs {
  instruction: number = 4;
  resource: PublicKey;

  constructor(args: { resource: PublicKey }) {
    this.resource = args.resource;
  }
}

class PlaceBidArgs {
  instruction: number = 6;
  resource: PublicKey;
  amount: BN;

  constructor(args: { resource: PublicKey; amount: BN }) {
    this.resource = args.resource;
    this.amount = args.amount;
  }
}

class CancelBidArgs {
  instruction: number = 0;
  resource: PublicKey;

  constructor(args: { resource: PublicKey }) {
    this.resource = args.resource;
  }
}

class SetAuthorityArgs {
  instruction: number = 5;
}

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
        ['tokenMint', 'pubkey'],
        ['authority', 'pubkey'],
        ['resource', 'pubkey'],
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
        ['resource', 'pubkey'],
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
        ['resource', 'pubkey'],
      ],
    },
  ],
  [
    CancelBidArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['resource', 'pubkey'],
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
        ['authority', 'pubkey'],
        ['tokenMint', 'pubkey'],
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
        ['key', 'pubkey'],
        ['amount', 'u64'],
      ],
    },
  ],
  [
    BidderMetadata,
    {
      kind: 'struct',
      fields: [
        ['bidderPubkey', 'pubkey'],
        ['auctionPubkey', 'pubkey'],
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
        ['bidderPot', 'pubkey'],
        ['bidderAct', 'pubkey'],
        ['auctionAct', 'pubkey'],
        ['emptied', 'u8'],
      ],
    },
  ],
]);

export const decodeAuctionData = (buffer: Buffer) => {
  return deserializeUnchecked(
    AUCTION_SCHEMA,
    AuctionData,
    buffer,
  ) as AuctionData;
};

export async function createAuction(
  settings: CreateAuctionArgs,
  creator: PublicKey,
  instructions: TransactionInstruction[],
) {
  const auctionProgramId = programIds().auction;

  const data = Buffer.from(serialize(AUCTION_SCHEMA, settings));

  const auctionKey: PublicKey = (
    await findProgramAddress(
      [
        Buffer.from(AUCTION_PREFIX),
        auctionProgramId.toBuffer(),
        settings.resource.toBuffer(),
      ],
      auctionProgramId,
    )
  )[0];

  const keys = [
    {
      pubkey: creator,
      isSigner: true,
      isWritable: true,
    },
    {
      pubkey: auctionKey,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: await getAuctionExtended({
        auctionProgramId,
        resource: settings.resource,
      }),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
  ];
  instructions.push(
    new TransactionInstruction({
      keys,
      programId: auctionProgramId,
      data: data,
    }),
  );
}

export async function startAuction(
  resource: PublicKey,
  creator: PublicKey,
  instructions: TransactionInstruction[],
) {
  const auctionProgramId = programIds().auction;

  const data = Buffer.from(
    serialize(
      AUCTION_SCHEMA,
      new StartAuctionArgs({
        resource,
      }),
    ),
  );

  const auctionKey: PublicKey = (
    await findProgramAddress(
      [
        Buffer.from(AUCTION_PREFIX),
        auctionProgramId.toBuffer(),
        resource.toBuffer(),
      ],
      auctionProgramId,
    )
  )[0];

  const keys = [
    {
      pubkey: creator,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: auctionKey,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: SYSVAR_CLOCK_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ];
  instructions.push(
    new TransactionInstruction({
      keys,
      programId: auctionProgramId,
      data: data,
    }),
  );
}

export async function setAuctionAuthority(
  auction: PublicKey,
  currentAuthority: PublicKey,
  newAuthority: PublicKey,
  instructions: TransactionInstruction[],
) {
  const auctionProgramId = programIds().auction;

  const data = Buffer.from(serialize(AUCTION_SCHEMA, new SetAuthorityArgs()));

  const keys = [
    {
      pubkey: auction,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: currentAuthority,
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: newAuthority,
      isSigner: false,
      isWritable: false,
    },
  ];
  instructions.push(
    new TransactionInstruction({
      keys,
      programId: auctionProgramId,
      data: data,
    }),
  );
}

export async function placeBid(
  bidderPubkey: PublicKey,
  bidderTokenPubkey: PublicKey,
  bidderPotTokenPubkey: PublicKey,
  tokenMintPubkey: PublicKey,
  transferAuthority: PublicKey,
  payer: PublicKey,
  resource: PublicKey,
  amount: BN,
  instructions: TransactionInstruction[],
) {
  const auctionProgramId = programIds().auction;

  const data = Buffer.from(
    serialize(
      AUCTION_SCHEMA,
      new PlaceBidArgs({
        resource,
        amount,
      }),
    ),
  );

  const auctionKey: PublicKey = (
    await findProgramAddress(
      [
        Buffer.from(AUCTION_PREFIX),
        auctionProgramId.toBuffer(),
        resource.toBuffer(),
      ],
      auctionProgramId,
    )
  )[0];

  const bidderPotKey = await getBidderPotKey({
    auctionProgramId,
    auctionKey,
    bidderPubkey,
  });

  const bidderMetaKey: PublicKey = (
    await findProgramAddress(
      [
        Buffer.from(AUCTION_PREFIX),
        auctionProgramId.toBuffer(),
        auctionKey.toBuffer(),
        bidderPubkey.toBuffer(),
        Buffer.from('metadata'),
      ],
      auctionProgramId,
    )
  )[0];

  const keys = [
    {
      pubkey: bidderPubkey,
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: bidderTokenPubkey,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: bidderPotKey,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: bidderPotTokenPubkey,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: bidderMetaKey,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: auctionKey,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: await getAuctionExtended({ auctionProgramId, resource }),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: tokenMintPubkey,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: transferAuthority,
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: payer,
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: SYSVAR_CLOCK_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: programIds().token,
      isSigner: false,
      isWritable: false,
    },
  ];
  instructions.push(
    new TransactionInstruction({
      keys,
      programId: auctionProgramId,
      data: data,
    }),
  );

  return {
    amount,
  };
}

export async function getBidderPotKey({
  auctionProgramId,
  auctionKey,
  bidderPubkey,
}: {
  auctionProgramId: PublicKey;
  auctionKey: PublicKey;
  bidderPubkey: PublicKey;
}): Promise<PublicKey> {
  return (
    await findProgramAddress(
      [
        Buffer.from(AUCTION_PREFIX),
        auctionProgramId.toBuffer(),
        auctionKey.toBuffer(),
        bidderPubkey.toBuffer(),
      ],
      auctionProgramId,
    )
  )[0];
}

export async function getAuctionExtended({
  auctionProgramId,
  resource,
}: {
  auctionProgramId: PublicKey;
  resource: PublicKey;
}): Promise<PublicKey> {
  return (
    await findProgramAddress(
      [
        Buffer.from(AUCTION_PREFIX),
        auctionProgramId.toBuffer(),
        resource.toBuffer(),
        Buffer.from(EXTENDED),
      ],
      auctionProgramId,
    )
  )[0];
}

export async function cancelBid(
  bidderPubkey: PublicKey,
  bidderTokenPubkey: PublicKey,
  bidderPotTokenPubkey: PublicKey,
  tokenMintPubkey: PublicKey,
  resource: PublicKey,
  instructions: TransactionInstruction[],
) {
  const auctionProgramId = programIds().auction;

  const data = Buffer.from(
    serialize(
      AUCTION_SCHEMA,
      new CancelBidArgs({
        resource,
      }),
    ),
  );

  const auctionKey: PublicKey = (
    await findProgramAddress(
      [
        Buffer.from(AUCTION_PREFIX),
        auctionProgramId.toBuffer(),
        resource.toBuffer(),
      ],
      auctionProgramId,
    )
  )[0];

  const bidderPotKey = await getBidderPotKey({
    auctionProgramId,
    auctionKey,
    bidderPubkey,
  });

  const bidderMetaKey: PublicKey = (
    await findProgramAddress(
      [
        Buffer.from(AUCTION_PREFIX),
        auctionProgramId.toBuffer(),
        auctionKey.toBuffer(),
        bidderPubkey.toBuffer(),
        Buffer.from('metadata'),
      ],
      auctionProgramId,
    )
  )[0];

  const keys = [
    {
      pubkey: bidderPubkey,
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: bidderTokenPubkey,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: bidderPotKey,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: bidderPotTokenPubkey,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: bidderMetaKey,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: auctionKey,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: await getAuctionExtended({ auctionProgramId, resource }),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: tokenMintPubkey,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: SYSVAR_CLOCK_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: programIds().token,
      isSigner: false,
      isWritable: false,
    },
  ];
  instructions.push(
    new TransactionInstruction({
      keys,
      programId: auctionProgramId,
      data: data,
    }),
  );
}
