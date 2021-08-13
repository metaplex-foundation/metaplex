import { Connection, PublicKey } from '@solana/web3.js';
import { ENDPOINTS } from '@oyster/common/dist/lib/contexts/connection';
import { loadAccounts } from '@oyster/common/dist/lib/contexts/meta/loadAccounts';
import {
  MetaState,
  subscribeAccountsChange,
} from '@oyster/common/dist/lib/contexts/meta/index';
import { isCreatorPartOfTheStore } from '@oyster/common/dist/lib/models/index';

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

  async getCreatorsByStore(storeId: string) {
    const creators = Object.values(DataApi.state.creators);
    const store = new PublicKey(storeId);
    const creatorsByStore: typeof creators = [];

    for (const creator of creators) {
      const isLookedCreator = await isCreatorPartOfTheStore(
        creator.info.address,
        creator.pubkey,
        store,
      );
      if (isLookedCreator) {
        creatorsByStore.push(creator);
      }
    }
    return creatorsByStore;
  }
}
