import type { Db } from 'mongodb';
import set from 'lodash/set';
import { IReader, ReaderBase } from '../../reader';
import { Connection } from '@solana/web3.js';
import {
  Edition,
  MasterEditionV1,
  MasterEditionV2,
  Metadata,
  MetadataKey,
  MetaMap,
  Store,
  WhitelistedCreator,
} from '../../common';
import { deserialize } from 'typescript-json-serializer';

export class MongoReader extends ReaderBase implements IReader {
  private db!: Db;

  constructor(
    public networkName: string,
    connection: Connection,
    private initOrm: () => Promise<Db>,
  ) {
    super(connection);
  }

  private collection<TKey extends keyof MetaMap>(name: TKey) {
    return this.db.collection<MetaMap[TKey]>(name);
  }

  async init() {
    this.db = await this.initOrm();
  }

  storesCount() {
    return this.collection('stores').countDocuments();
  }
  creatorsCount() {
    return this.collection('creators').countDocuments();
  }
  artworksCount() {
    return this.collection('metadata').countDocuments({
      //$where: '???', // TODO: what is it artwork in db?
    });
  }
  auctionsCount() {
    return this.collection('auctions').countDocuments();
  }

  getStoreIds(): Promise<string[]> {
    return this.collection('stores')
      .distinct('_id')
      .then(list => list.map(p => p.toString()));
  }

  getStores() {
    return this.collection('stores')
      .find({})
      .map(doc => deserialize(doc, Store))
      .toArray();
  }
  getStore(storeId: string) {
    return this.collection('stores')
      .findOne({ _id: storeId })
      .then(doc => (doc ? deserialize(doc, Store) : null));
  }

  getCreatorIds(): Promise<string[]> {
    return this.collection('creators')
      .distinct('_id')
      .then(list => list.map(p => p.toString()));
  }

  getCreators(storeId: string) {
    return this.collection('creators')
      .find({
        storeIds: { $in: [storeId] },
      })
      .map(doc => deserialize(doc, WhitelistedCreator))
      .toArray();
  }

  getCreator(storeId: string) {
    const filter: Pick<WhitelistedCreator, 'storeIds'> = {
      storeIds: { $in: [storeId] } as any,
    };
    return this.collection('creators')
      .findOne(filter)
      .then(doc => (doc ? deserialize(doc, WhitelistedCreator) : null));
  }

  async $filterArtworks({
    storeId,
    creatorId,
    ownerId,
    onlyVerified,
  }: {
    creatorId?: string | null; // String
    onlyVerified?: boolean | null; // Boolean
    ownerId?: string | null; // String
    storeId: string; // String!
  }) {
    const userAccounts = ownerId ? await this.loadUserAccounts(ownerId) : [];
    // filterByOwner
    let filter2: any = undefined;
    const mint = userAccounts
      .filter(({ info }) => {
        return info.amount.toNumber() > 0;
      })
      .map(({ info }) => info.mint.toBase58());
    if (mint.length) {
      filter2 = set(filter2 ?? {}, 'mint', mint);
    }

    const creator =
      storeId && creatorId
        ? await this.collection('creators')
            .findOne({
              _id: creatorId,
              storeIds: { $in: [storeId] },
            })
            .then(doc => (doc ? deserialize(doc, WhitelistedCreator) : null))
        : null;

    // filterByStoreAndCreator
    let filter1: any = undefined;
    if (creatorId) {
      filter1 = set(filter1 ?? {}, 'data.creators.address', creatorId);
    }

    if (onlyVerified) {
      filter1 = set(filter1 ?? {}, 'data.creators.verified', onlyVerified);
    }
    if (creatorId && !creator) {
      return filter2;
    }
    return filter1 && filter2
      ? { $or: [filter1, filter2] }
      : filter1 ?? filter2;
  }

  async getArtworks(args: {
    creatorId?: string | null; // String
    onlyVerified?: boolean | null; // Boolean
    ownerId?: string | null; // String
    storeId: string; // String!
  }) {
    const filter = await this.$filterArtworks(args);
    return await this.collection('metadata')
      .find(filter)
      .map(doc => deserialize(doc, Metadata))
      .toArray();
  }
  getArtwork(artId: string) {
    return this.collection('metadata')
      .findOne({ _id: artId })
      .then(doc => (doc ? deserialize(doc, Metadata) : null));
  }
  getEdition(id?: string) {
    return id
      ? this.collection('editions')
          .findOne({ _id: id })
          .then(doc => (doc ? deserialize(doc, Edition) : null))
      : Promise.resolve(null);
  }
  getMasterEdition(id?: string) {
    return id
      ? this.collection('masterEditions')
          .findOne({ _id: id })
          .then((doc: any) =>
            !doc
              ? null
              : doc.key === MetadataKey.MasterEditionV1
              ? deserialize(doc, MasterEditionV1)
              : deserialize(doc, MasterEditionV2),
          )
      : Promise.resolve(null);
  }
}
