export enum AuctionViewState {
  Live = '0',
  Upcoming = '1',
  Ended = '2',
  BuyNow = '3',
  Defective = '-1',
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

export enum PriceFloorType {
  None = 0,
  Minimum = 1,
  BlindedPrice = 2,
}

export enum WinnerLimitType {
  Unlimited = 0,
  Capped = 1,
}
