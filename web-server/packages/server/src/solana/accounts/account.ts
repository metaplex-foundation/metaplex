import { AccountInfo } from "@solana/web3.js";
import { bufferConverter } from "../serialization/converters/bufferConverter";
import { publicKeyConverter } from "../serialization/converters/publicKeyConverter";
import { ConverterSet } from "../serialization/converterSet";
import { AccountAndPubkey } from "../types";

export class AccountDocument {
  pubkey : string;
  account : AccountInfo<Buffer>

  constructor(pubkey:string, account : AccountInfo<Buffer>) {
    this.pubkey = pubkey;
    this.account = account;
  }
}
export class StoreAccountDocument extends AccountDocument {
  store: string;

  constructor(store: string, pubkey: string, account : AccountInfo<Buffer>) {
    super(pubkey, account);
    this.store = store;
  }
}

export const accountConverterSet = new ConverterSet([
  ["account.owner", publicKeyConverter],
  ["account.data", bufferConverter],
]);
