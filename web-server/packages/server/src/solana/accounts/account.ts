import { AccountInfo } from "@solana/web3.js";
import { bufferConverter } from "../serialization/converters/bufferConverter";
import { publicKeyConverter } from "../serialization/converters/publicKeyConverter";
import { ConverterSet } from "../serialization/converterSet";
import { AccountAndPubkey } from "../types";

export class StoreAccountDocument {
  store: string;
  account: AccountInfo<Buffer>;
  pubkey: string;

  constructor(store: string, pubkey: string, account : AccountInfo<Buffer>) {
    this.store = store;
    this.pubkey = pubkey;
    this.account = account;
  }
}

export const accountConverterSet = new ConverterSet([
  ["account.owner", publicKeyConverter],
  ["account.data", bufferConverter],
]);
