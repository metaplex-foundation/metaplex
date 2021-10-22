import { bufferConverter } from "../serialization/converters/bufferConverter";
import { publicKeyConverter } from "../serialization/converters/publicKeyConverter";
import { ConverterSet } from "../serialization/converterSet";
import { AccountAndPubkey } from "../types";

export class StoreAccountDocument {
  store: string;
  accountData: AccountAndPubkey;

  constructor(store: string, accountData: AccountAndPubkey) {
    this.store = store;
    this.accountData = accountData;
  }
}

export const accountConverterSet = new ConverterSet([
  ["accountData.account.owner", publicKeyConverter],
  ["accountData.account.data", bufferConverter],
]);
