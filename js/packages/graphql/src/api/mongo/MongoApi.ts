/* eslint-disable @typescript-eslint/no-unused-vars */
import { StateProvider, FilterFn, IEvent } from "../StateProvider";
import { IMetaplexApi } from "../IMetaplexApi";
import { serialize } from "typescript-json-serializer";
import {
  MetaState,
  WhitelistedCreator,
  Metadata,
  Store,
  ParsedAccount,
  AuctionData,
  isCreatorPartOfTheStore,
  BidderMetadata,
  ParticipationConfigV1,
  SafetyDepositBox,
  Vault,
} from "../../common";
import { ResolverFn } from "graphql-subscriptions";
import { Fields, Auction, Artwork, AuctionManager } from "types/sourceTypes";
import { AnyBulkWriteOperation, Db, ObjectId } from "mongodb";
import logger from "../../logger";

export class MongoApi implements IMetaplexApi {
  static build(
    db: Db,
    name: string,
    endpoint: string,
    flowControl?: {
      promise: Promise<void>;
      finish: () => void;
    }
  ) {
    let ptr: MongoApi | undefined;
    new StateProvider(
      name,
      endpoint,
      (provider) => {
        ptr = new this(provider, db);
        return ptr;
      },
      flowControl
    );
    return ptr!;
  }

  private table<T>(clazz: unknown) {
    return this.db.collection<Fields<T>>((clazz as any).name);
  }

  private constructor(
    public readonly provider: StateProvider,
    private db: Db
  ) {}

  getAuctionBids(auction: Auction): Promise<Fields<BidderMetadata>[]> {
    throw new Error("Method not implemented.");
  }
  getManagerVault(manager: AuctionManager): Promise<Fields<Vault> | null> {
    throw new Error("Method not implemented.");
  }
  getSafetyDepositBoxesExpected(
    manager: AuctionManager
  ): Promise<import("bn.js") | null> {
    throw new Error("Method not implemented.");
  }
  getSafetyDepositBoxes(
    manager: AuctionManager
  ): Promise<Fields<SafetyDepositBox>[]> {
    throw new Error("Method not implemented.");
  }
  getParticipationConfig(
    manager: AuctionManager
  ): Promise<ParticipationConfigV1 | null> {
    throw new Error("Method not implemented.");
  }

  public get connection() {
    return this.provider.connection;
  }

  public get network() {
    return this.provider.name;
  }

  public flush() {
    return Promise.resolve();
  }

  public preload(): Promise<void> {
    return this.provider.load();
  }
  subscribeIterator(
    prop: keyof MetaState,
    key?: string | FilterFn<IEvent>
  ): ResolverFn {
    throw new Error("Method not implemented.");
  }

  async getCreator(
    storeId: string,
    creatorId?: string | null
  ): Promise<Fields<WhitelistedCreator> | null> {
    const creator = await this.table<WhitelistedCreator>(
      WhitelistedCreator
    ).findOne({
      where: [{ address: creatorId }],
    });
    return creator ?? null;
  }
  async getCreators(storeId: string): Promise<Fields<WhitelistedCreator>[]> {
    const [store, creators] = await Promise.all([
      this.getStore(storeId),
      await this.table<WhitelistedCreator>(WhitelistedCreator).find().toArray(), // very greedy
    ]);
    if (!store) return [];
    const defers = creators.map(async (creator) => {
      const isWhitelistedCreator = await creator.isCreatorPartOfTheStore(
        storeId
      );
      return isWhitelistedCreator ? creator : undefined;
    });
    const data = await Promise.all(defers);
    return data.filter((d) => d) as WhitelistedCreator[];
  }
  async getAuction(auctionId: string): Promise<Auction | null> {
    const rep = this.table<AuctionData>(AuctionData);
    const auction = await rep.findOne({ _id: new ObjectId(auctionId) });
    return auction ?? null;
  }
  getAuctions({
    storeId,
    state,
    participantId,
  }: {
    participantId?: string | null | undefined;
    state?: "all" | "ended" | "live" | "resale" | null | undefined;
    storeId?: string | null | undefined;
  }): Promise<Auction[]> {
    throw new Error("Method not implemented.");
  }
  getArtwork(artId: string): Promise<Fields<Metadata> | null> {
    throw new Error("Method not implemented.");
  }
  getArtworks({
    storeId,
    creatorId,
    ownerId,
    onlyVerified,
  }: {
    artId?: string | null | undefined;
    creatorId?: string | null | undefined;
    onlyVerified?: boolean | null | undefined;
    ownerId?: string | null | undefined;
    storeId: string;
  }): Promise<Fields<Metadata>[]> {
    throw new Error("Method not implemented.");
  }
  async getStore(storeId: string): Promise<Fields<Store> | null> {
    const rep = this.table<Store>(Store);
    const item = await rep.findOne({ _id: new ObjectId(storeId) });
    return item ?? null;
  }
  async getStores() {
    const rep = this.table<Store>(Store);
    const stores = await rep.find().toArray();
    return stores;
  }
  storesCount(): Promise<number> {
    return this.table<Store>(Store).countDocuments();
  }
  creatorsCount(): Promise<number> {
    return this.table<WhitelistedCreator>(WhitelistedCreator).countDocuments();
  }
  artworksCount(): Promise<number> {
    return this.table<Metadata>(Metadata).countDocuments();
  }
  auctionsCount(): Promise<number> {
    return this.table<AuctionData>(AuctionData).countDocuments();
  }
  getAuctionHighestBid(
    auction: Auction
  ): Promise<Fields<BidderMetadata> | null> {
    throw new Error("Method not implemented.");
  }
  getAuctionThumbnail(auction: Auction): Promise<Fields<Metadata> | null> {
    throw new Error("Method not implemented.");
  }
  artType(item: Artwork): Promise<0 | 1 | 2> {
    throw new Error("Method not implemented.");
  }
  artSupply(item: Artwork): Promise<import("bn.js") | undefined> {
    throw new Error("Method not implemented.");
  }
  artMaxSupply(item: Artwork): Promise<import("bn.js") | undefined> {
    throw new Error("Method not implemented.");
  }
  artEditionNumber(item: Artwork): Promise<import("bn.js") | undefined> {
    throw new Error("Method not implemented.");
  }

  async persist(
    prop: keyof MetaState,
    key: string,
    value: ParsedAccount<any>
  ): Promise<void> {
    try {
      const clazz = value.info.constructor;
      const json = serialize(value.info, true);
      const _id = value.pubkey;
      await this.table(clazz).updateOne(
        { _id },
        { $set: json },
        { upsert: true }
      );
    } catch (err) {
      logger.error(err);
      throw err;
    }
  }

  async persistBatch(clazz: any, values: ParsedAccount<any>[]) {
    if (!values.length) {
      return;
    }
    const docs: AnyBulkWriteOperation<any>[] = values.map(
      ({ pubkey, info }) => {
        const $set = serialize(info, true);
        const op: AnyBulkWriteOperation = {
          updateOne: {
            filter: { _id: pubkey },
            update: { $set },
            upsert: true,
          },
        };
        return op;
      }
    );
    try {
      await this.table(clazz).bulkWrite(docs);
    } catch (err) {
      logger.error(err);
      throw err;
    }
  }
}
