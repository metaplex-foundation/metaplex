import { AccountInfo } from "@solana/web3.js";
import { deserializeUnchecked } from "borsh";
import { StringPublicKey } from "../ids";
import { StoreAccountDocument } from "./account";
import { VaultKey } from "./vault";

export class SafetyDepositBox {
  /// Each token type in a vault has it's own box that contains it's mint and a look-back
  key: VaultKey;
  /// VaultKey pointing to the parent vault
  vault: StringPublicKey;
  /// This particular token's mint
  tokenMint: StringPublicKey;
  /// Account that stores the tokens under management
  store: StringPublicKey;
  /// the order in the array of registries
  order: number;

  constructor(args: {
    vault: StringPublicKey;
    tokenMint: StringPublicKey;
    store: StringPublicKey;
    order: number;
  }) {
    this.key = VaultKey.SafetyDepositBoxV1;
    this.vault = args.vault;
    this.tokenMint = args.tokenMint;
    this.store = args.store;
    this.order = args.order;
  }
}

const SAFETY_DEPOSIT_BOX_SCHEMA = new Map<any, any>([
  [
    SafetyDepositBox,
    {
      kind: "struct",
      fields: [
        ["key", "u8"],
        ["vault", "pubkeyAsString"],
        ["tokenMint", "pubkeyAsString"],
        ["store", "pubkeyAsString"],
        ["order", "u8"],
      ],
    },
  ],
]);

export const decodeSafetyDeposit = (buffer: Buffer) => {
  return deserializeUnchecked(
    SAFETY_DEPOSIT_BOX_SCHEMA,
    SafetyDepositBox,
    buffer
  ) as SafetyDepositBox;
};

export class SafetyDepositBoxAccountDocument extends StoreAccountDocument {
  vault: string;
  order: number;
  constructor(
    store: string,
    account: AccountInfo<Buffer>,
    pubkey: string,
    vault: string,
    order: number
  ) {
    super(store, pubkey, account);
    this.vault = vault;
    this.order = order;
  }
}