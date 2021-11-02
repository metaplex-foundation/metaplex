import { DEPRECATED_SCHEMA } from "../metaplex/deprecatedStates";
import {
  PrizeTrackingTicket,
  AuctionManagerV2,
  AuctionManagerStateV2,
  ParticipationConfigV2,
  Store,
  ParticipationStateV2,
  PayoutTicket,
  AmountRange,
  SafetyDepositConfig,
} from "./entities";
import { ClaimBidArgs } from "./ClaimBidArgs";
import { DecommissionAuctionManagerArgs } from "./DecommissionAuctionManagerArgs";
import { EmptyPaymentAccountArgs } from "./EmptyPaymentAccountArgs";
import { InitAuctionManagerV2Args } from "./InitAuctionManagerV2Args";
import { RedeemBidArgs } from "./RedeemBidArgs";
import { RedeemFullRightsTransferBidArgs } from "./RedeemFullRightsTransferBidArgs";
import { RedeemParticipationBidV3Args } from "./RedeemParticipationBidV3Args";
import { RedeemPrintingV2BidArgs } from "./RedeemPrintingV2BidArgs";
import { RedeemUnusedWinningConfigItemsAsAuctioneerArgs } from "./RedeemUnusedWinningConfigItemsAsAuctioneerArgs";
import { SetStoreArgs } from "./SetStoreArgs";
import { SetWhitelistedCreatorArgs } from "./SetWhitelistedCreatorArgs";
import { StartAuctionArgs } from "./StartAuctionArgs";
import { ValidateSafetyDepositBoxV2Args } from "./ValidateSafetyDepositBoxV2Args";
import { WhitelistedCreator } from "./entities/WhitelistedCreator";
import { WithdrawMasterEditionArgs } from "./WithdrawMasterEditionArgs";

export const SCHEMA = new Map<any, any>([
  ...DEPRECATED_SCHEMA,
  [
    PrizeTrackingTicket,
    {
      kind: "struct",
      fields: [
        ["key", "u8"],
        ["metadata", "pubkeyAsString"],
        ["supplySnapshot", "u64"],
        ["expectedRedemptions", "u64"],
        ["redemptions", "u64"],
      ],
    },
  ],
  [
    AuctionManagerV2,
    {
      kind: "struct",
      fields: [
        ["key", "u8"],
        ["store", "pubkeyAsString"],
        ["authority", "pubkeyAsString"],
        ["auction", "pubkeyAsString"],
        ["vault", "pubkeyAsString"],
        ["acceptPayment", "pubkeyAsString"],
        ["state", AuctionManagerStateV2],
      ],
    },
  ],
  [
    ParticipationConfigV2,
    {
      kind: "struct",
      fields: [
        ["winnerConstraint", "u8"], // enum
        ["nonWinningConstraint", "u8"],
        ["fixedPrice", { kind: "option", type: "u64" }],
      ],
    },
  ],

  [
    WhitelistedCreator,
    {
      kind: "struct",
      fields: [
        ["key", "u8"],
        ["address", "pubkeyAsString"],
        ["activated", "u8"],
      ],
    },
  ],
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
  [
    AuctionManagerStateV2,
    {
      kind: "struct",
      fields: [
        ["status", "u8"],
        ["safetyConfigItemsValidated", "u64"],
        ["bidsPushedToAcceptPayment", "u64"],
        ["hasParticipation", "u8"],
      ],
    },
  ],
  [
    ParticipationStateV2,
    {
      kind: "struct",
      fields: [["collectedToAcceptPayment", "u64"]],
    },
  ],
  [
    PayoutTicket,
    {
      kind: "struct",
      fields: [
        ["key", "u8"],
        ["recipient", "pubkeyAsString"],
        ["amountPaid", "u64"],
      ],
    },
  ],
  [
    AmountRange,
    {
      kind: "struct",
      fields: [
        ["amount", "u64"],
        ["length", "u64"],
      ],
    },
  ],
  [
    SafetyDepositConfig,
    {
      kind: "struct",
      fields: [
        ["key", "u8"],
        ["auctionManager", "pubkeyAsString"],
        ["order", "u64"],
        ["winningConfigType", "u8"],
        ["amountType", "u8"],
        ["lengthType", "u8"],
        ["amountRanges", [AmountRange]],
        [
          "participationConfig",
          { kind: "option", type: ParticipationConfigV2 },
        ],
        ["participationState", { kind: "option", type: ParticipationStateV2 }],
      ],
    },
  ],
  [
    RedeemUnusedWinningConfigItemsAsAuctioneerArgs,
    {
      kind: "struct",
      fields: [
        ["instruction", "u8"],
        ["winningConfigItemIndex", "u8"],
        ["proxyCall", "u8"],
      ],
    },
  ],
  [
    DecommissionAuctionManagerArgs,
    {
      kind: "struct",
      fields: [["instruction", "u8"]],
    },
  ],
  [
    RedeemPrintingV2BidArgs,
    {
      kind: "struct",
      fields: [
        ["instruction", "u8"],
        ["editionOffset", "u64"],
        ["winIndex", "u64"],
      ],
    },
  ],
  [
    WithdrawMasterEditionArgs,
    {
      kind: "struct",
      fields: [["instruction", "u8"]],
    },
  ],

  [
    RedeemParticipationBidV3Args,
    {
      kind: "struct",
      fields: [
        ["instruction", "u8"],
        ["winIndex", { kind: "option", type: "u64" }],
      ],
    },
  ],
  [
    InitAuctionManagerV2Args,
    {
      kind: "struct",
      fields: [
        ["instruction", "u8"],
        ["amountType", "u8"],
        ["lengthType", "u8"],
        ["maxRanges", "u64"],
      ],
    },
  ],
  [
    ValidateSafetyDepositBoxV2Args,
    {
      kind: "struct",
      fields: [
        ["instruction", "u8"],
        ["safetyDepositConfig", SafetyDepositConfig],
      ],
    },
  ],
  [
    RedeemBidArgs,
    {
      kind: "struct",
      fields: [["instruction", "u8"]],
    },
  ],
  [
    RedeemFullRightsTransferBidArgs,
    {
      kind: "struct",
      fields: [["instruction", "u8"]],
    },
  ],

  [
    StartAuctionArgs,
    {
      kind: "struct",
      fields: [["instruction", "u8"]],
    },
  ],
  [
    ClaimBidArgs,
    {
      kind: "struct",
      fields: [["instruction", "u8"]],
    },
  ],
  [
    EmptyPaymentAccountArgs,
    {
      kind: "struct",
      fields: [
        ["instruction", "u8"],
        ["winningConfigIndex", { kind: "option", type: "u8" }],
        ["winningConfigItemIndex", { kind: "option", type: "u8" }],
        ["creatorIndex", { kind: "option", type: "u8" }],
      ],
    },
  ],
  [
    SetStoreArgs,
    {
      kind: "struct",
      fields: [
        ["instruction", "u8"],
        ["public", "u8"], //bool
      ],
    },
  ],
  [
    SetWhitelistedCreatorArgs,
    {
      kind: "struct",
      fields: [
        ["instruction", "u8"],
        ["activated", "u8"], //bool
      ],
    },
  ],
]);
