import type { Db } from 'mongodb';
import { FilterFn, IEvent, IReader } from '../../reader';
import { Connection } from '@solana/web3.js';
import {
  Edition,
  loadUserTokenAccounts,
  MasterEditionV1,
  MasterEditionV2,
  Metadata,
  MetadataKey,
  MetaMap,
  MetaTypes,
  pubkeyToString,
  PublicKeyStringAndAccount,
  Store,
  toPublicKey,
  WhitelistedCreator,
} from '../../common';
import { deserialize } from 'typescript-json-serializer';
import { PubSub, withFilter } from 'graphql-subscriptions';
import { PROGRAMS } from '../../ingester/constants';
import { IProgramParser } from '../../ingester';

function tableName<T extends MetaTypes>(name: T): T {
  return name;
}

const D = {
  creators: (doc: any) => deserialize(doc, WhitelistedCreator),
  stores: (doc: any) => deserialize(doc, Store),
  metadata: (doc: any) => deserialize(doc, Metadata),
  masterEditionsV1: (doc: any) => deserialize(doc, MasterEditionV1),
  masterEditionsV2: (doc: any) => deserialize(doc, MasterEditionV2),
  editions: (doc: any) => deserialize(doc, Edition),
};

class LazyEvent implements IEvent {
  constructor(
    readonly prop: keyof MetaMap,
    private account: PublicKeyStringAndAccount<Buffer>,
    private program: Pick<IProgramParser, 'processors'>,
  ) {}

  public readonly key = this.account.pubkey;
  // we process value if only somebody will demand it
  private _value: any;
  get value() {
    if (this._value) {
      return this._value;
    }
    const processor = this.program.processors[this.prop];
    this._value = processor.process(this.account);
    return this._value;
  }
}

export class MongoReader implements IReader {
  private db!: Db;
  private readonly pubsub = new PubSub();

  static readonly TABLES = [
    tableName('auctions'),
    tableName('stores'),
    tableName('creators'),
  ] as const;

  constructor(
    public networkName: string,
    private options: {
      connection: Connection;
      initOrm: () => Promise<Db>;
    },
  ) {}

  loadUserAccounts(ownerId: string) {
    return loadUserTokenAccounts(this.options.connection, ownerId);
  }

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

  private collection<TKey extends keyof MetaMap>(name: TKey) {
    return this.db.collection<MetaMap[TKey]>(name);
  }

  async init() {
    this.db = await this.options.initOrm();
  }

  initSubscription(): boolean {
    /*
    if (!this.db) {
      return false;
    }
    try {
      MongoReader.TABLES.forEach(table => {
        const collection = this.db.collection(table);
        const watch = collection.watch();
        watch.on('change', data => {
          const { documentKey } = data as any;
          const key = documentKey?._id.toString() ?? '';
          const prop = data.ns.coll as MetaTypes;

          this.collection(prop)
            .findOne<any>({ _id: key })
            .then(doc => {
              const value = D[prop as keyof typeof D]?.(doc);
              if (value) {
                const obj: IEvent = { prop, key, value };
                this.pubsub.publish(prop, obj);
              }
            });
        });
      });
    } catch {
      return false;
    }
    */
    PROGRAMS.forEach(program => {
      this.options.connection.onProgramAccountChange(
        toPublicKey(program.pubkey),
        block => {
          const account: PublicKeyStringAndAccount<Buffer> = {
            pubkey: pubkeyToString(block.accountId),
            account: {
              ...block.accountInfo,
              owner: pubkeyToString(block.accountInfo.owner),
            },
          };
          if (program.isProcessor(account.account)) {
            for (const [prop, proc] of Object.entries(program.processors)) {
              if (proc.is(account.account)) {
                const event = new LazyEvent(
                  prop as keyof MetaMap,
                  account,
                  program,
                );
                this.pubsub.publish(prop, event);
                break;
              }
            }
          }
        },
      );
    });
    return true;
  }

  storesCount() {
    return this.collection('stores').countDocuments();
  }
  creatorsCount() {
    return this.collection('creators').countDocuments();
  }
  artworksCount() {
    return this.collection('metadata').countDocuments();
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
      .map(doc => D.stores(doc)!)
      .toArray();
  }
  getStore(storeId: string) {
    return this.collection('stores')
      .findOne({ _id: storeId })
      .then(doc => D.stores(doc));
  }

  getCreatorIds(): Promise<string[]> {
    return this.collection('creators')
      .distinct('_id')
      .then(list => list.map(p => p.toString()));
  }

  getCreators(storeId: string) {
    const filter: Pick<WhitelistedCreator, 'storeId'> = {
      storeId: storeId as any,
    };
    return this.collection('creators')
      .find(filter)
      .map(doc => D.creators(doc)!)
      .toArray();
  }

  getCreator(storeId: string) {
    const filter: Pick<WhitelistedCreator, 'storeId'> = {
      storeId: storeId as any,
    };
    return this.collection('creators')
      .findOne(filter)
      .then(doc => D.creators(doc));
  }

  async getArtworks({
    creatorId,
    onlyVerified,
    ownerId,
  }: {
    creatorId?: string | null; // String
    onlyVerified?: boolean | null; // Boolean
    ownerId?: string | null; // String
  }) {
    let filter: any = {};
    // byCreatorId
    if (creatorId) {
      filter['data.creators.address'] = creatorId;
    }
    // onlyVerified
    if (onlyVerified) {
      filter['data.creators.verified'] = true;
    }

    // ownerId
    if (ownerId) {
      const userAccounts = await this.loadUserAccounts(ownerId);
      const userAccountsWithAmount = userAccounts.filter(
        ({ info }) => info.amount.toNumber() > 0,
      );
      const mints = userAccountsWithAmount.map(({ info }) =>
        info.mint.toBase58(),
      );

      const f = {
        mint: { $in: mints },
      };
      if (Object.keys(filter).length) {
        filter = { $or: [filter, f] };
      } else {
        filter = f;
      }
    }

    return await this.collection('metadata')
      .find(filter)
      .map(doc => D.metadata(doc)!)
      .toArray();
  }
  getArtwork(artId: string) {
    return this.collection('metadata')
      .findOne({ _id: artId })
      .then(doc => D.metadata(doc));
  }
  getEdition(id?: string) {
    return id
      ? this.collection('editions')
          .findOne({ _id: id })
          .then(doc => D.editions(doc))
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
              ? D.masterEditionsV1(doc)
              : D.masterEditionsV2(doc),
          )
      : Promise.resolve(null);
  }
}
