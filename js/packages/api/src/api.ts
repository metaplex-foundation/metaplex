import { Connection, clusterApiUrl } from '@solana/web3.js';
import { loadAccounts } from '@oyster/common/dist/lib/contexts/meta/loadAccounts';
import { MetaState } from '@oyster/common/dist/lib/contexts/meta/types';
import { subscribeAccountsChange } from '@oyster/common/dist/lib/contexts/meta/subscribeAccountsChange';
import { isCreatorPartOfTheStore } from '@oyster/common/dist/lib/models/index';
import { ParsedAccount } from '@oyster/common/dist/lib/contexts/accounts/types';
import { Context } from './context';

// XXX: re-use from `contexts/connection` ?
const ENDPOINTS = [
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
const DEFAULT_ENDPOINT = ENDPOINTS.find(({ name }) => name === 'devnet')!;

export const getData = async (): Promise<MetaState> => {
  const endpoint = DEFAULT_ENDPOINT.endpoint;
  const connection = new Connection(endpoint, 'recent');
  return loadAccounts(connection, true);
};

interface ConnectionConfig {
  connection: Connection;
  loader: ReturnType<typeof loadAccounts>;
  name: string;
}

export class MetaplexApi {
  state!: MetaState;
  private static configs: ConnectionConfig[];
  private static states: Record<string, MetaState> = {};

  public static load() {
    if (!this.configs) {
      this.configs = ENDPOINTS.map(({ name, endpoint }) => {
        const connection = new Connection(endpoint, 'recent');
        const loader = loadAccounts(connection, true);
        loader.then(state => {
          console.log(`🏝️  ${name} data for loaded`);
          this.states[name] = state;

          // XXX: there is a GAP before subscribe
          this.subscribe(name);
        });
        return {
          connection,
          loader,
          name,
        };
      });
    }
    return Promise.all(this.configs.map(c => c.loader));
  }

  private static subscribe(name: string) {
    const config = this.configs.find(c => c.name === name)!;
    subscribeAccountsChange(
      config.connection,
      true,
      () => this.states[name],
      (state: MetaState) => {
        this.states[name] = state;
      },
    );
  }

  async initialize({ context }: { context: Omit<Context, 'dataSources'> }) {
    await MetaplexApi.load();
    this.state =
      MetaplexApi.states[context.network || ''] ||
      MetaplexApi.states[DEFAULT_ENDPOINT.name];
  }

  // data methods

  getStore(storeId: string) {
    return this.state.stores[storeId]?.info;
  }

  async getCreators(storeId: string) {
    const creators = Object.values(this.state.creators);
    const creatorsByStore = [];

    for (const creator of creators) {
      const isWhitelistedCreator = await isCreatorPartOfTheStore(
        creator.info.address,
        creator.pubkey,
        storeId,
      );
      if (isWhitelistedCreator) {
        creatorsByStore.push(creator.info);
      }
    }
    return creatorsByStore;
  }

  async getCreator(storeId: string, creatorId?: string | null) {
    const creators = await this.getCreators(storeId);
    return creators.find(({ address }) => address === creatorId) || null;
  }

  async getArtworks(storeId: string, creatorId?: string | null) {
    const store = this.getStore(storeId);
    const creator = await this.getCreator(storeId, creatorId);
    if (creatorId && !creator?.activated) {
      return [];
    }

    const artworks = mapInfo(this.state.metadata);
    return artworks.filter(({ data: { creators } }) => {
      return creators?.some(({ address, verified }) => {
        return verified && (creatorId ? address === creatorId : store.public);
      });
    });
  }
}

const mapInfo = <T>(list: ParsedAccount<T>[]) => {
  return list.map(({ info }) => info);
};
