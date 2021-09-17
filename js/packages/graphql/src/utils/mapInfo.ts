import type { ParsedAccount } from "../common";
import { FieldPubkey } from "../sourceTypes";

export const mapInfo = <T>(list: ParsedAccount<T>[]) => {
  return list.map((i) => wrapPubkey(i));
};

export function wrapPubkey(data: undefined | null): null;
export function wrapPubkey<T>(data: ParsedAccount<T>): T & FieldPubkey;
export function wrapPubkey<T>(data?: ParsedAccount<T> | null) {
  return data
    ? {
        ...data.info,
        pubkey: data.pubkey,
      }
    : null;
}
