import { Connection, PublicKey } from '@solana/web3.js';
import { ENDPOINTS } from '@oyster/common/dist/lib/contexts/connection';
import { loadAccounts } from '@oyster/common/dist/lib/contexts/meta/loadAccounts';
import { MetaState } from '@oyster/common/dist/lib/contexts/meta/types';
import { subscribeAccountsChange } from '@oyster/common/dist/lib/contexts/meta/subscribeAccountsChange';
import { isCreatorPartOfTheStore } from '@oyster/common/dist/lib/models/index';
import { ParsedAccount } from '@oyster/common/dist/lib/contexts/accounts/types';

// const endpoint = ENDPOINTS[0].endpoint;
const endpoint = ENDPOINTS.find(({ name }) => name === 'devnet')!.endpoint;

export const getData = async (): Promise<MetaState> => {
  const connection = new Connection(endpoint, 'recent');
  return loadAccounts(connection, true);
};

export class DataApi {
  private static loader?: Promise<MetaState>;
  private static connection: Connection;
  private static state: MetaState;

  private static firstLoad() {
    if (!this.loader) {
      this.connection = new Connection(endpoint, 'recent');
      this.loader = loadAccounts(this.connection, true);
      this.loader.then(state => {
        this.state = state;
        this.subscribe();
      });
    }
    return this.loader;
  }

  private static subscribe() {
    subscribeAccountsChange(
      this.connection,
      true,
      () => this.state,
      (state: MetaState) => {
        this.state = state;
      },
    );
  }

  async initialize(config: any) {
    await DataApi.firstLoad();
  }

  get state() {
    return DataApi.state;
  }

  getState() {
    return DataApi.state;
  }

  getCreators(creatorId?: string | null) {
    let creators = mapInfo(Object.values(DataApi.state.creators));

    if (creatorId) {
      creators = creators.filter(({ address }) => address === creatorId);
    }
    return creators;
  }

  async getCreatorsByStore(storeId: string) {
    const creators = Object.values(DataApi.state.creators);
    const creatorsByStore = [];

    for (const creator of creators) {
      const isLookedCreator = await isCreatorPartOfTheStore(
        creator.info.address,
        creator.pubkey,
        storeId,
      );
      if (isLookedCreator) {
        creatorsByStore.push(creator.info);
      }
    }
    return creatorsByStore;
  }

  async getCreatorByStore(storeId: string, creatorId: string) {
    const creators = await this.getCreatorsByStore(storeId);
    return creators.find(({ address }) => address === creatorId) || null;
  }

  getCreatorArtworks(creatorId: string) {
    const artworks = mapInfo(DataApi.state.metadata);
    return artworks.filter(({ data }) => {
      return data.creators?.some(({ address }) => address === creatorId);
    });
  }
}

const mapInfo = <T>(list: ParsedAccount<T>[]) => {
  return list.map(({ info }) => info);
};
