import type { ParsedAccount } from "../common";
import { Fields } from "../types/sourceTypes";

export function listWrapPubkey<T>(
  list: Map<string, ParsedAccount<T>>
): Fields<T>[];
export function listWrapPubkey<T>(list: ParsedAccount<T>[]): Fields<T>[];
export function listWrapPubkey<T>(
  list: ParsedAccount<T>[] | Map<string, ParsedAccount<T>>
) {
  const array = Array.isArray(list) ? list : Array.from(list.values());
  return array.map((i) => wrapPubkey(i));
}

export function wrapPubkey(data: undefined | null): null;
export function wrapPubkey<T>(data: ParsedAccount<T>): Fields<T>;
export function wrapPubkey<T>(data?: ParsedAccount<T> | null) {
  return data
    ? {
        ...data.info,
        pubkey: data.pubkey,
      }
    : null;
}
