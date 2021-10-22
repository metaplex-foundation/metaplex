import { AccountInfo } from "@solana/web3.js";

export type AccountAndPubkey = {
    pubkey: string;
    account: AccountInfo<Buffer>;
  };

