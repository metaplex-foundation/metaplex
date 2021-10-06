import type { FilterFn, IEvent } from "api";
import type {
  BidderMetadata,
  Edition,
  MasterEditionV1,
  MasterEditionV2,
  Metadata,
  MetaState,
  ParsedAccount,
  ParticipationConfigV1,
  SafetyDepositBox,
  Store,
  Vault,
  WhitelistedCreator,
} from "../common";
import type { NexusGenInputs } from "generated/typings";
import type { ResolverFn } from "graphql-subscriptions";
import type { Auction, AuctionManager, Fields } from "types/sourceTypes";

export type TPropNames = keyof MetaState;

export interface IMetaplexApiWrite {
  flush(): Promise<void>;
  persist(
    prop: TPropNames,
    key: string,
    value: ParsedAccount<any>
  ): Promise<void>;
  persistBatch(
    clazz: any,
    values: ParsedAccount<any>[],
    prop: TPropNames
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
  ): Promise<Fields<BidderMetadata> | null>;
  getAuctionThumbnail(auction: Auction): Promise<Fields<Metadata> | null>;
  getAuctionBids(auction: Auction): Promise<Fields<BidderMetadata>[]>;
  getSafetyDepositBoxes(
    manager: AuctionManager
  ): Promise<Fields<SafetyDepositBox>[]>;
  getParticipationConfig(
    manager: AuctionManager
  ): Promise<ParticipationConfigV1 | null>;
  getEdition(id?: string): Promise<Fields<Edition> | null>;
  getMasterEdition(
    id?: string
  ): Promise<Fields<MasterEditionV1 | MasterEditionV2> | null>;

  getVault(id?: string): Promise<Fields<Vault> | null>;
}
