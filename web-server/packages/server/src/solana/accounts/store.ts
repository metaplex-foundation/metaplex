import { AccountInfo } from "@solana/web3.js";
import { deserializeUnchecked } from "borsh";
import { StringPublicKey } from "../ids";
import { AccountDocument, StoreAccountDocument } from "./account";
import { MetaplexKey } from "./types";

export class Store {
    key: MetaplexKey = MetaplexKey.StoreV1;
    public: boolean = true;
    auctionProgram: StringPublicKey;
    tokenVaultProgram: StringPublicKey;
    tokenMetadataProgram: StringPublicKey;
    tokenProgram: StringPublicKey;

    constructor(args: {
      public: boolean;
      auctionProgram: StringPublicKey;
      tokenVaultProgram: StringPublicKey;
      tokenMetadataProgram: StringPublicKey;
      tokenProgram: StringPublicKey;
    }) {
      this.key = MetaplexKey.StoreV1;
      this.public = args.public;
      this.auctionProgram = args.auctionProgram;
      this.tokenVaultProgram = args.tokenVaultProgram;
      this.tokenMetadataProgram = args.tokenMetadataProgram;
      this.tokenProgram = args.tokenProgram;
    }
  }

  const STORE_SCHEMA = new Map<any, any>([
    [
      Store,
      {
        kind: "struct",
        fields: [
          ["key", "u8"],
          ["public", "u8"],
          ["auctionProgram", "pubkeyAsString"],
          ["tokenVaultProgram", "pubkeyAsString"],
          ["tokenMetadataProgram", "pubkeyAsString"],
          ["tokenProgram", "pubkeyAsString"],
        ],
      },
    ],
  ]);

  export const decodeStore = (buffer: Buffer) => {
    return deserializeUnchecked(STORE_SCHEMA, Store, buffer) as Store;
  };


  export class MetaplexStoreAccountDocument extends StoreAccountDocument
  {
      isPublic : boolean;
      constructor(store : string, pubkey : string, account : AccountInfo<Buffer>, isPublic : boolean) {
          super(store, pubkey, account);
          this.isPublic = isPublic;
      }
  }