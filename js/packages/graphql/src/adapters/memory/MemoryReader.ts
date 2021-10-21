import { Connection } from '@solana/web3.js';
import {
  isCreatorPartOfTheStore,
  loadUserTokenAccounts,
  MetaTypes,
  WhitelistedCreator,
} from '../../common';
import { NexusGenInputs } from '../../generated/typings';
import { IReader, IEvent, FilterFn } from '../../reader';
import { filterByOwner } from './filterByOwner';
import { filterByStoreAndCreator } from './filterByStoreAndCreator';
import { MemoryWriter } from './MemoryWriter';
import { createPipelineExecutor } from '../../utils/createPipelineExecutor';
import { PubSub, withFilter } from 'graphql-subscriptions';

export class MemoryReader implements IReader {
  constructor(
    public networkName: string,
    private connection: Connection,
    private writer: MemoryWriter,
  ) {}

  loadUserAccounts(ownerId: string) {
    const { connection } = this;
    return loadUserTokenAccounts(connection, ownerId);
  }

  private readonly pubsub = new PubSub();

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

  async init() {
    this.writer.setPublishFn((prop, key) => {
      const ref = this.state[prop];
      const value = ref.get(key);
      const obj: IEvent = { prop, key, value };
      this.pubsub.publish(prop, obj);
    });
  }

  get state() {
    return this.writer.getState();
  }

  async storesCount() {
    return this.state.stores.size;
  }

  async creatorsCount() {
    return this.state.creators.size;
  }

  async artworksCount() {
    return this.state.metadata.size;
  }

  async auctionsCount() {
    return this.state.auctions.size;
  }

  async getStoreIds(): Promise<string[]> {
    return Array.from(this.state.stores.keys());
  }

  async getStores() {
    const { stores } = this.state;
    return Array.from(stores.values());
  }

  async getStore(storeId: string) {
    const { stores } = this.state;
    const store = stores.get(storeId);
    return store || null;
  }

  async getCreatorIds(): Promise<string[]> {
    return Array.from(this.state.creators.keys());
  }

  async getCreators(storeId: string) {
    const store = this.getStore(storeId);
    if (!store) return [];
    const creatorsByStore: WhitelistedCreator[] = [];

    await createPipelineExecutor(
      this.state.creators.values(),
      async creator => {
        const isWhitelistedCreator = await isCreatorPartOfTheStore(
          creator.address,
          creator.pubkey,
          storeId,
        );
        if (isWhitelistedCreator) {
          creatorsByStore.push(creator);
        }
      },
      {
        jobsCount: 3,
      },
    );
    return creatorsByStore;
  }

  async getCreator(storeId: string, creatorId: string) {
    const store = this.getStore(storeId);
    if (!store) return null;
    const creator = this.state.creators.get(creatorId);
    const isWhitelistedCreator =
      creator &&
      (await isCreatorPartOfTheStore(
        creator?.address,
        creator.pubkey,
        storeId,
      ));
    return (isWhitelistedCreator && creator) || null;
  }

  async getArtworks({
    storeId,
    creatorId,
    ownerId,
    onlyVerified,
  }: NexusGenInputs['ArtworksInput']) {
    const storeCreators = await this.getCreators(storeId);
    const [storeFilter, ownerFilter] = await Promise.all([
      filterByStoreAndCreator(
        { storeId, creatorId, onlyVerified },
        storeCreators,
      ),
      filterByOwner({ ownerId }, this.loadUserAccounts),
    ]);

    const metadata = Array.from(this.state.metadata.values());
    return metadata.filter(art => storeFilter(art) && ownerFilter(art));
  }

  async getArtwork(artId: string) {
    const art = this.state.metadata.get(artId);
    return art || null;
  }

  async getEdition(id?: string) {
    return (id && this.state.editions.get(id)) || null;
  }

  async getMasterEdition(id?: string) {
    return (id && this.state.masterEditions.get(id)) || null;
  }
}
