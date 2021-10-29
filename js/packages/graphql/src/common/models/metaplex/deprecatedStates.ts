import {
  AuctionManagerSettingsV1,
  AuctionManagerStateV1,
  AuctionManagerV1,
  BidRedemptionTicketV1,
  ParticipationConfigV1,
  ParticipationStateV1,
  WinningConfig,
  WinningConfigItem,
  WinningConfigState,
  WinningConfigStateItem,
} from "./entities";
import { DeprecatedValidateSafetyDepositBoxV1Args } from "./DeprecatedValidateSafetyDepositBoxV1Args";
import { DeprecatedRedeemParticipationBidArgs } from "./DeprecatedRedeemParticipationBidArgs";
import { DeprecatedPopulateParticipationPrintingAccountArgs } from "./DeprecatedPopulateParticipationPrintingAccountArgs";
import { DeprecatedValidateParticipationArgs } from "./DeprecatedValidateParticipationArgs";
import { DeprecatedInitAuctionManagerV1Args } from "./DeprecatedInitAuctionManagerV1Args";

export const DEPRECATED_SCHEMA = new Map<any, any>([
  [
    AuctionManagerV1,
    {
      kind: "struct",
      fields: [
        ["key", "u8"],
        ["store", "pubkeyAsString"],
        ["authority", "pubkeyAsString"],
        ["auction", "pubkeyAsString"],
        ["vault", "pubkeyAsString"],
        ["acceptPayment", "pubkeyAsString"],
        ["state", AuctionManagerStateV1],
        ["settings", AuctionManagerSettingsV1],
      ],
    },
  ],
  [
    ParticipationConfigV1,
    {
      kind: "struct",
      fields: [
        ["winnerConstraint", "u8"], // enum
        ["nonWinningConstraint", "u8"],
        ["safetyDepositBoxIndex", "u8"],
        ["fixedPrice", { kind: "option", type: "u64" }],
      ],
    },
  ],
  [
    AuctionManagerSettingsV1,
    {
      kind: "struct",
      fields: [
        ["winningConfigs", [WinningConfig]],
        [
          "participationConfig",
          { kind: "option", type: ParticipationConfigV1 },
        ],
      ],
    },
  ],
  [
    WinningConfig,
    {
      kind: "struct",
      fields: [["items", [WinningConfigItem]]],
    },
  ],
  [
    WinningConfigItem,
    {
      kind: "struct",
      fields: [
        ["safetyDepositBoxIndex", "u8"],
        ["amount", "u8"],
        ["winningConfigType", "u8"],
      ],
    },
  ],
  [
    WinningConfigState,
    {
      kind: "struct",
      fields: [
        ["items", [WinningConfigStateItem]],
        ["moneyPushedToAcceptPayment", "u8"], // bool
      ],
    },
  ],
  [
    WinningConfigStateItem,
    {
      kind: "struct",
      fields: [
        ["primarySaleHappened", "u8"], //bool
        ["claimed", "u8"], // bool
      ],
    },
  ],
  [
    AuctionManagerStateV1,
    {
      kind: "struct",
      fields: [
        ["status", "u8"],
        ["winningConfigItemsValidated", "u8"],
        ["winningConfigStates", [WinningConfigState]],
        ["participationState", { kind: "option", type: ParticipationStateV1 }],
      ],
    },
  ],
  [
    ParticipationStateV1,
    {
      kind: "struct",
      fields: [
        ["collectedToAcceptPayment", "u64"],
        ["primarySaleHappened", "u8"], //bool
        ["validated", "u8"], //bool
        [
          "printingAuthorizationTokenAccount",
          { kind: "option", type: "pubkeyAsString" },
        ],
      ],
    },
  ],
  [
    BidRedemptionTicketV1,
    {
      kind: "struct",
      fields: [
        ["key", "u8"],
        ["participationRedeemed", "u8"], // bool
        ["itemsRedeemed", "u8"], // bool
      ],
    },
  ],
  [
    DeprecatedPopulateParticipationPrintingAccountArgs,
    {
      kind: "struct",
      fields: [["instruction", "u8"]],
    },
  ],
  [
    DeprecatedInitAuctionManagerV1Args,
    {
      kind: "struct",
      fields: [
        ["instruction", "u8"],
        ["settings", AuctionManagerSettingsV1],
      ],
    },
  ],
  [
    DeprecatedValidateSafetyDepositBoxV1Args,
    {
      kind: "struct",
      fields: [["instruction", "u8"]],
    },
  ],
  [
    DeprecatedRedeemParticipationBidArgs,
    {
      kind: "struct",
      fields: [["instruction", "u8"]],
    },
  ],
  [
    DeprecatedValidateParticipationArgs,
    {
      kind: "struct",
      fields: [["instruction", "u8"]],
    },
  ],
]);
