import { StringPublicKey, AccountInfoOwnerString } from "../../utils";

export interface ParsedAccountBase {
  pubkey: StringPublicKey;
  account: AccountInfoOwnerString<Buffer>;
  info: any; // TODO: change to unknown
}

export type AccountParser = (
  pubkey: StringPublicKey,
  data: AccountInfoOwnerString<Buffer>
) => ParsedAccountBase | undefined;

export interface ParsedAccount<T> extends Omit<ParsedAccountBase, "account"> {
  info: T;
}
