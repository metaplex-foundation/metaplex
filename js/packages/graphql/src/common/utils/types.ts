import type { AccountInfo } from "@solana/web3.js";

export interface AccountInfoOwnerString<T>
  extends Omit<AccountInfo<T>, "owner"> {
  owner: string;
}

export type AccountAndPubkey = {
  pubkey: string;
  account: AccountInfoOwnerString<Buffer>;
};
