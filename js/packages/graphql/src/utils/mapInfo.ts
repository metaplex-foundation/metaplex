import type { ParsedAccount } from "../common";
import { Fields } from "../types/sourceTypes";

export function listWrapPubkey<T>(
  list: Map<string, ParsedAccount<T>>
): Fields<T>[];
export function listWrapPubkey<T>(list: ParsedAccount<T>[]): Fields<T>[];
export function listWrapPubkey<T>(
  list: ParsedAccount<T>[] | Map<string, ParsedAccount<T>>
) {
  const len = Array.isArray(list) ? list.length : list.size;
  const result = new Array<T>(len);
  let i = 0;
  for (const item of list.values()) {
    result[i++] = wrapPubkey(item);
  }
  return result;
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
