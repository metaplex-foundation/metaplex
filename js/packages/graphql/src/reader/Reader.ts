import { Connection } from "@solana/web3.js";
import { PubSub, withFilter } from "graphql-subscriptions";
import {
  Edition,
  MasterEditionV1,
  MasterEditionV2,
  Metadata,
  MetaTypes,
  Store,
  WhitelistedCreator,
} from "../common";
import { NexusGenInputs } from "../generated/typings";
import { loadUserTokenAccounts } from "../utils/loadUserTokenAccounts";
import { FilterFn, IEvent } from "./types";

export abstract class Reader {
  protected readonly pubsub = new PubSub();

  abstract networkName: string;
  abstract init(): Promise<void>;

  constructor(public connection: Connection) {}

  loadUserAccounts(ownerId: string) {
    const { connection } = this;
    return loadUserTokenAccounts(connection, ownerId);
  }

  subscribeIterator(prop: MetaTypes, key?: string | FilterFn<IEvent>) {
    const iter = () => this.pubsub.asyncIterator<IEvent>(prop);
    if (key !== undefined) {
      if (typeof key === "string") {
        return withFilter(iter, (payload: IEvent) => {
          return payload.key === key;
        });
      }
      return withFilter(iter, key);
    }
    return iter;
  }

  abstract storesCount(): Promise<number>;
  abstract creatorsCount(): Promise<number>;
  abstract artworksCount(): Promise<number>;
  abstract auctionsCount(): Promise<number>;

  abstract getStores(): Promise<Store[]>;
  abstract getStore(storeId: string): Promise<Store | null>;

  abstract getCreators(storeId: string): Promise<WhitelistedCreator[]>;
  abstract getCreator(
    storeId: string,
    creatorId: string
  ): Promise<WhitelistedCreator | null>;

  abstract getArtworks(
    args: NexusGenInputs["ArtworksInput"]
  ): Promise<Metadata[]>;
  abstract getArtwork(artId: string): Promise<Metadata | null>;
  abstract getEdition(id?: string): Promise<Edition | null>;
  abstract getMasterEdition(
    id?: string
  ): Promise<MasterEditionV1 | MasterEditionV2 | null>;
}
