import type { ResolverFn } from 'graphql-subscriptions';
import type {
  Edition,
  MasterEditionV1,
  MasterEditionV2,
  Metadata,
  MetaTypes,
  Store,
  WhitelistedCreator,
  TokenAccount,
} from '../common';
import type { NexusGenInputs } from '../generated/typings';
import type { FilterFn, IEvent } from './types';

export interface IReader {
  readonly networkName: string;
  init(): Promise<void>;
  subscribeIterator(
    prop: MetaTypes,
    key?: string | FilterFn<IEvent> | undefined,
  ): ResolverFn;
  loadUserAccounts(ownerId: string): Promise<TokenAccount[]>;

  storesCount(): Promise<number>;
  creatorsCount(): Promise<number>;
  artworksCount(): Promise<number>;
  auctionsCount(): Promise<number>;
  getStoreIds(): Promise<string[]>;
  getStores(): Promise<Store[]>;
  getStore(storeId: string): Promise<Store | null>;

  getCreatorIds(): Promise<string[]>;
  getCreators(storeId: string): Promise<WhitelistedCreator[]>;
  getCreator(
    storeId: string,
    creatorId: string,
  ): Promise<WhitelistedCreator | null>;

  getArtworks(args: NexusGenInputs['ArtworksInput']): Promise<Metadata[]>;
  getArtwork(artId: string): Promise<Metadata | null>;
  getEdition(id?: string): Promise<Edition | null>;
  getMasterEdition(
    id?: string,
  ): Promise<MasterEditionV1 | MasterEditionV2 | null>;

  // getAuction(auctionId: string): Promise<Auction | null>;
  // getAuctions({
  //   storeId,
  //   state,
  //   participantId,
  // }: NexusGenInputs['AuctionsInput']): Promise<Auction[]>;

  // getVault(id?: string): Promise<Vault | null>;
  // getAuctionHighestBid(
  //   auction: Auction,
  // ): Promise<BidderMetadata | null>;
  // getAuctionThumbnail(
  //   auction: Auction,
  // ): Promise<Metadata | null>;
  // getAuctionBids(auction: Auction): Promise<BidderMetadata[]>;
  // getSafetyDepositBoxes(
  //   manager: AuctionManager,
  // ): Promise<SafetyDepositBox[]>;
  //  getParticipationConfig(
  //   manager: AuctionManager,
  // ): Promise<ParticipationConfigV1 | null>;
}
