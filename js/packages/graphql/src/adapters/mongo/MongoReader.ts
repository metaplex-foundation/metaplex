import { Db, ObjectId } from 'mongodb';
import { Reader } from '../../reader';
import { Connection } from '@solana/web3.js';
import { MetaMap } from '../../common';

export class MongoReader extends Reader {
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
      $where: '???', // TODO: what is it artwork in db?
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
    return this.collection('stores').find({}).toArray();
  }
  getStore(storeId: string) {
    return this.collection('stores').findOne({ _id: new ObjectId(storeId) });
  }

  getCreatorIds(): Promise<string[]> {
    return this.collection('creators')
      .distinct('_id')
      .then(list => list.map(p => p.toString()));
  }

  getCreators() {
    return this.collection('creators').find({}).toArray();
  }
  getCreator(storeId: string) {
    return this.collection('creators').findOne({
      qty: { $in: [storeId] },
    });
  }

  getArtworks() {
    return this.collection('metadata')
      .find({
        $where: '???', // TODO: what is it artwork in db?
      })
      .toArray();
  }
  getArtwork(artId: string) {
    return this.collection('metadata').findOne({ _id: new ObjectId(artId) });
  }
  getEdition(id?: string) {
    return id
      ? this.collection('editions').findOne({ _id: new ObjectId(id) })
      : Promise.resolve(null);
  }
  getMasterEdition(id?: string) {
    return id
      ? this.collection('masterEditions').findOne({ _id: new ObjectId(id) })
      : Promise.resolve(null);
  }
}
