import { Connection, clusterApiUrl } from '@solana/web3.js';
import { loadAccounts } from '@oyster/common/dist/lib/contexts/meta/loadAccounts';
import { MetaState } from '@oyster/common/dist/lib/contexts/meta/types';
import { subscribeAccountsChange } from '@oyster/common/dist/lib/contexts/meta/subscribeAccountsChange';
import { isCreatorPartOfTheStore } from '@oyster/common/dist/lib/models/index';
import { ParsedAccount } from '@oyster/common/dist/lib/contexts/accounts/types';
import { Context } from './context';
import { NexusGenInputs } from './generated/typings';

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

  private static configs: Record<string, ConnectionConfig> = {};
  private static states: Record<string, MetaState> = {};

  public static load() {
    if (!Object.keys(this.configs).length) {
      ENDPOINTS.forEach(({ name, endpoint }) => {
        const connection = new Connection(endpoint, 'recent');

        const loader = loadAccounts(connection, true);
        loader
          .then(state => {
            console.log(`🏝️  ${name} meta loaded`);
            this.states[name] = state;

            // XXX: there is a GAP before subscribe
            this.subscribe(name);
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

  async initialize({ context }: { context: Omit<Context, 'dataSources'> }) {
    MetaplexApi.load();
    await MetaplexApi.configByName(context.network).loader;
    this.state = MetaplexApi.stateByName(context.network);
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
    onlyVerified,
  }: NexusGenInputs['ArtworksInput']) {
    const whitelistedCreators = await this.getCreators(storeId);
    const creator =
      (creatorId &&
        whitelistedCreators.find(({ address }) => address === creatorId)) ||
      null;

    return mapInfo(this.state.metadata).filter(({ data }) => {
      return data.creators?.some(({ address, verified }) => {
        const inStore = whitelistedCreators.some(
          creator => creator.address === address,
        );
        const fromCreator = creator && address === creator.address;

        return (
          (!onlyVerified || verified) &&
          (!storeId || inStore) &&
          (!creatorId || fromCreator)
        );
      });
    });
  }

  async getArtwork(artId: string) {
    const art = this.state.metadata.find(({ pubkey }) => pubkey === artId);
    return art ? wrapPubkey(art) : null;
  }
}

const mapInfo = <T>(list: ParsedAccount<T>[]) => {
  return list.map(wrapPubkey);
};

const wrapPubkey = <T>({ pubkey, info }: ParsedAccount<T>) => ({
  ...info,
  pubkey,
});
