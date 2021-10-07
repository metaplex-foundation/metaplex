import { Connection } from "@solana/web3.js";
import { IEvent } from "api";
import { MetaTypes } from "common";
import { PubSub, withFilter } from "graphql-subscriptions";
import { loadUserTokenAccounts } from "utils/loadUserTokenAccounts";
import { FilterFn } from "./types";

export interface ReadAdapter {
  getReader(network: string): Reader | null;
  init(): Promise<void>;
}

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
}
