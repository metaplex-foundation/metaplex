import BN from 'bn.js';
import { WinnerLimitType } from './enums';
import { StringPublicKey } from '../../utils';
import { PriceFloor } from './entities';

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
  tokenMint: StringPublicKey;

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
  tokenMint: StringPublicKey;
  /// Authority
  authority: StringPublicKey;
  /// The resource being auctioned. See AuctionData.
  resource: StringPublicKey;

  priceFloor: PriceFloor;

  tickSize: BN | null;

  gapTickSizePercentage: number | null;

  constructor(args: {
    winners: WinnerLimit;
    endAuctionAt: BN | null;
    auctionGap: BN | null;
    tokenMint: StringPublicKey;
    authority: StringPublicKey;
    resource: StringPublicKey;
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

export class StartAuctionArgs {
  instruction: number = 4;
  resource: StringPublicKey;

  constructor(args: { resource: StringPublicKey }) {
    this.resource = args.resource;
  }
}

export class PlaceBidArgs {
  instruction: number = 6;
  resource: StringPublicKey;
  amount: BN;

  constructor(args: { resource: StringPublicKey; amount: BN }) {
    this.resource = args.resource;
    this.amount = args.amount;
  }
}

export class CancelBidArgs {
  instruction: number = 0;
  resource: StringPublicKey;

  constructor(args: { resource: StringPublicKey }) {
    this.resource = args.resource;
  }
}

export class SetAuthorityArgs {
  instruction: number = 5;
}
