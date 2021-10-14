import { getServer } from './startApolloServer';
import { Store, WhitelistedCreator } from '../common';
import { IReader, MetaplexDataSource } from '../reader';

describe('stub', () => {
  it('test', () => {
    expect(true).toBeTruthy();
  });
});

describe('startApolloServer', () => {
  async function setup(aReader: Partial<IReader>) {
    const reader = Object.assign({}, aReader);
    const api = new MetaplexDataSource({
      init() {
        return Promise.resolve();
      },
      getReader() {
        return reader as any;
      },
      getWriter() {
        return null as any;
      },
      getConnection() {
        return null as any;
      },
    });
    const { apolloServer } = await getServer(api);
    return apolloServer;
  }

  it('it works', async () => {
    const server = await setup({});
    const result = await server.executeOperation({
      query: 'query { __typename }',
      variables: {},
    });
    expect(result.errors).toBeUndefined();
    expect({
      __typename: 'Query',
    }).toEqual(result.data);
  });

  it('counts', async () => {
    const server = await setup({
      storesCount: () => Promise.resolve(1),
      creatorsCount: () => Promise.resolve(2),
      artworksCount: () => Promise.resolve(3),
      auctionsCount: () => Promise.resolve(4),
    });
    const result = await server.executeOperation({
      query: `query {
         storesCount
         creatorsCount
         artworksCount
         auctionsCount
       }`,
      variables: {},
    });
    expect(result.errors).toBeUndefined();
    expect({
      storesCount: 1,
      creatorsCount: 2,
      artworksCount: 3,
      auctionsCount: 4,
    }).toEqual(result.data);
  });

  describe('store', () => {
    const store = new Store({
      public: true,
      auctionProgram: 'auctionProgram',
      tokenVaultProgram: 'tokenVaultProgram',
      tokenMetadataProgram: 'tokenMetadataProgram',
      tokenProgram: 'tokenProgram',
    });
    store.pubkey = '00000001121f2d7a9665cc97';

    it('store', async () => {
      const server = await setup({
        async getStore(id: string) {
          if (id === 'test') {
            return store;
          }
          return null;
        },
      });
      const query = `
       query Test($storeId: String!) { store(storeId: $storeId) {
           pubkey
           key
           public
           auctionProgram
           tokenVaultProgram
           tokenMetadataProgram
           tokenProgram
       }}`;
      const result = await server.executeOperation({
        query,
        variables: { storeId: 'test' },
      });
      expect(result.errors).toBeUndefined();
      expect(result.data).toEqual({
        store: {
          auctionProgram: 'auctionProgram',
          key: 3,
          pubkey: '00000001121f2d7a9665cc97',
          public: true,
          tokenMetadataProgram: 'tokenMetadataProgram',
          tokenProgram: 'tokenProgram',
          tokenVaultProgram: 'tokenVaultProgram',
        },
      });
      const result2 = await server.executeOperation({
        query,
        variables: { storeId: 'null' },
      });
      expect(result2.errors).toBeUndefined();
      expect(result2.data).toEqual({
        store: null,
      });
    });
    it('stores', async () => {
      const server = await setup({
        async getStores() {
          return [store];
        },
      });
      const query = `
         query {
           stores {
             pubkey
             key
             public
             auctionProgram
             tokenVaultProgram
             tokenMetadataProgram
             tokenProgram
         }}`;
      const result = await server.executeOperation({ query });
      expect(result.errors).toBeUndefined();
      expect(result.data).toEqual({
        stores: [
          {
            auctionProgram: 'auctionProgram',
            key: 3,
            pubkey: '00000001121f2d7a9665cc97',
            public: true,
            tokenMetadataProgram: 'tokenMetadataProgram',
            tokenProgram: 'tokenProgram',
            tokenVaultProgram: 'tokenVaultProgram',
          },
        ],
      });
    });
  });

  describe('creator', () => {
    const creator = new WhitelistedCreator({
      _id: '5go8Lmpj5m7NZhoztNyBiV1rusyxT8Sn8zLJP4gWKB1h',
      activated: true,
      address: 'EQELCK3mMrKLwaZanubXdG62mExxw2ecNULHx45jbx8t',
    });
    it('creators', async () => {
      const server = await setup({
        async getCreators() {
          return [creator];
        },
      });
      const query = `
      query ($creatorsStoreId: String!) {
        creators(storeId: $creatorsStoreId) {
          pubkey
          key
          address
          activated
        }
      }`;
      const result = await server.executeOperation({
        query,
        variables: { creatorsStoreId: '1' },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data).toEqual({
        creators: [
          {
            pubkey: creator.pubkey,
            key: creator.key,
            address: creator.address,
            activated: creator.activated,
          },
        ],
      });
    });

    it('creator', async () => {
      const server = await setup({
        async getCreator() {
          return creator;
        },
      });
      const query = `
      query ($creatorStoreId: String!, $creatorCreatorId: String!) {
        creator(storeId: $creatorStoreId, creatorId: $creatorCreatorId) {
           pubkey
          key
          address
          activated
        }
      }
      `;
      const result = await server.executeOperation({
        query,
        variables: { creatorStoreId: '1', creatorCreatorId: '2' },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data).toEqual({
        creator: {
          pubkey: creator.pubkey,
          key: creator.key,
          address: creator.address,
          activated: creator.activated,
        },
      });
    });
  });
});
