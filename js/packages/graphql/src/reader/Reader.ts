import { Connection } from '@solana/web3.js';
import { PubSub, withFilter } from 'graphql-subscriptions';
import {
  Edition,
  MasterEditionV1,
  MasterEditionV2,
  Metadata,
  MetaTypes,
  Store,
  WhitelistedCreator,
  loadUserTokenAccounts,
} from '../common';
import { NexusGenInputs } from '../generated/typings';
import { FilterFn, IEvent } from './types';

export interface IReader {
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

export abstract class ReaderBase {
  protected readonly pubsub = new PubSub();

  abstract networkName: string;
  abstract init(): Promise<void>;

  constructor(public connection: Connection) {}

  loadUserAccounts(ownerId: string) {
    const { connection } = this;
    return loadUserTokenAccounts(connection, ownerId);
  }

  subscribeIterator(prop: MetaTypes, key?: string | FilterFn<IEvent>) {
    const iter = () => this.pubsub.asyncIterator<IEvent>(prop);
    if (key !== undefined) {
      if (typeof key === 'string') {
        return withFilter(iter, (payload: IEvent) => {
          return payload.key === key;
        });
      }
      return withFilter(iter, key);
    }
    return iter;
  }
}

export type Reader = ReaderBase & IReader;
