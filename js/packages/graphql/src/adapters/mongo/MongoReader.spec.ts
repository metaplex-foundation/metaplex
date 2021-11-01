import { PublicKey } from '@solana/web3.js';
import { BN } from 'bn.js';
import { Db, MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { serialize } from 'typescript-json-serializer';
import {
  Creator,
  Data,
  Edition,
  MasterEditionV1,
  MasterEditionV2,
  Metadata,
  MetadataKey,
  Store,
  TokenAccount,
  WhitelistedCreator,
} from '../../common';
import { createOrm } from './createOrm';
import { MongoReader } from './MongoReader';

describe('MongoReader', () => {
  let mongod!: MongoMemoryServer;

  let reader!: MongoReader;
  let db!: Db;
  let client!: MongoClient;

  const account: TokenAccount = {
    pubkey: '1',
    account: {
      owner: '99',
      executable: false,
      lamports: 1,
      data: Buffer.from([]),
    },
    info: {
      mint: new PublicKey('2Hzae92ZHV3nsU5ZmakDhmCDvP3jyB43fYpRZYoFqAch'),
      amount: {
        toNumber() {
          return 10;
        },
      },
    } as any,
  };

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
  });

  beforeEach(async () => {
    reader = new MongoReader('test', {
      connection: null as any,
      initOrm: async () => {
        const orm = await createOrm(mongod.getUri(), {
          dbName: `test-${new Date().valueOf()}`,
          replicaSet: 'testset',
        });
        db = orm.db;
        client = orm.client;
        return db;
      },
    });

    reader.loadUserAccounts = async (ownerId: string) => {
      if (ownerId === '99') {
        return [account];
      }
      return [];
    };

    await reader.init();
  });

  afterEach(async () => {
    client.close();
  });

  afterAll(async () => {
    db = null as any;
    await mongod.stop();
  });

  it('loadUserAccounts', async () => {
    const empty = await reader.loadUserAccounts('');
    expect(empty).toEqual([]);
    const accounts = await reader.loadUserAccounts('99');
    expect(accounts).toEqual([account]);
  });

  it('test connection', () => {
    expect(mongod.getUri()).not.toBeUndefined();
  });

  it('storesCount', async () => {
    const docs = [{}, {}, {}];
    await db.collection('stores').insertMany(docs);
    const count = await reader.storesCount();
    expect(count).toBe(3);
  });

  it('creatorsCount', async () => {
    const docs = [{}, {}, {}];
    await db.collection('creators').insertMany(docs);
    const count = await reader.creatorsCount();
    expect(count).toBe(3);
  });

  it('auctionsCount', async () => {
    const docs = [{}, {}, {}];
    await db.collection('auctions').insertMany(docs);
    const count = await reader.auctionsCount();
    expect(count).toBe(3);
  });

  describe('Store', () => {
    const store = new Store({
      _id: '1',
      public: true,
      auctionProgram: 'auctionProgram',
      tokenVaultProgram: 'tokenVaultProgram',
      tokenMetadataProgram: 'tokenMetadataProgram',
      tokenProgram: 'tokenProgram',
      creatorIds: ['1', '2'],
    });

    it('getStoreIds', async () => {
      const docs = [{ _id: '1' }, { _id: '2' }, { _id: '3' }];
      await db.collection('stores').insertMany(docs as any);
      const ids = await reader.getStoreIds();
      expect(ids).toEqual(['1', '2', '3']);
    });

    it('getStores', async () => {
      const docs = [serialize(store)];
      await db.collection('stores').insertMany(docs);
      const stores = await reader.getStores();
      expect(stores.length).toBe(docs.length);
      const s = stores[0];
      expect(s).toBeInstanceOf(Store);
      expect(s.pubkey).toBe(store.pubkey);
      expect(s.public).toEqual(store.public);
      expect(s.auctionProgram).toEqual(store.auctionProgram);
      expect(s.tokenVaultProgram).toEqual(store.tokenVaultProgram);
      expect(s.tokenMetadataProgram).toEqual(store.tokenMetadataProgram);
      expect(s.tokenProgram).toEqual(store.tokenProgram);
      expect(s.creatorIds).toEqual(store.creatorIds);
    });

    it('getStore', async () => {
      const docs = [serialize(store)];
      await db.collection('stores').insertMany(docs as any);
      const resultNull = await reader.getStore('100');
      expect(resultNull).toBeNull();
      const result = await reader.getStore(store.pubkey);
      expect(result).not.toBeNull();
      const s = result!;
      expect(s).toBeInstanceOf(Store);
      expect(s.pubkey).toBe(store.pubkey);
      expect(s.public).toEqual(store.public);
      expect(s.auctionProgram).toEqual(store.auctionProgram);
      expect(s.tokenVaultProgram).toEqual(store.tokenVaultProgram);
      expect(s.tokenMetadataProgram).toEqual(store.tokenMetadataProgram);
      expect(s.tokenProgram).toEqual(store.tokenProgram);
      expect(s.creatorIds).toEqual(store.creatorIds);
    });
  });

  describe('Creator', () => {
    const creator = new WhitelistedCreator({
      _id: '1',
      address: 'address',
      activated: true,
      twitter: 'twitter',
      name: 'name',
      image: 'image',
      description: 'description',
      storeId: '3',
    });

    const docs = [serialize(creator)];

    it('getCreatorIds', async () => {
      const docs = [{ _id: '1' }, { _id: '2' }, { _id: '3' }];
      await db.collection('creators').insertMany(docs as any);
      const ids = await reader.getCreatorIds();
      expect(ids).toEqual(['1', '2', '3']);
    });

    it('getCreators', async () => {
      await db.collection('creators').insertMany(docs);

      const creators = await reader.getCreators('3');
      expect(creators.length).toBe(1);
      const item = creators[0];
      expect(item).toBeInstanceOf(WhitelistedCreator);
      expect(item.pubkey).toBe(creator.pubkey);
      expect(item.address).toEqual(creator.address);
      expect(item.activated).toEqual(creator.activated);
      expect(item.twitter).toEqual(creator.twitter);
      expect(item.name).toEqual(creator.name);
      expect(item.image).toEqual(creator.image);
      expect(item.description).toEqual(creator.description);
      expect(item.storeId).toEqual(creator.storeId);
    });

    it('getCreator', async () => {
      await db.collection('creators').insertMany(docs);
      const storeId = creator.storeId;
      const resultNull = await reader.getCreator('888');
      expect(resultNull).toBeNull();
      const result = await reader.getCreator(storeId!);
      expect(result).not.toBeNull();
      const item = result!;
      expect(item).toBeInstanceOf(WhitelistedCreator);
      expect(item.pubkey).toBe(creator.pubkey);
      expect(item.address).toEqual(creator.address);
      expect(item.activated).toEqual(creator.activated);
      expect(item.twitter).toEqual(creator.twitter);
      expect(item.name).toEqual(creator.name);
      expect(item.image).toEqual(creator.image);
      expect(item.description).toEqual(creator.description);
      expect(item.storeId).toEqual(creator.storeId);
    });
  });

  describe('Artworks', () => {
    const creator$ = new Creator({
      address: '9',
      verified: true,
      share: 10,
    });
    const metadata1 = new Metadata({
      _id: '1',
      updateAuthority: 'updateAuthority',
      mint: '2Hzae92ZHV3nsU5ZmakDhmCDvP3jyB43fYpRZYoFqAch',
      data: {
        name: 'name',
        symbol: 'symbol',
        uri: 'uri',
        sellerFeeBasisPoints: 1,
        creators: [creator$],
      },
      primarySaleHappened: true,
      isMutable: true,
      editionNonce: 10,
      edition: 'edition',
    });

    const metadata2 = new Metadata({
      _id: '2',
      updateAuthority: 'updateAuthority',
      mint: '0',
      data: {
        name: 'name',
        symbol: 'symbol',
        uri: 'uri',
        sellerFeeBasisPoints: 1,
        creators: [creator$],
      },
      primarySaleHappened: true,
      isMutable: true,
      editionNonce: 10,
      edition: 'edition',
    });

    const metadata3 = new Metadata({
      _id: '3',
      updateAuthority: 'updateAuthority',
      mint: '111111111111111111111111111111138',
      data: {
        name: 'name',
        symbol: 'symbol',
        uri: 'uri',
        sellerFeeBasisPoints: 1,
        creators: null,
      },
      primarySaleHappened: true,
      isMutable: true,
      editionNonce: 10,
      edition: 'edition',
    });
    const docs = [
      serialize(metadata1),
      serialize(metadata2),
      serialize(metadata3),
    ];

    it('artworksCount', async () => {
      await db.collection('metadata').insertMany(docs);
      const count = await reader.artworksCount();
      expect(count).toBe(3);
    });

    describe('getArtworks', () => {
      const m1 = new Metadata({
        _id: 'n2dYAr87ZZNioTcjheWnFtUehh8w8PkazTV49oLAbFq',
        data: {
          name: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          symbol: 'AAAAAAAAAA',
          uri: 'https://arweave.net/NV7PCBXg_3LizsPsTGXi6AVc_dP2mmabMq8IyL7ng_M',
          sellerFeeBasisPoints: 1000,
          creators: [
            {
              address: '1KW2XRd9kwqet15Aha2oK3tYvd3nWbTFH1MBiRAv1BE1',
              verified: true,
              share: 100,
            },
          ],
        },
        edition: 'B1t1aHyzb16gaRqbzRNQeyj6NFWfqzsqAsxmxTGLqkmQ',
        isMutable: true,
        mint: '2Hzae92ZHV3nsU5ZmakDhmCDvP3jyB43fYpRZYoFqAch',
        primarySaleHappened: true,
        updateAuthority: '1KW2XRd9kwqet15Aha2oK3tYvd3nWbTFH1MBiRAv1BE1',
      });
      const m2 = new Metadata({
        _id: '3E1bY7wESVRTvzeF7wPFGzdAjhYjx9Vuqwx53Nbk6x3P',
        data: {
          name: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          symbol: 'AAAAAAAAAA',
          uri: 'https://arweave.net/RoenI8mRmQz5u0Aoehh7OwRgAlLVyRjXD-SWEbH6zZQ',
          sellerFeeBasisPoints: 1000,
          creators: [
            {
              address: '2KW2XRd9kwqet15Aha2oK3tYvd3nWbTFH1MBiRAv1BE1',
              verified: false,
              share: 100,
            },
          ],
        },
        edition: '3B8jPgzdNFptg9Qr492mGgPjjrHs4TTbVvP9ysupnMML',
        isMutable: true,

        mint: 'CgrKpxPQneqczboNJNs4GfSpSy7d76vydf2xB1nyjtYS',
        primarySaleHappened: true,
        updateAuthority: '2KW2XRd9kwqet15Aha2oK3tYvd3nWbTFH1MBiRAv1BE1',
      });

      const m3 = new Metadata({
        _id: 'AaN63LeVAKr1Jth6QzyhWGLE3ZZ82kNWF6ahyVAdXv9m',
        data: {
          name: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          symbol: 'AAAAAAAAAA',
          uri: 'https://arweave.net/YQb0B2lf5Yz25ZzFRo1DvT1rWnz4cEnz8O4QxOtNwnY',
          sellerFeeBasisPoints: 1000,
          creators: [
            {
              address: '2KW2XRd9kwqet15Aha2oK3tYvd3nWbTFH1MBiRAv1BE1',
              verified: true,
              share: 100,
            },
          ],
        },
        edition: 'BTYcQH7c3GP3AFMku7KjoZNfTRncbJREm4HA8hEou2WM',
        isMutable: true,

        mint: '9BqKsCv5sVkALuDnZx9YPa51aJqz6Ay57Ao33owWT6wr',
        primarySaleHappened: true,
        updateAuthority: '2KW2XRd9kwqet15Aha2oK3tYvd3nWbTFH1MBiRAv1BE1',
      });

      beforeEach(async () => {
        await db
          .collection('metadata')
          .insertMany([serialize(m1), serialize(m2), serialize(m3)]);
      });

      it('empty params', async () => {
        const res = await reader.getArtworks({});
        expect(res.length).toBe(3);
        expect(res[0]).toBeInstanceOf(Metadata);
      });

      it('creatorsId', async () => {
        const res = await reader.getArtworks({
          creatorId: '1KW2XRd9kwqet15Aha2oK3tYvd3nWbTFH1MBiRAv1BE1',
        });
        expect(res.length).toBe(1);

        const res2 = await reader.getArtworks({
          creatorId: '2KW2XRd9kwqet15Aha2oK3tYvd3nWbTFH1MBiRAv1BE1',
        });
        expect(res2.length).toBe(2);
      });

      it('onlyVerified', async () => {
        const res = await reader.getArtworks({
          onlyVerified: true,
        });
        expect(res.length).toBe(2);
      });
      it('creatorsId && onlyVerified', async () => {
        const res = await reader.getArtworks({
          creatorId: '2KW2XRd9kwqet15Aha2oK3tYvd3nWbTFH1MBiRAv1BE1',
          onlyVerified: true,
        });
        expect(res.length).toBe(1);
      });

      it('ownerId', async () => {
        const res = await reader.getArtworks({
          ownerId: '99',
        });
        expect(res.length).toBe(1);
      });

      it('creatorsId && ownerId', async () => {
        const res = await reader.getArtworks({
          creatorId: '2KW2XRd9kwqet15Aha2oK3tYvd3nWbTFH1MBiRAv1BE1',
          ownerId: '99',
        });
        expect(res.length).toBe(3);
      });
    });

    it('getArtwork', async () => {
      await db.collection('metadata').insertMany(docs);
      const resultNull = await reader.getArtwork('999');
      expect(resultNull).toBeNull();
      const result = await reader.getArtwork(metadata1.pubkey);
      expect(result).not.toBeNull();
      const item = result!;
      expect(item).toBeInstanceOf(Metadata);

      expect(item.pubkey).toEqual(metadata1.pubkey);
      expect(item.updateAuthority).toEqual(metadata1.updateAuthority);
      expect(item.mint).toEqual(metadata1.mint);
      expect(item.primarySaleHappened).toEqual(metadata1.primarySaleHappened);
      expect(item.isMutable).toEqual(metadata1.isMutable);
      expect(item.editionNonce).toEqual(metadata1.editionNonce);
      expect(item.edition).toEqual(metadata1.edition);
      const data = item.data;
      expect(data).toBeInstanceOf(Data);
      expect(data.name).toEqual(item.data.name);
      expect(data.symbol).toEqual(item.data.symbol);
      expect(data.uri).toEqual(item.data.uri);
      expect(data.sellerFeeBasisPoints).toEqual(item.data.sellerFeeBasisPoints);
      expect(data.creators).toEqual(item.data.creators);
    });
  });

  describe('Editions', () => {
    const edition = new Edition({
      _id: '1',
      key: MetadataKey.EditionV1,
      parent: 'parent',
      edition: new BN(1234),
    });
    const docs = [serialize(edition)];

    it('getEdition', async () => {
      await db.collection('editions').insertMany(docs);
      const resultNull = await reader.getEdition('123');
      expect(resultNull).toBeNull();
      const result = await reader.getEdition(edition.pubkey);
      expect(result).not.toBeNull();
      const item = result!;
      expect(item).toBeInstanceOf(Edition);
      expect(item.pubkey).toEqual(edition.pubkey);
      expect(item.key).toEqual(edition.key);
      expect(item.parent).toEqual(edition.parent);
      expect(item.edition).toEqual(edition.edition);
    });
  });

  describe('MasterEdition', () => {
    const masterV1 = new MasterEditionV1({
      _id: '1',
      supply: new BN(1),
      maxSupply: new BN(2),
      printingMint: 'printingMint',
      oneTimePrintingAuthorizationMint: 'oneTimePrintingAuthorizationMint',
    });
    const masterV2 = new MasterEditionV2({
      _id: '2',
      supply: new BN(3),
      maxSupply: new BN(4),
    });
    const docs = [serialize(masterV1), serialize(masterV2)];

    it('getMasterEdition null', async () => {
      await db.collection('masterEditions').insertMany(docs);
      const result = await reader.getMasterEdition();
      expect(result).toBeNull();
      const result2 = await reader.getMasterEdition();
      expect(result2).toBeNull();
    });

    it('getMasterEdition v1', async () => {
      await db.collection('masterEditions').insertMany(docs);
      const result = await reader.getMasterEdition(masterV1.pubkey);
      expect(result).not.toBeNull();
      const item = result as MasterEditionV1;
      expect(item).toBeInstanceOf(MasterEditionV1);
      expect(item.pubkey).toEqual(masterV1.pubkey);
      expect(item.key).toEqual(masterV1.key);
      expect(item.printingMint).toEqual(masterV1.printingMint);
      expect(item.oneTimePrintingAuthorizationMint).toEqual(
        masterV1.oneTimePrintingAuthorizationMint,
      );
      expect(item.supply.eq(masterV1.supply)).toBeTruthy();
      expect(item.maxSupply?.eq(masterV1.maxSupply!)).toBeTruthy();
    });

    it('getMasterEdition v2', async () => {
      await db.collection('masterEditions').insertMany(docs);
      const result = await reader.getMasterEdition(masterV2.pubkey);
      expect(result).not.toBeNull();
      const item = result as MasterEditionV2;
      expect(item).toBeInstanceOf(MasterEditionV2);
      expect(item.pubkey).toEqual(masterV2.pubkey);
      expect(item.key).toEqual(masterV2.key);
      expect(item.supply.eq(masterV2.supply)).toBeTruthy();
      expect(item.maxSupply?.eq(masterV2.maxSupply!)).toBeTruthy();
    });
  });
});
