import BN from 'bn.js';
import gql from 'graphql-tag';
import * as Urql from 'urql';
export type Maybe<T> = T | null;
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> &
  { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> &
  { [SubKey in K]: Maybe<T[SubKey]> };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  /** GraphQL representation of BigNumber */
  BN: BN;
  Buffer: unknown;
  PublicKey: string;
  Uint8Array: unknown;
};

export type AmountRange = {
  __typename?: 'AmountRange';
  amount?: Maybe<Scalars['BN']>;
  length?: Maybe<Scalars['BN']>;
};

export type Artwork = {
  __typename?: 'Artwork';
  creators?: Maybe<Array<Maybe<ArtworkCreator>>>;
  edition?: Maybe<Scalars['BN']>;
  maxSupply?: Maybe<Scalars['BN']>;
  mint?: Maybe<Scalars['PublicKey']>;
  pubkey: Scalars['PublicKey'];
  sellerFeeBasisPoints: Scalars['Int'];
  supply?: Maybe<Scalars['BN']>;
  title: Scalars['String'];
  type: Scalars['Int'];
  uri: Scalars['String'];
};

export type ArtworkCreator = {
  __typename?: 'ArtworkCreator';
  address: Scalars['PublicKey'];
  share: Scalars['Int'];
  verified: Scalars['Boolean'];
};

export type ArtworksInput = {
  artId?: Maybe<Scalars['String']>;
  creatorId?: Maybe<Scalars['String']>;
  onlyVerified?: Maybe<Scalars['Boolean']>;
  ownerId?: Maybe<Scalars['String']>;
  storeId: Scalars['String'];
};

export type Auction = {
  __typename?: 'Auction';
  /** Gap time is the amount of time in slots after the previous bid at which the auction ends. */
  auctionGap?: Maybe<Scalars['BN']>;
  /** Pubkey of the authority with permission to modify this auction. */
  authority: Scalars['PublicKey'];
  /** Used for precalculation on the front end, not a backend key */
  bidRedemptionKey?: Maybe<Scalars['PublicKey']>;
  /** Auction Bids, each user may have one bid open at a time. */
  bidState: BidState;
  bids: Array<BidderMetadata>;
  /** End time is the cut-off point that the auction is forced to end by. */
  endAuctionAt?: Maybe<Scalars['BN']>;
  /** Slot time the auction was officially ended by. */
  endedAt?: Maybe<Scalars['BN']>;
  highestBid?: Maybe<BidderMetadata>;
  /** The time the last bid was placed, used to keep track of auction timing. */
  lastBid?: Maybe<Scalars['BN']>;
  manager: AuctionManager;
  numWinners: Scalars['BN'];
  /** Minimum price for any bid to meet. */
  priceFloor: PriceFloor;
  pubkey: Scalars['PublicKey'];
  /** The state the auction is in, whether it has started or ended. */
  state: AuctionState;
  thumbnail?: Maybe<Artwork>;
  /** Token mint for the SPL token being used to bid */
  tokenMint: Scalars['PublicKey'];
  viewState: AuctionViewState;
};

export type AuctionDataExtended = {
  __typename?: 'AuctionDataExtended';
  gapTickSizePercentage?: Maybe<Scalars['Int']>;
  tickSize?: Maybe<Scalars['BN']>;
  totalUncancelledBids?: Maybe<Scalars['BN']>;
};

export enum AuctionInputState {
  All = 'all',
  Ended = 'ended',
  Live = 'live',
  Resale = 'resale',
}

export type AuctionManager = {
  __typename?: 'AuctionManager';
  acceptPayment: Scalars['PublicKey'];
  auction: Scalars['PublicKey'];
  authority: Scalars['PublicKey'];
  participationConfig?: Maybe<ParticipationConfig>;
  safetyDepositBoxes: Array<SafetyDepositBox>;
  safetyDepositBoxesExpected: Scalars['BN'];
  store: Scalars['PublicKey'];
  vault: Scalars['PublicKey'];
};

export type AuctionManagerStateV1 = {
  __typename?: 'AuctionManagerStateV1';
  status?: Maybe<Scalars['Int']>;
  winningConfigItemsValidated?: Maybe<Scalars['Int']>;
};

export type AuctionManagerStateV2 = {
  __typename?: 'AuctionManagerStateV2';
  bidsPushedToAcceptPayment?: Maybe<Scalars['BN']>;
  hasParticipation?: Maybe<Scalars['Boolean']>;
  safetyConfigItemsValidated?: Maybe<Scalars['BN']>;
  status?: Maybe<Scalars['Int']>;
};

export type AuctionManagerV1 = {
  __typename?: 'AuctionManagerV1';
  acceptPayment?: Maybe<Scalars['PublicKey']>;
  auction?: Maybe<Scalars['PublicKey']>;
  authority?: Maybe<Scalars['PublicKey']>;
  key?: Maybe<Scalars['Int']>;
  state?: Maybe<AuctionManagerStateV1>;
  store?: Maybe<Scalars['PublicKey']>;
  vault?: Maybe<Scalars['PublicKey']>;
};

export type AuctionManagerV2 = {
  __typename?: 'AuctionManagerV2';
  acceptPayment?: Maybe<Scalars['PublicKey']>;
  auction?: Maybe<Scalars['PublicKey']>;
  authority?: Maybe<Scalars['PublicKey']>;
  key?: Maybe<Scalars['Int']>;
  state?: Maybe<AuctionManagerStateV2>;
  store?: Maybe<Scalars['PublicKey']>;
  vault?: Maybe<Scalars['PublicKey']>;
};

export enum AuctionState {
  Created = 'Created',
  Ended = 'Ended',
  Started = 'Started',
}

export enum AuctionViewState {
  BuyNow = 'BuyNow',
  Defective = 'Defective',
  Ended = 'Ended',
  Live = 'Live',
  Upcoming = 'Upcoming',
}

export type AuctionsInput = {
  participantId?: Maybe<Scalars['String']>;
  state?: Maybe<AuctionInputState>;
  storeId?: Maybe<Scalars['String']>;
};

export type Bid = {
  __typename?: 'Bid';
  amount: Scalars['BN'];
  key: Scalars['PublicKey'];
};

export type BidRedemptionTicket = {
  __typename?: 'BidRedemptionTicket';
  key?: Maybe<Scalars['Int']>;
};

export type BidState = {
  __typename?: 'BidState';
  bids: Array<Maybe<Bid>>;
  max: Scalars['BN'];
  type: BidStateType;
};

export enum BidStateType {
  EnglishAuction = 'EnglishAuction',
  OpenEdition = 'OpenEdition',
}

export type BidderMetadata = {
  __typename?: 'BidderMetadata';
  /** Relationship with the auction this bid was placed on. */
  auctionPubkey: Scalars['PublicKey'];
  /** Relationship with the bidder who's metadata this covers. */
  bidderPubkey: Scalars['PublicKey'];
  /**
   * Whether the last bid the user made was cancelled. This should also be enough to know if the
   * user is a winner, as if cancelled it implies previous bids were also cancelled.
   */
  cancelled: Scalars['Boolean'];
  /** Amount that the user bid */
  lastBid: Scalars['BN'];
  /** Tracks the last time this user bid. */
  lastBidTimestamp: Scalars['BN'];
};

export type BidderPot = {
  __typename?: 'BidderPot';
  auctionAct?: Maybe<Scalars['PublicKey']>;
  bidderAct?: Maybe<Scalars['PublicKey']>;
  /** Points at actual pot that is a token account */
  bidderPot?: Maybe<Scalars['PublicKey']>;
  emptied?: Maybe<Scalars['Boolean']>;
};

export type Creator = {
  __typename?: 'Creator';
  activated: Scalars['Boolean'];
  address: Scalars['PublicKey'];
  key: Scalars['Int'];
  pubkey: Scalars['PublicKey'];
};

export type Edition = {
  __typename?: 'Edition';
  /** Starting at 0 for master record, this is incremented for each edition minted */
  edition?: Maybe<Scalars['BN']>;
  key?: Maybe<MetadataKey>;
  /** Points at MasterEdition struct */
  parent?: Maybe<Scalars['PublicKey']>;
};

export type MasterEdition = MasterEditionV1 | MasterEditionV2;

export type MasterEditionV1 = {
  __typename?: 'MasterEditionV1';
  key?: Maybe<MetadataKey>;
  maxSupply?: Maybe<Scalars['BN']>;
  oneTimePrintingAuthorizationMint?: Maybe<Scalars['PublicKey']>;
  printingMint?: Maybe<Scalars['PublicKey']>;
  supply?: Maybe<Scalars['BN']>;
};

export type MasterEditionV2 = {
  __typename?: 'MasterEditionV2';
  key?: Maybe<MetadataKey>;
  maxSupply?: Maybe<Scalars['BN']>;
  supply?: Maybe<Scalars['BN']>;
};

export enum MetadataKey {
  EditionMarker = 'EditionMarker',
  EditionV1 = 'EditionV1',
  MasterEditionV1 = 'MasterEditionV1',
  MasterEditionV2 = 'MasterEditionV2',
  MetadataV1 = 'MetadataV1',
  Uninitialized = 'Uninitialized',
}

export enum NonWinningConstraint {
  GivenForBidPrice = 'GivenForBidPrice',
  GivenForFixedPrice = 'GivenForFixedPrice',
  NoParticipationPrize = 'NoParticipationPrize',
}

export type ParticipationConfig = {
  __typename?: 'ParticipationConfig';
  fixedPrice?: Maybe<Scalars['BN']>;
  nonWinningConstraint?: Maybe<NonWinningConstraint>;
  safetyDepositBoxIndex?: Maybe<Scalars['Int']>;
  winnerConstraint?: Maybe<WinningConstraint>;
};

export type ParticipationStateV2 = {
  __typename?: 'ParticipationStateV2';
  collectedToAcceptPayment?: Maybe<Scalars['BN']>;
};

export type PayoutTicket = {
  __typename?: 'PayoutTicket';
  amountPaid?: Maybe<Scalars['BN']>;
  key?: Maybe<Scalars['Int']>;
  recipient?: Maybe<Scalars['PublicKey']>;
};

export type PriceFloor = {
  __typename?: 'PriceFloor';
  /**
   * It's an array of 32 u8s, when minimum, only first 8 are used (a u64), when blinded price, the entire
   * thing is a hash and not actually a public key, and none is all zeroes
   */
  hash: Scalars['Uint8Array'];
  minPrice?: Maybe<Scalars['BN']>;
  type: PriceFloorType;
};

export enum PriceFloorType {
  BlindedPrice = 'BlindedPrice',
  Minimum = 'Minimum',
  None = 'None',
}

export type PrizeTrackingTicket = {
  __typename?: 'PrizeTrackingTicket';
  expectedRedemptions?: Maybe<Scalars['BN']>;
  key?: Maybe<Scalars['Int']>;
  metadata?: Maybe<Scalars['PublicKey']>;
  redemptions?: Maybe<Scalars['BN']>;
  supplySnapshot?: Maybe<Scalars['BN']>;
};

export type Query = {
  __typename?: 'Query';
  artwork?: Maybe<Artwork>;
  artworks?: Maybe<Array<Artwork>>;
  artworksCount?: Maybe<Scalars['Int']>;
  auction?: Maybe<Auction>;
  auctions?: Maybe<Array<Auction>>;
  auctionsCount?: Maybe<Scalars['Int']>;
  creator?: Maybe<Creator>;
  creators?: Maybe<Array<Creator>>;
  creatorsCount?: Maybe<Scalars['Int']>;
  store?: Maybe<Store>;
  stores?: Maybe<Array<Store>>;
  storesCount?: Maybe<Scalars['Int']>;
};

export type QueryArtworkArgs = {
  artId: Scalars['String'];
  storeId?: Maybe<Scalars['String']>;
};

export type QueryArtworksArgs = {
  filter: ArtworksInput;
};

export type QueryAuctionArgs = {
  auctionId: Scalars['String'];
  storeId?: Maybe<Scalars['String']>;
};

export type QueryAuctionsArgs = {
  filter: AuctionsInput;
};

export type QueryCreatorArgs = {
  creatorId: Scalars['String'];
  storeId: Scalars['String'];
};

export type QueryCreatorsArgs = {
  storeId: Scalars['String'];
};

export type QueryStoreArgs = {
  storeId: Scalars['String'];
};

export type SafetyDepositBox = {
  __typename?: 'SafetyDepositBox';
  /** Each token type in a vault has it's own box that contains it's mint and a look-back */
  key: VaultKey;
  /** @deprecated The order in the array of registries */
  order: Scalars['Int'];
  /** Account that stores the tokens under management */
  store: Scalars['PublicKey'];
  /** This particular token's mint */
  tokenMint: Scalars['PublicKey'];
  /** @deprecated VaultKey pointing to the parent vault */
  vault: Scalars['PublicKey'];
};

export type SafetyDepositConfig = {
  __typename?: 'SafetyDepositConfig';
  amountRanges?: Maybe<Array<Maybe<AmountRange>>>;
  amountType?: Maybe<TupleNumericType>;
  auctionManager?: Maybe<Scalars['PublicKey']>;
  key?: Maybe<Scalars['Int']>;
  lengthType?: Maybe<TupleNumericType>;
  order?: Maybe<Scalars['BN']>;
  participationConfig?: Maybe<ParticipationConfig>;
  participationState?: Maybe<ParticipationStateV2>;
  winningConfigType?: Maybe<WinningConfigType>;
};

export type Store = {
  __typename?: 'Store';
  auctionProgram?: Maybe<Scalars['PublicKey']>;
  key?: Maybe<Scalars['Int']>;
  pubkey?: Maybe<Scalars['PublicKey']>;
  public?: Maybe<Scalars['Boolean']>;
  tokenMetadataProgram?: Maybe<Scalars['PublicKey']>;
  tokenProgram?: Maybe<Scalars['PublicKey']>;
  tokenVaultProgram?: Maybe<Scalars['PublicKey']>;
};

export type Subscription = {
  __typename?: 'Subscription';
  auction?: Maybe<Auction>;
  auctions?: Maybe<Auction>;
  creator?: Maybe<Creator>;
  creators?: Maybe<Creator>;
  store?: Maybe<Store>;
  stores?: Maybe<Store>;
  ticks?: Maybe<Scalars['Boolean']>;
};

export type SubscriptionAuctionArgs = {
  id: Scalars['String'];
};

export type SubscriptionCreatorArgs = {
  id: Scalars['String'];
};

export type SubscriptionStoreArgs = {
  id: Scalars['String'];
};

export enum TupleNumericType {
  U8 = 'U8',
  U16 = 'U16',
  U32 = 'U32',
  U64 = 'U64',
}

export type Vault = {
  __typename?: 'Vault';
  /** Can authority mint more shares from fraction_mint after activation */
  allowFurtherShareCreation?: Maybe<Scalars['Boolean']>;
  /** Authority who can make changes to the vault */
  authority?: Maybe<Scalars['PublicKey']>;
  /** Mint that produces the fractional shares */
  fractionMint?: Maybe<Scalars['PublicKey']>;
  /** treasury where fractional shares are held for redemption by authority */
  fractionTreasury?: Maybe<Scalars['PublicKey']>;
  key?: Maybe<VaultKey>;
  /**
   * Once combination happens, we copy price per share to vault so that if something nefarious happens
   * to external price account, like price change, we still have the math 'saved' for use in our calcs
   */
  lockedPricePerShare?: Maybe<Scalars['BN']>;
  /** Must point at an ExternalPriceAccount, which gives permission and price for buyout. */
  pricingLookupAddress?: Maybe<Scalars['PublicKey']>;
  /** treasury where monies are held for fractional share holders to redeem(burn) shares once buyout is made */
  redeemTreasury?: Maybe<Scalars['PublicKey']>;
  state?: Maybe<VaultState>;
  /** @deprecated Store token program used */
  tokenProgram?: Maybe<Scalars['PublicKey']>;
  /**
   * In inactive state, we use this to set the order key on Safety Deposit Boxes being added and
   * then we increment it and save so the next safety deposit box gets the next number.
   * In the Combined state during token redemption by authority, we use it as a decrementing counter each time
   * The authority of the vault withdrawals a Safety Deposit contents to count down how many
   * are left to be opened and closed down. Once this hits zero, and the fraction mint has zero shares,
   * then we can deactivate the vault.
   */
  tokenTypeCount?: Maybe<Scalars['Int']>;
};

export enum VaultKey {
  ExternalPriceAccountV1 = 'ExternalPriceAccountV1',
  SafetyDepositBoxV1 = 'SafetyDepositBoxV1',
  Uninitialized = 'Uninitialized',
  VaultV1 = 'VaultV1',
}

export enum VaultState {
  Active = 'Active',
  Combined = 'Combined',
  Deactivated = 'Deactivated',
  Inactive = 'Inactive',
}

export enum WinningConfigType {
  FullRightsTransfer = 'FullRightsTransfer',
  Participation = 'Participation',
  PrintingV1 = 'PrintingV1',
  PrintingV2 = 'PrintingV2',
  TokenOnlyTransfer = 'TokenOnlyTransfer',
}

export enum WinningConstraint {
  NoParticipationPrize = 'NoParticipationPrize',
  ParticipationPrizeGiven = 'ParticipationPrizeGiven',
}

export type ArtworkFragmentFragment = {
  __typename?: 'Artwork';
  pubkey: string;
  uri: string;
  title: string;
  mint?: Maybe<string>;
  sellerFeeBasisPoints: number;
  type: number;
  supply?: Maybe<BN>;
  maxSupply?: Maybe<BN>;
  edition?: Maybe<BN>;
  creators?: Maybe<
    Array<
      Maybe<{
        __typename?: 'ArtworkCreator';
        address: string;
        share: number;
        verified: boolean;
      }>
    >
  >;
};

export type GetArtworksQueryVariables = Exact<{
  storeId: Scalars['String'];
  creatorId?: Maybe<Scalars['String']>;
  ownerId?: Maybe<Scalars['String']>;
  onlyVerified?: Maybe<Scalars['Boolean']>;
}>;

export type GetArtworksQuery = {
  __typename?: 'Query';
  artworks?: Maybe<
    Array<{
      __typename?: 'Artwork';
      pubkey: string;
      uri: string;
      title: string;
      mint?: Maybe<string>;
      sellerFeeBasisPoints: number;
      type: number;
      supply?: Maybe<BN>;
      maxSupply?: Maybe<BN>;
      edition?: Maybe<BN>;
      creators?: Maybe<
        Array<
          Maybe<{
            __typename?: 'ArtworkCreator';
            address: string;
            share: number;
            verified: boolean;
          }>
        >
      >;
    }>
  >;
};

export type GetArtworksByIdQueryVariables = Exact<{
  storeId: Scalars['String'];
  artId: Scalars['String'];
}>;

export type GetArtworksByIdQuery = {
  __typename?: 'Query';
  artwork?: Maybe<{
    __typename?: 'Artwork';
    pubkey: string;
    uri: string;
    title: string;
    mint?: Maybe<string>;
    sellerFeeBasisPoints: number;
    type: number;
    supply?: Maybe<BN>;
    maxSupply?: Maybe<BN>;
    edition?: Maybe<BN>;
    creators?: Maybe<
      Array<
        Maybe<{
          __typename?: 'ArtworkCreator';
          address: string;
          share: number;
          verified: boolean;
        }>
      >
    >;
  }>;
};

export type BidFragmentFragment = {
  __typename?: 'BidderMetadata';
  bidderPubkey: string;
  auctionPubkey: string;
  lastBid: BN;
  lastBidTimestamp: BN;
  cancelled: boolean;
};

export type AuctionFragmentFragment = {
  __typename?: 'Auction';
  pubkey: string;
  numWinners: BN;
  state: AuctionState;
  viewState: AuctionViewState;
  auctionGap?: Maybe<BN>;
  endAuctionAt?: Maybe<BN>;
  endedAt?: Maybe<BN>;
  lastBid?: Maybe<BN>;
  tokenMint: string;
  thumbnail?: Maybe<{ __typename?: 'Artwork'; uri: string; title: string }>;
  highestBid?: Maybe<{
    __typename?: 'BidderMetadata';
    bidderPubkey: string;
    auctionPubkey: string;
    lastBid: BN;
    lastBidTimestamp: BN;
    cancelled: boolean;
  }>;
  bidState: {
    __typename?: 'BidState';
    type: BidStateType;
    max: BN;
    bids: Array<Maybe<{ __typename?: 'Bid'; amount: BN; key: string }>>;
  };
  priceFloor: {
    __typename?: 'PriceFloor';
    hash: unknown;
    minPrice?: Maybe<BN>;
    type: PriceFloorType;
  };
  manager: {
    __typename?: 'AuctionManager';
    authority: string;
    participationConfig?: Maybe<{
      __typename?: 'ParticipationConfig';
      winnerConstraint?: Maybe<WinningConstraint>;
      nonWinningConstraint?: Maybe<NonWinningConstraint>;
      safetyDepositBoxIndex?: Maybe<number>;
      fixedPrice?: Maybe<BN>;
    }>;
  };
};

export type AuctionExtraFragmentFragment = {
  __typename?: 'Auction';
  bidState: {
    __typename?: 'BidState';
    type: BidStateType;
    max: BN;
    bids: Array<Maybe<{ __typename?: 'Bid'; amount: BN; key: string }>>;
  };
  bids: Array<{
    __typename?: 'BidderMetadata';
    bidderPubkey: string;
    auctionPubkey: string;
    lastBid: BN;
    lastBidTimestamp: BN;
    cancelled: boolean;
  }>;
  manager: {
    __typename?: 'AuctionManager';
    authority: string;
    safetyDepositBoxesExpected: BN;
    vault: string;
    safetyDepositBoxes: Array<{
      __typename?: 'SafetyDepositBox';
      key: VaultKey;
      vault: string;
      tokenMint: string;
      store: string;
      order: number;
    }>;
  };
};

export type GetAuctionsQueryVariables = Exact<{
  storeId: Scalars['String'];
  participantId?: Maybe<Scalars['String']>;
  state?: Maybe<AuctionInputState>;
}>;

export type GetAuctionsQuery = {
  __typename?: 'Query';
  auctions?: Maybe<
    Array<{
      __typename?: 'Auction';
      pubkey: string;
      numWinners: BN;
      state: AuctionState;
      viewState: AuctionViewState;
      auctionGap?: Maybe<BN>;
      endAuctionAt?: Maybe<BN>;
      endedAt?: Maybe<BN>;
      lastBid?: Maybe<BN>;
      tokenMint: string;
      thumbnail?: Maybe<{ __typename?: 'Artwork'; uri: string; title: string }>;
      highestBid?: Maybe<{
        __typename?: 'BidderMetadata';
        bidderPubkey: string;
        auctionPubkey: string;
        lastBid: BN;
        lastBidTimestamp: BN;
        cancelled: boolean;
      }>;
      bidState: {
        __typename?: 'BidState';
        type: BidStateType;
        max: BN;
        bids: Array<Maybe<{ __typename?: 'Bid'; amount: BN; key: string }>>;
      };
      priceFloor: {
        __typename?: 'PriceFloor';
        hash: unknown;
        minPrice?: Maybe<BN>;
        type: PriceFloorType;
      };
      manager: {
        __typename?: 'AuctionManager';
        authority: string;
        participationConfig?: Maybe<{
          __typename?: 'ParticipationConfig';
          winnerConstraint?: Maybe<WinningConstraint>;
          nonWinningConstraint?: Maybe<NonWinningConstraint>;
          safetyDepositBoxIndex?: Maybe<number>;
          fixedPrice?: Maybe<BN>;
        }>;
      };
    }>
  >;
};

export type GetAuctionByIdQueryVariables = Exact<{
  storeId: Scalars['String'];
  auctionId: Scalars['String'];
}>;

export type GetAuctionByIdQuery = {
  __typename?: 'Query';
  auction?: Maybe<{
    __typename?: 'Auction';
    pubkey: string;
    numWinners: BN;
    state: AuctionState;
    viewState: AuctionViewState;
    auctionGap?: Maybe<BN>;
    endAuctionAt?: Maybe<BN>;
    endedAt?: Maybe<BN>;
    lastBid?: Maybe<BN>;
    tokenMint: string;
    thumbnail?: Maybe<{ __typename?: 'Artwork'; uri: string; title: string }>;
    highestBid?: Maybe<{
      __typename?: 'BidderMetadata';
      bidderPubkey: string;
      auctionPubkey: string;
      lastBid: BN;
      lastBidTimestamp: BN;
      cancelled: boolean;
    }>;
    bidState: {
      __typename?: 'BidState';
      type: BidStateType;
      max: BN;
      bids: Array<Maybe<{ __typename?: 'Bid'; amount: BN; key: string }>>;
    };
    priceFloor: {
      __typename?: 'PriceFloor';
      hash: unknown;
      minPrice?: Maybe<BN>;
      type: PriceFloorType;
    };
    manager: {
      __typename?: 'AuctionManager';
      authority: string;
      safetyDepositBoxesExpected: BN;
      vault: string;
      participationConfig?: Maybe<{
        __typename?: 'ParticipationConfig';
        winnerConstraint?: Maybe<WinningConstraint>;
        nonWinningConstraint?: Maybe<NonWinningConstraint>;
        safetyDepositBoxIndex?: Maybe<number>;
        fixedPrice?: Maybe<BN>;
      }>;
      safetyDepositBoxes: Array<{
        __typename?: 'SafetyDepositBox';
        key: VaultKey;
        vault: string;
        tokenMint: string;
        store: string;
        order: number;
      }>;
    };
    bids: Array<{
      __typename?: 'BidderMetadata';
      bidderPubkey: string;
      auctionPubkey: string;
      lastBid: BN;
      lastBidTimestamp: BN;
      cancelled: boolean;
    }>;
  }>;
};

export type CreatorFragmentFragment = {
  __typename?: 'Creator';
  address: string;
  activated: boolean;
};

export type GetCreatorsQueryVariables = Exact<{
  storeId: Scalars['String'];
}>;

export type GetCreatorsQuery = {
  __typename?: 'Query';
  creators?: Maybe<
    Array<{ __typename?: 'Creator'; address: string; activated: boolean }>
  >;
};

export type GetCreatorWithArtworksQueryVariables = Exact<{
  storeId: Scalars['String'];
  creatorId: Scalars['String'];
}>;

export type GetCreatorWithArtworksQuery = {
  __typename?: 'Query';
  creator?: Maybe<{
    __typename?: 'Creator';
    address: string;
    activated: boolean;
  }>;
  artworks?: Maybe<
    Array<{
      __typename?: 'Artwork';
      pubkey: string;
      uri: string;
      title: string;
      mint?: Maybe<string>;
      sellerFeeBasisPoints: number;
      type: number;
      supply?: Maybe<BN>;
      maxSupply?: Maybe<BN>;
      edition?: Maybe<BN>;
      creators?: Maybe<
        Array<
          Maybe<{
            __typename?: 'ArtworkCreator';
            address: string;
            share: number;
            verified: boolean;
          }>
        >
      >;
    }>
  >;
};

export const ArtworkFragmentFragmentDoc = gql`
  fragment ArtworkFragment on Artwork {
    pubkey
    uri
    title
    creators {
      address
      share
      verified
    }
    mint
    sellerFeeBasisPoints
    type
    supply
    maxSupply
    edition
  }
`;
export const BidFragmentFragmentDoc = gql`
  fragment BidFragment on BidderMetadata {
    bidderPubkey
    auctionPubkey
    lastBid
    lastBidTimestamp
    cancelled
  }
`;
export const AuctionFragmentFragmentDoc = gql`
  fragment AuctionFragment on Auction {
    pubkey
    thumbnail {
      uri
      title
    }
    highestBid {
      ...BidFragment
    }
    bidState {
      type
      bids {
        amount
        key
      }
      max
    }
    priceFloor {
      hash
      minPrice
      type
    }
    manager {
      authority
      participationConfig {
        winnerConstraint
        nonWinningConstraint
        safetyDepositBoxIndex
        fixedPrice
      }
    }
    numWinners
    state
    viewState
    auctionGap
    endAuctionAt
    endedAt
    lastBid
    tokenMint
  }
  ${BidFragmentFragmentDoc}
`;
export const AuctionExtraFragmentFragmentDoc = gql`
  fragment AuctionExtraFragment on Auction {
    bidState {
      type
      bids {
        amount
        key
      }
      max
    }
    bids {
      ...BidFragment
    }
    manager {
      authority
      safetyDepositBoxesExpected
      safetyDepositBoxes {
        key
        vault
        tokenMint
        store
        order
      }
      vault
    }
  }
  ${BidFragmentFragmentDoc}
`;
export const CreatorFragmentFragmentDoc = gql`
  fragment CreatorFragment on Creator {
    address
    activated
  }
`;
export const GetArtworksDocument = gql`
  query getArtworks(
    $storeId: String!
    $creatorId: String
    $ownerId: String
    $onlyVerified: Boolean
  ) {
    artworks(
      filter: {
        storeId: $storeId
        creatorId: $creatorId
        ownerId: $ownerId
        onlyVerified: $onlyVerified
      }
    ) {
      ...ArtworkFragment
    }
  }
  ${ArtworkFragmentFragmentDoc}
`;

export function useGetArtworksQuery(
  options: Omit<Urql.UseQueryArgs<GetArtworksQueryVariables>, 'query'> = {},
) {
  return Urql.useQuery<GetArtworksQuery>({
    query: GetArtworksDocument,
    ...options,
  });
}
export const GetArtworksByIdDocument = gql`
  query getArtworksById($storeId: String!, $artId: String!) {
    artwork(storeId: $storeId, artId: $artId) {
      ...ArtworkFragment
    }
  }
  ${ArtworkFragmentFragmentDoc}
`;

export function useGetArtworksByIdQuery(
  options: Omit<Urql.UseQueryArgs<GetArtworksByIdQueryVariables>, 'query'> = {},
) {
  return Urql.useQuery<GetArtworksByIdQuery>({
    query: GetArtworksByIdDocument,
    ...options,
  });
}
export const GetAuctionsDocument = gql`
  query getAuctions(
    $storeId: String!
    $participantId: String
    $state: AuctionInputState
  ) {
    auctions(
      filter: {
        storeId: $storeId
        participantId: $participantId
        state: $state
      }
    ) {
      ...AuctionFragment
    }
  }
  ${AuctionFragmentFragmentDoc}
`;

export function useGetAuctionsQuery(
  options: Omit<Urql.UseQueryArgs<GetAuctionsQueryVariables>, 'query'> = {},
) {
  return Urql.useQuery<GetAuctionsQuery>({
    query: GetAuctionsDocument,
    ...options,
  });
}
export const GetAuctionByIdDocument = gql`
  query getAuctionById($storeId: String!, $auctionId: String!) {
    auction(auctionId: $auctionId) {
      ...AuctionFragment
      ...AuctionExtraFragment
    }
  }
  ${AuctionFragmentFragmentDoc}
  ${AuctionExtraFragmentFragmentDoc}
`;

export function useGetAuctionByIdQuery(
  options: Omit<Urql.UseQueryArgs<GetAuctionByIdQueryVariables>, 'query'> = {},
) {
  return Urql.useQuery<GetAuctionByIdQuery>({
    query: GetAuctionByIdDocument,
    ...options,
  });
}
export const GetCreatorsDocument = gql`
  query getCreators($storeId: String!) {
    creators(storeId: $storeId) {
      ...CreatorFragment
    }
  }
  ${CreatorFragmentFragmentDoc}
`;

export function useGetCreatorsQuery(
  options: Omit<Urql.UseQueryArgs<GetCreatorsQueryVariables>, 'query'> = {},
) {
  return Urql.useQuery<GetCreatorsQuery>({
    query: GetCreatorsDocument,
    ...options,
  });
}
export const GetCreatorWithArtworksDocument = gql`
  query getCreatorWithArtworks($storeId: String!, $creatorId: String!) {
    creator(storeId: $storeId, creatorId: $creatorId) {
      ...CreatorFragment
    }
    artworks(
      filter: { storeId: $storeId, creatorId: $creatorId, onlyVerified: true }
    ) {
      ...ArtworkFragment
    }
  }
  ${CreatorFragmentFragmentDoc}
  ${ArtworkFragmentFragmentDoc}
`;

export function useGetCreatorWithArtworksQuery(
  options: Omit<
    Urql.UseQueryArgs<GetCreatorWithArtworksQueryVariables>,
    'query'
  > = {},
) {
  return Urql.useQuery<GetCreatorWithArtworksQuery>({
    query: GetCreatorWithArtworksDocument,
    ...options,
  });
}
