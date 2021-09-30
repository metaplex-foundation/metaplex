import { enumType, objectType } from "nexus";
import dedent from "dedent";

export const VaultKey = enumType({
  name: "VaultKey",
  members: {
    Uninitialized: 0,
    VaultV1: 3,
    SafetyDepositBoxV1: 1,
    ExternalPriceAccountV1: 2,
  },
});

export const VaultState = enumType({
  name: "VaultState",
  members: {
    Inactive: 0,
    Active: 1,
    Combined: 2,
    Deactivated: 3,
  },
});

export const SafetyDepositBox = objectType({
  name: "SafetyDepositBox",
  definition(t) {
    t.nonNull.field("key", {
      type: VaultKey,
      description:
        "Each token type in a vault has it's own box that contains it's mint and a look-back",
    });
    t.nonNull.pubkey("vault", {
      deprecation: "VaultKey pointing to the parent vault",
    });
    t.nonNull.pubkey("tokenMint", {
      description: "This particular token's mint",
    });
    t.nonNull.pubkey("store", {
      description: "Account that stores the tokens under management",
    });
    t.nonNull.int("order", {
      deprecation: "The order in the array of registries",
    });
  },
});

export const Vault = objectType({
  name: "Vault",
  definition(t) {
    t.field("key", { type: VaultKey });
    t.pubkey("tokenProgram", { deprecation: "Store token program used" });
    t.pubkey("fractionMint", {
      description: "Mint that produces the fractional shares",
    });
    t.pubkey("authority", {
      description: "Authority who can make changes to the vault",
    });
    t.pubkey("fractionTreasury", {
      description:
        "treasury where fractional shares are held for redemption by authority",
    });
    t.pubkey("redeemTreasury", {
      description:
        "treasury where monies are held for fractional share holders to redeem(burn) shares once buyout is made",
    });
    t.boolean("allowFurtherShareCreation", {
      description:
        "Can authority mint more shares from fraction_mint after activation",
    });
    t.pubkey("pricingLookupAddress", {
      description:
        "Must point at an ExternalPriceAccount, which gives permission and price for buyout.",
    });
    t.int("tokenTypeCount", {
      description: dedent`
        In inactive state, we use this to set the order key on Safety Deposit Boxes being added and
        then we increment it and save so the next safety deposit box gets the next number.
        In the Combined state during token redemption by authority, we use it as a decrementing counter each time
        The authority of the vault withdrawals a Safety Deposit contents to count down how many
        are left to be opened and closed down. Once this hits zero, and the fraction mint has zero shares,
        then we can deactivate the vault.
    `,
    });
    t.bn("lockedPricePerShare", {
      description: dedent`
        Once combination happens, we copy price per share to vault so that if something nefarious happens
        to external price account, like price change, we still have the math 'saved' for use in our calcs
    `,
    });
    t.field("state", { type: VaultState });
  },
});
