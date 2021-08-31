import { Connection, clusterApiUrl } from '@solana/web3.js';
import { loadAccounts } from '@oyster/common/dist/lib/contexts/meta/loadAccounts';
import { MetaState } from '@oyster/common/dist/lib/contexts/meta/types';
import { subscribeAccountsChange } from '@oyster/common/dist/lib/contexts/meta/subscribeAccountsChange';
import { isCreatorPartOfTheStore } from '@oyster/common/dist/lib/models/index';
import { Context } from './context';
import { NexusGenInputs } from './generated/typings';
import { loadUserTokenAccounts } from './utils/loadUserTokenAccounts';
import { filterByOwner, filterByStoreAndCreator } from './artwork/filters';
import {
  filterByParticipant,
  filterByState,
  getAuctionById,
  getAuctionsByStoreId,
} from './auction/filters';
import { mapInfo, wrapPubkey } from './utils/mapInfo';

// XXX: re-use list from `contexts/connection` ?
export const ENDPOINTS = [
  // TODO: uncomment this
  // TODO: check other mainnets (Solana, Serum)
  // {
  //   name: 'mainnet-beta',
  //   endpoint: 'https://api.metaplex.solana.com/',
  // },
  // {
  //   name: 'testnet',
  //   endpoint: clusterApiUrl('testnet'),
  // },
  {
    name: 'devnet',
    endpoint: clusterApiUrl('devnet'),
  },
];

// TODO: set to mainnet-beta
export const DEFAULT_ENDPOINT = ENDPOINTS.find(
  ({ name }) => name === 'devnet',
)!;

interface ConnectionConfig {
  connection: Connection;
  loader: Promise<any>;
  name: string;
}

export class MetaplexApi {
  state!: MetaState;
  config!: ConnectionConfig;

  private static configs: Record<string, ConnectionConfig> = {};
  private static states: Record<string, MetaState> = {};

  public static load(skipSubscriptions = false) {
    if (!Object.keys(this.configs).length) {
      ENDPOINTS.forEach(({ name, endpoint }) => {
        const connection = new Connection(endpoint, 'recent');

        const loader = loadAccounts(connection, true);
        loader
          .then(state => {
            console.log(`🏝️  ${name} meta loaded`);
            this.states[name] = state;

            // XXX: there is a GAP before subscribe
            if (!skipSubscriptions) this.subscribe(name);
          })
          .catch(e => console.error(e));

        this.configs[name] = {
          connection,
          loader: Promise.all([loader]),
          name,
        };
      });
    }
    return Promise.all(Object.values(this.configs).map(c => c.loader));
  }

  private static subscribe(name: string) {
    const config = this.configs[name];
    subscribeAccountsChange(
      config.connection,
      true,
      () => this.states[name],
      (state: MetaState) => {
        this.states[name] = state;
      },
    );
  }

  private static configByName(name?: string) {
    return this.configs[name || ''] || this.configs[DEFAULT_ENDPOINT.name];
  }

  private static stateByName(name?: string) {
    return this.states[name || ''] || MetaplexApi.states[DEFAULT_ENDPOINT.name];
  }

  // instance methods

  async initialize({ context }: { context: Omit<Context, 'dataSources'> }) {
    MetaplexApi.load();
    this.config = MetaplexApi.configByName(context.network);
    await this.config.loader;
    this.state = MetaplexApi.stateByName(context.network);
  }

  loadUserAccounts(ownerId: string) {
    const { connection } = this.config;
    return loadUserTokenAccounts(connection, ownerId);
  }

  // meta methods

  getStore(storeId: string) {
    const store = this.state.stores[storeId];
    return store ? wrapPubkey(store) : null;
  }

  async getCreators(storeId: string) {
    const store = this.getStore(storeId);
    const creators = Object.values(this.state.creators);
    const creatorsByStore = [];
    if (!store) return [];

    for (const creator of creators) {
      const isWhitelistedCreator = await isCreatorPartOfTheStore(
        creator.info.address,
        creator.pubkey,
        storeId,
      );
      if (isWhitelistedCreator) {
        creatorsByStore.push(creator);
      }
    }
    return mapInfo(creatorsByStore);
  }

  async getCreator(storeId: string, creatorId?: string | null) {
    const creators = await this.getCreators(storeId);
    return creators.find(({ address }) => address === creatorId) || null;
  }

  async getArtworks({
    storeId,
    creatorId,
    ownerId,
    onlyVerified,
  }: NexusGenInputs['ArtworksInput']) {
    const storeFilter = await filterByStoreAndCreator(
      { storeId, creatorId, onlyVerified },
      this,
    );

    const ownerFilter = await filterByOwner({ ownerId }, this);

    return mapInfo(this.state.metadata).filter(
      art => storeFilter(art) && ownerFilter(art),
    );
  }

  getArtwork(artId: string) {
    const art = this.state.metadata.find(({ pubkey }) => pubkey === artId);
    return art ? wrapPubkey(art) : null;
  }

  getAuctions({
    storeId,
    state,
    participantId,
  }: NexusGenInputs['AuctionsInput']) {
    const stateFilter = filterByState({ state }, this);
    const participantFilter = filterByParticipant({ participantId }, this);
    return getAuctionsByStoreId(this.state, storeId).filter(
      auction => stateFilter(auction) && participantFilter(auction),
    );
  }

  getAuction(auctionId: string) {
    return getAuctionById(this.state, auctionId);
  }
}
