import type { FilterFn, IEvent } from "api";
import type BN from "bn.js";
import type {
  BidderMetadata,
  Metadata,
  MetaState,
  ParsedAccount,
  Store,
  WhitelistedCreator,
} from "common";
import type { NexusGenInputs } from "generated/typings";
import type { ResolverFn } from "graphql-subscriptions";
import type { Artwork, Auction, Fields } from "types/sourceTypes";

export type TPropNames = keyof MetaState;

export interface IMetaplexApiWrite {
  persist(
    prop: TPropNames,
    key: string,
    value: ParsedAccount<any>
  ): Promise<void>;
  persistBatch(
    batch: Array<[TPropNames, string, ParsedAccount<any>]>
  ): Promise<void>;
}

export interface IMetaplexApi extends IMetaplexApiWrite {
  readonly network: string;
  preload(): Promise<void>;
  subscribeIterator(
    prop: keyof MetaState,
    key?: string | FilterFn<IEvent> | undefined
  ): ResolverFn;

  getCreator(
    storeId: string,
    creatorId?: string | null | undefined
  ): Promise<Fields<WhitelistedCreator> | null>;
  getCreators(storeId: string): Promise<Fields<WhitelistedCreator>[]>;

  getAuction(auctionId: string): Promise<Auction | null>;
  getAuctions({
    storeId,
    state,
    participantId,
  }: NexusGenInputs["AuctionsInput"]): Promise<Auction[]>;

  getArtwork(artId: string): Promise<Fields<Metadata> | null>;
  getArtworks({
    storeId,
    creatorId,
    ownerId,
    onlyVerified,
  }: NexusGenInputs["ArtworksInput"]): Promise<Fields<Metadata>[]>;

  getStore(storeId: string): Promise<Fields<Store> | null>;
  getStores(): Promise<Fields<Store>[]>;

  storesCount(): Promise<number>;
  creatorsCount(): Promise<number>;
  artworksCount(): Promise<number>;
  auctionsCount(): Promise<number>;
  getAuctionHighestBid(
    auction: Auction
  ): Promise<ParsedAccount<BidderMetadata>>;
  getAuctionThumbnail(auction: Auction): Promise<Fields<Metadata> | null>;

  artType(item: Artwork): Promise<0 | 1 | 2>;
  artSupply(item: Artwork): Promise<BN | undefined>;
  artMaxSupply(item: Artwork): Promise<BN | undefined>;
  artEditionNumber(item: Artwork): Promise<BN | undefined>;
}
