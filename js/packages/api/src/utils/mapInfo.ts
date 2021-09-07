import type { ParsedAccount } from '@oyster/common';

export const mapInfo = <T>(list: ParsedAccount<T>[]) => {
  return list.map(wrapPubkey);
};

export const wrapPubkey = <T>({ pubkey, info }: ParsedAccount<T>) => ({
  ...info,
  pubkey,
});
