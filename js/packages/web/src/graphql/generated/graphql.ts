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
  BN: unknown;
  Buffer: Buffer;
  PublicKey: string;
  Uint8Array: number[];
};

export type AmountRange = {
  __typename?: 'AmountRange';
  amount?: Maybe<Scalars['BN']>;
  length?: Maybe<Scalars['BN']>;
};

export type Artwork = {
  __typename?: 'Artwork';
  pubkey: Scalars['PublicKey'];
  uri: Scalars['String'];
  title: Scalars['String'];
  mint?: Maybe<Scalars['PublicKey']>;
  creators?: Maybe<Array<Maybe<ArtworkCreator>>>;
  sellerFeeBasisPoints: Scalars['Int'];
  type: Scalars['Int'];
  supply?: Maybe<Scalars['BN']>;
  maxSupply?: Maybe<Scalars['BN']>;
  edition?: Maybe<Scalars['BN']>;
};

export type ArtworkCreator = {
  __typename?: 'ArtworkCreator';
  address: Scalars['PublicKey'];
  verified: Scalars['Boolean'];
  share: Scalars['Int'];
};

export type ArtworksInput = {
  storeId: Scalars['String'];
  creatorId?: Maybe<Scalars['String']>;
  ownerId?: Maybe<Scalars['String']>;
  artId?: Maybe<Scalars['String']>;
  onlyVerified?: Maybe<Scalars['Boolean']>;
};

export type Auction = {
  __typename?: 'Auction';
  /** Pubkey of the authority with permission to modify this auction. */
  authority?: Maybe<Scalars['PublicKey']>;
  /** Token mint for the SPL token being used to bid */
  tokenMint?: Maybe<Scalars['PublicKey']>;
  /** The time the last bid was placed, used to keep track of auction timing. */
  lastBid?: Maybe<Scalars['BN']>;
  /** Slot time the auction was officially ended by. */
  endedAt?: Maybe<Scalars['BN']>;
  /** End time is the cut-off point that the auction is forced to end by. */
  endAuctionAt?: Maybe<Scalars['BN']>;
  /** Gap time is the amount of time in slots after the previous bid at which the auction ends. */
  auctionGap?: Maybe<Scalars['BN']>;
  /** Minimum price for any bid to meet. */
  priceFloor?: Maybe<PriceFloor>;
  /** The state the auction is in, whether it has started or ended. */
  state?: Maybe<AuctionState>;
  /** Auction Bids, each user may have one bid open at a time. */
  bidState?: Maybe<BidState>;
  /** Used for precalculation on the front end, not a backend key */
  bidRedemptionKey?: Maybe<Scalars['PublicKey']>;
};

export type AuctionDataExtended = {
  __typename?: 'AuctionDataExtended';
  totalUncancelledBids?: Maybe<Scalars['BN']>;
  tickSize?: Maybe<Scalars['BN']>;
  gapTickSizePercentage?: Maybe<Scalars['Int']>;
};

export type AuctionManagerV1 = {
  __typename?: 'AuctionManagerV1';
  key?: Maybe<MetaplexKey>;
};

export type AuctionManagerV2 = {
  __typename?: 'AuctionManagerV2';
  key?: Maybe<MetaplexKey>;
};

export enum AuctionState {
  Created = 'Created',
  Started = 'Started',
  Ended = 'Ended',
}

export type Bid = {
  __typename?: 'Bid';
  key?: Maybe<Scalars['PublicKey']>;
  amount?: Maybe<Scalars['BN']>;
};

export type BidRedemptionTicket = {
  __typename?: 'BidRedemptionTicket';
  key?: Maybe<MetaplexKey>;
};

export type BidState = {
  __typename?: 'BidState';
  type?: Maybe<BidStateType>;
  bids?: Maybe<Array<Maybe<Bid>>>;
  max?: Maybe<Scalars['BN']>;
};

export enum BidStateType {
  EnglishAuction = 'EnglishAuction',
  OpenEdition = 'OpenEdition',
}

export type BidderMetadata = {
  __typename?: 'BidderMetadata';
  /** Relationship with the bidder who's metadata this covers. */
  bidderPubkey?: Maybe<Scalars['PublicKey']>;
  /** Relationship with the auction this bid was placed on. */
  auctionPubkey?: Maybe<Scalars['PublicKey']>;
  /** Amount that the user bid */
  lastBid?: Maybe<Scalars['BN']>;
  /** Tracks the last time this user bid. */
  lastBidTimestamp?: Maybe<Scalars['BN']>;
  /**
   * Whether the last bid the user made was cancelled. This should also be enough to know if the
   * user is a winner, as if cancelled it implies previous bids were also cancelled.
   */
  cancelled?: Maybe<Scalars['Boolean']>;
};

export type BidderPot = {
  __typename?: 'BidderPot';
  /** Points at actual pot that is a token account */
  bidderPot?: Maybe<Scalars['PublicKey']>;
  bidderAct?: Maybe<Scalars['PublicKey']>;
  auctionAct?: Maybe<Scalars['PublicKey']>;
  emptied?: Maybe<Scalars['Boolean']>;
};

export type Creator = {
  __typename?: 'Creator';
  pubkey?: Maybe<Scalars['PublicKey']>;
  key?: Maybe<MetaplexKey>;
  address?: Maybe<Scalars['PublicKey']>;
  activated?: Maybe<Scalars['Boolean']>;
};

export type Edition = {
  __typename?: 'Edition';
  key?: Maybe<MetadataKey>;
  /** Points at MasterEdition struct */
  parent?: Maybe<Scalars['PublicKey']>;
  /** Starting at 0 for master record, this is incremented for each edition minted */
  edition?: Maybe<Scalars['BN']>;
};

export type MasterEdition = MasterEditionV1 | MasterEditionV2;

export type MasterEditionV1 = {
  __typename?: 'MasterEditionV1';
  key?: Maybe<MetadataKey>;
  supply?: Maybe<Scalars['BN']>;
  maxSupply?: Maybe<Scalars['BN']>;
  printingMint?: Maybe<Scalars['PublicKey']>;
  oneTimePrintingAuthorizationMint?: Maybe<Scalars['PublicKey']>;
};

export type MasterEditionV2 = {
  __typename?: 'MasterEditionV2';
  key?: Maybe<MetadataKey>;
  supply?: Maybe<Scalars['BN']>;
  maxSupply?: Maybe<Scalars['BN']>;
};

export enum MetadataKey {
  Uninitialized = 'Uninitialized',
  MetadataV1 = 'MetadataV1',
  EditionV1 = 'EditionV1',
  MasterEditionV1 = 'MasterEditionV1',
  MasterEditionV2 = 'MasterEditionV2',
  EditionMarker = 'EditionMarker',
}

export enum MetaplexKey {
  Uninitialized = 'Uninitialized',
  OriginalAuthorityLookupV1 = 'OriginalAuthorityLookupV1',
  BidRedemptionTicketV1 = 'BidRedemptionTicketV1',
  StoreV1 = 'StoreV1',
  WhitelistedCreatorV1 = 'WhitelistedCreatorV1',
  PayoutTicketV1 = 'PayoutTicketV1',
  SafetyDepositValidationTicketV1 = 'SafetyDepositValidationTicketV1',
  AuctionManagerV1 = 'AuctionManagerV1',
  PrizeTrackingTicketV1 = 'PrizeTrackingTicketV1',
  SafetyDepositConfigV1 = 'SafetyDepositConfigV1',
  AuctionManagerV2 = 'AuctionManagerV2',
  BidRedemptionTicketV2 = 'BidRedemptionTicketV2',
  AuctionWinnerTokenTypeTrackerV1 = 'AuctionWinnerTokenTypeTrackerV1',
}

export enum NonWinningConstraint {
  NoParticipationPrize = 'NoParticipationPrize',
  GivenForFixedPrice = 'GivenForFixedPrice',
  GivenForBidPrice = 'GivenForBidPrice',
}

export type ParticipationConfigV2 = {
  __typename?: 'ParticipationConfigV2';
  winnerConstraint?: Maybe<WinningConstraint>;
  nonWinningConstraint?: Maybe<NonWinningConstraint>;
  fixedPrice?: Maybe<Scalars['BN']>;
};

export type ParticipationStateV2 = {
  __typename?: 'ParticipationStateV2';
  collectedToAcceptPayment?: Maybe<Scalars['BN']>;
};

export type PayoutTicket = {
  __typename?: 'PayoutTicket';
  key?: Maybe<MetaplexKey>;
  recipient?: Maybe<Scalars['PublicKey']>;
  amountPaid?: Maybe<Scalars['BN']>;
};

export type PriceFloor = {
  __typename?: 'PriceFloor';
  type?: Maybe<PriceFloorType>;
  minPrice?: Maybe<Scalars['BN']>;
  /**
   * It's an array of 32 u8s, when minimum, only first 8 are used (a u64), when blinded price, the entire
   * thing is a hash and not actually a public key, and none is all zeroes
   */
  hash?: Maybe<Scalars['Uint8Array']>;
};

export enum PriceFloorType {
  None = 'None',
  Minimum = 'Minimum',
  BlindedPrice = 'BlindedPrice',
}

export type PrizeTrackingTicket = {
  __typename?: 'PrizeTrackingTicket';
  key?: Maybe<MetaplexKey>;
  metadata?: Maybe<Scalars['PublicKey']>;
  supplySnapshot?: Maybe<Scalars['BN']>;
  expectedRedemptions?: Maybe<Scalars['BN']>;
  redemptions?: Maybe<Scalars['BN']>;
};

export type Query = {
  __typename?: 'Query';
  storesCount?: Maybe<Scalars['Int']>;
  creatorsCount?: Maybe<Scalars['Int']>;
  artworksCount?: Maybe<Scalars['Int']>;
  auctionsCount?: Maybe<Scalars['Int']>;
  store?: Maybe<Store>;
  creators?: Maybe<Array<Maybe<Creator>>>;
  creator?: Maybe<Creator>;
  artworks?: Maybe<Array<Maybe<Artwork>>>;
  artwork?: Maybe<Artwork>;
};

export type QueryStoreArgs = {
  storeId: Scalars['String'];
};

export type QueryCreatorsArgs = {
  storeId: Scalars['String'];
};

export type QueryCreatorArgs = {
  storeId: Scalars['String'];
  creatorId: Scalars['String'];
};

export type QueryArtworksArgs = {
  filter: ArtworksInput;
};

export type QueryArtworkArgs = {
  artId: Scalars['String'];
};

export type SafetyDepositBox = {
  __typename?: 'SafetyDepositBox';
  /** Each token type in a vault has it's own box that contains it's mint and a look-back */
  key?: Maybe<VaultKey>;
  /** @deprecated VaultKey pointing to the parent vault */
  vault?: Maybe<Scalars['PublicKey']>;
  /** This particular token's mint */
  tokenMint?: Maybe<Scalars['PublicKey']>;
  /** Account that stores the tokens under management */
  store?: Maybe<Scalars['PublicKey']>;
  /** @deprecated The order in the array of registries */
  order?: Maybe<Scalars['Int']>;
};

export type SafetyDepositConfig = {
  __typename?: 'SafetyDepositConfig';
  key?: Maybe<MetaplexKey>;
  auctionManager?: Maybe<Scalars['PublicKey']>;
  order?: Maybe<Scalars['BN']>;
  winningConfigType?: Maybe<WinningConfigType>;
  amountType?: Maybe<TupleNumericType>;
  lengthType?: Maybe<TupleNumericType>;
  amountRanges?: Maybe<Array<Maybe<AmountRange>>>;
  participationConfig?: Maybe<ParticipationConfigV2>;
  participationState?: Maybe<ParticipationStateV2>;
};

export type Store = {
  __typename?: 'Store';
  pubkey?: Maybe<Scalars['PublicKey']>;
  key?: Maybe<MetaplexKey>;
  public?: Maybe<Scalars['Boolean']>;
  auctionProgram?: Maybe<Scalars['PublicKey']>;
  tokenVaultProgram?: Maybe<Scalars['PublicKey']>;
  tokenMetadataProgram?: Maybe<Scalars['PublicKey']>;
  tokenProgram?: Maybe<Scalars['PublicKey']>;
};

export enum TupleNumericType {
  U8 = 'U8',
  U16 = 'U16',
  U32 = 'U32',
  U64 = 'U64',
}

export type Vault = {
  __typename?: 'Vault';
  key?: Maybe<VaultKey>;
  /** @deprecated Store token program used */
  tokenProgram?: Maybe<Scalars['PublicKey']>;
  /** Mint that produces the fractional shares */
  fractionMint?: Maybe<Scalars['PublicKey']>;
  /** Authority who can make changes to the vault */
  authority?: Maybe<Scalars['PublicKey']>;
  /** treasury where fractional shares are held for redemption by authority */
  fractionTreasury?: Maybe<Scalars['PublicKey']>;
  /** treasury where monies are held for fractional share holders to redeem(burn) shares once buyout is made */
  redeemTreasury?: Maybe<Scalars['PublicKey']>;
  /** Can authority mint more shares from fraction_mint after activation */
  allowFurtherShareCreation?: Maybe<Scalars['Boolean']>;
  /** Must point at an ExternalPriceAccount, which gives permission and price for buyout. */
  pricingLookupAddress?: Maybe<Scalars['PublicKey']>;
  /**
   * In inactive state, we use this to set the order key on Safety Deposit Boxes being added and
   * then we increment it and save so the next safety deposit box gets the next number.
   * In the Combined state during token redemption by authority, we use it as a decrementing counter each time
   * The authority of the vault withdrawals a Safety Deposit contents to count down how many
   * are left to be opened and closed down. Once this hits zero, and the fraction mint has zero shares,
   * then we can deactivate the vault.
   */
  tokenTypeCount?: Maybe<Scalars['Int']>;
  /**
   * Once combination happens, we copy price per share to vault so that if something nefarious happens
   * to external price account, like price change, we still have the math 'saved' for use in our calcs
   */
  lockedPricePerShare?: Maybe<Scalars['BN']>;
  state?: Maybe<VaultState>;
};

export enum VaultKey {
  Uninitialized = 'Uninitialized',
  VaultV1 = 'VaultV1',
  SafetyDepositBoxV1 = 'SafetyDepositBoxV1',
  ExternalPriceAccountV1 = 'ExternalPriceAccountV1',
}

export enum VaultState {
  Inactive = 'Inactive',
  Active = 'Active',
  Combined = 'Combined',
  Deactivated = 'Deactivated',
}

export enum WinningConfigType {
  TokenOnlyTransfer = 'TokenOnlyTransfer',
  FullRightsTransfer = 'FullRightsTransfer',
  PrintingV1 = 'PrintingV1',
  PrintingV2 = 'PrintingV2',
  Participation = 'Participation',
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
  supply?: Maybe<unknown>;
  maxSupply?: Maybe<unknown>;
  edition?: Maybe<unknown>;
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
    Array<
      Maybe<{
        __typename?: 'Artwork';
        pubkey: string;
        uri: string;
        title: string;
        mint?: Maybe<string>;
        sellerFeeBasisPoints: number;
        type: number;
        supply?: Maybe<unknown>;
        maxSupply?: Maybe<unknown>;
        edition?: Maybe<unknown>;
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
    >
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
    supply?: Maybe<unknown>;
    maxSupply?: Maybe<unknown>;
    edition?: Maybe<unknown>;
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

export type CreatorFragmentFragment = {
  __typename?: 'Creator';
  address?: Maybe<string>;
  activated?: Maybe<boolean>;
};

export type GetCreatorsQueryVariables = Exact<{
  storeId: Scalars['String'];
}>;

export type GetCreatorsQuery = {
  __typename?: 'Query';
  creators?: Maybe<
    Array<
      Maybe<{
        __typename?: 'Creator';
        address?: Maybe<string>;
        activated?: Maybe<boolean>;
      }>
    >
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
    address?: Maybe<string>;
    activated?: Maybe<boolean>;
  }>;
  artworks?: Maybe<
    Array<
      Maybe<{
        __typename?: 'Artwork';
        pubkey: string;
        uri: string;
        title: string;
        mint?: Maybe<string>;
        sellerFeeBasisPoints: number;
        type: number;
        supply?: Maybe<unknown>;
        maxSupply?: Maybe<unknown>;
        edition?: Maybe<unknown>;
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
    >
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
    artwork(artId: $artId) {
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
