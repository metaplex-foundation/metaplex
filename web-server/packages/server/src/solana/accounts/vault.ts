import { StringPublicKey } from "../ids";
import BN from "bn.js";
import { deserializeUnchecked } from "borsh";
import { StoreAccountDocument } from "./account";
import { AccountInfo } from "@solana/web3.js";

export class Vault {
  key: VaultKey;
  /// Store token program used
  tokenProgram: StringPublicKey;
  /// Mint that produces the fractional shares
  fractionMint: StringPublicKey;
  /// Authority who can make changes to the vault
  authority: StringPublicKey;
  /// treasury where fractional shares are held for redemption by authority
  fractionTreasury: StringPublicKey;
  /// treasury where monies are held for fractional share holders to redeem(burn) shares once buyout is made
  redeemTreasury: StringPublicKey;
  /// Can authority mint more shares from fraction_mint after activation
  allowFurtherShareCreation: boolean;

  /// Must point at an ExternalPriceAccount, which gives permission and price for buyout.
  pricingLookupAddress: StringPublicKey;
  /// In inactive state, we use this to set the order key on Safety Deposit Boxes being added and
  /// then we increment it and save so the next safety deposit box gets the next number.
  /// In the Combined state during token redemption by authority, we use it as a decrementing counter each time
  /// The authority of the vault withdrawals a Safety Deposit contents to count down how many
  /// are left to be opened and closed down. Once this hits zero, and the fraction mint has zero shares,
  /// then we can deactivate the vault.
  tokenTypeCount: number;
  state: VaultState;

  /// Once combination happens, we copy price per share to vault so that if something nefarious happens
  /// to external price account, like price change, we still have the math 'saved' for use in our calcs
  lockedPricePerShare: BN;

  constructor(args: {
    tokenProgram: StringPublicKey;
    fractionMint: StringPublicKey;
    authority: StringPublicKey;
    fractionTreasury: StringPublicKey;
    redeemTreasury: StringPublicKey;
    allowFurtherShareCreation: boolean;
    pricingLookupAddress: StringPublicKey;
    tokenTypeCount: number;
    state: VaultState;
    lockedPricePerShare: BN;
  }) {
    this.key = VaultKey.VaultV1;
    this.tokenProgram = args.tokenProgram;
    this.fractionMint = args.fractionMint;
    this.authority = args.authority;
    this.fractionTreasury = args.fractionTreasury;
    this.redeemTreasury = args.redeemTreasury;
    this.allowFurtherShareCreation = args.allowFurtherShareCreation;
    this.pricingLookupAddress = args.pricingLookupAddress;
    this.tokenTypeCount = args.tokenTypeCount;
    this.state = args.state;
    this.lockedPricePerShare = args.lockedPricePerShare;
  }
}

export enum VaultKey {
  Uninitialized = 0,
  VaultV1 = 3,
  SafetyDepositBoxV1 = 1,
  ExternalPriceAccountV1 = 2,
}

export enum VaultState {
  Inactive = 0,
  Active = 1,
  Combined = 2,
  Deactivated = 3,
}

const VAULT_SCHEMA = new Map<any, any>([
  [
    Vault,
    {
      kind: "struct",
      fields: [
        ["key", "u8"],
        ["tokenProgram", "pubkeyAsString"],
        ["fractionMint", "pubkeyAsString"],
        ["authority", "pubkeyAsString"],
        ["fractionTreasury", "pubkeyAsString"],
        ["redeemTreasury", "pubkeyAsString"],
        ["allowFurtherShareCreation", "u8"],
        ["pricingLookupAddress", "pubkeyAsString"],
        ["tokenTypeCount", "u8"],
        ["state", "u8"],
        ["lockedPricePerShare", "u64"],
      ],
    },
  ],
]);

export const decodeVault = (buffer: Buffer) => {
    return deserializeUnchecked(VAULT_SCHEMA, Vault, buffer) as Vault;
  };


export class VaultAccountDocument extends StoreAccountDocument {
  authority: string;
  state: VaultState;
  tokenTypeCount: number;

  constructor(
    store: string,
    pubkey: string,
    account: AccountInfo<Buffer>,
    authority: string,
    state: VaultState,
    tokenTypeCount: number
  ) {
      super(store, pubkey, account);
      this.authority = authority;
      this.state = state;
      this.tokenTypeCount = tokenTypeCount;
  }
}