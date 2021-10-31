import { AccountInfo } from "@solana/web3.js";
import BN from "bn.js";
import { deserializeUnchecked } from "borsh";
import { connection } from "mongoose";
import { AUCTION_ID, StringPublicKey, toPublicKey } from "../ids";
import { findProgramAddressBase58 } from "../utils";
import { StoreAccountDocument } from "./account";
import { MetaplexKey } from "./types";

export const AUCTION_PREFIX = "auction";
export const METADATA = 'metadata';
const EXTENDED = "extended";

export class AuctionManagerV1 {
  key: MetaplexKey;
  store: string;
  authority: string;
  auction: string;
  vault: string;
  acceptPayment: string;
  state: AuctionManagerStateV1;
  settings: AuctionManagerSettingsV1;

  constructor(args: {
    store: string;
    authority: string;
    auction: string;
    vault: string;
    acceptPayment: string;
    state: AuctionManagerStateV1;
    settings: AuctionManagerSettingsV1;
  }) {
    this.key = MetaplexKey.AuctionManagerV1;
    this.store = args.store;
    this.authority = args.authority;
    this.auction = args.auction;
    this.vault = args.vault;
    this.acceptPayment = args.acceptPayment;
    this.state = args.state;
    this.settings = args.settings;
  }
}

export class AuctionManagerV2 {
  key: MetaplexKey;
  store: StringPublicKey;
  authority: StringPublicKey;
  auction: StringPublicKey;
  vault: StringPublicKey;
  acceptPayment: StringPublicKey;
  state: AuctionManagerStateV2;
  auctionDataExtended?: StringPublicKey;

  constructor(args: {
    store: StringPublicKey;
    authority: StringPublicKey;
    auction: StringPublicKey;
    vault: StringPublicKey;
    acceptPayment: StringPublicKey;
    state: AuctionManagerStateV2;
  }) {
    this.key = MetaplexKey.AuctionManagerV2;
    this.store = args.store;
    this.authority = args.authority;
    this.auction = args.auction;
    this.vault = args.vault;
    this.acceptPayment = args.acceptPayment;
    this.state = args.state;

    const auction = AUCTION_ID;

    getAuctionExtended({
      auctionProgramId: auction,
      resource: this.vault,
    }).then((val) => (this.auctionDataExtended = val));
  }
}

export class AuctionManagerStateV1 {
  status: AuctionManagerStatus = AuctionManagerStatus.Initialized;
  winningConfigItemsValidated: number = 0;

  winningConfigStates: WinningConfigState[] = [];

  participationState: ParticipationStateV1 | null = null;

  constructor(args?: AuctionManagerStateV1) {
    Object.assign(this, args);
  }
}

export class AuctionManagerSettingsV1 {
  winningConfigs: WinningConfig[] = [];
  participationConfig: ParticipationConfigV1 | null = null;

  constructor(args?: AuctionManagerSettingsV1) {
    Object.assign(this, args);
  }
}

export class WinningConfigState {
  items: WinningConfigStateItem[] = [];
  moneyPushedToAcceptPayment: boolean = false;

  constructor(args?: WinningConfigState) {
    Object.assign(this, args);
  }
}

export class WinningConfigStateItem {
  primarySaleHappened: boolean = false;
  claimed: boolean = false;

  constructor(args?: WinningConfigStateItem) {
    Object.assign(this, args);
  }
}

export class ParticipationStateV1 {
  collectedToAcceptPayment: BN = new BN(0);
  primarySaleHappened: boolean = false;
  validated: boolean = false;
  printingAuthorizationTokenAccount: string | null = null;

  constructor(args?: ParticipationStateV1) {
    Object.assign(this, args);
  }
}

export class ParticipationConfigV1 {
  winnerConstraint: WinningConstraint = WinningConstraint.NoParticipationPrize;
  nonWinningConstraint: NonWinningConstraint =
    NonWinningConstraint.GivenForFixedPrice;
  safetyDepositBoxIndex: number = 0;
  fixedPrice: BN | null = new BN(0);

  constructor(args?: ParticipationConfigV1) {
    Object.assign(this, args);
  }
}

export class WinningConfig {
  items: WinningConfigItem[] = [];

  constructor(args?: WinningConfig) {
    Object.assign(this, args);
  }
}

export class WinningConfigItem {
  safetyDepositBoxIndex: number = 0;
  amount: number = 0;
  winningConfigType: WinningConfigType = WinningConfigType.TokenOnlyTransfer;

  constructor(args?: WinningConfigItem) {
    Object.assign(this, args);
  }
}

export enum WinningConstraint {
  NoParticipationPrize = 0,
  ParticipationPrizeGiven = 1,
}

export enum NonWinningConstraint {
  NoParticipationPrize = 0,
  GivenForFixedPrice = 1,
  GivenForBidPrice = 2,
}

export enum WinningConfigType {
  /// You may be selling your one-of-a-kind NFT for the first time, but not it's accompanying Metadata,
  /// of which you would like to retain ownership. You get 100% of the payment the first sale, then
  /// royalties forever after.
  ///
  /// You may be re-selling something like a Limited/Open Edition print from another auction,
  /// a master edition record token by itself (Without accompanying metadata/printing ownership), etc.
  /// This means artists will get royalty fees according to the top level royalty % on the metadata
  /// split according to their percentages of contribution.
  ///
  /// No metadata ownership is transferred in this instruction, which means while you may be transferring
  /// the token for a limited/open edition away, you would still be (nominally) the owner of the limited edition
  /// metadata, though it confers no rights or privileges of any kind.
  TokenOnlyTransfer,
  /// Means you are auctioning off the master edition record and it's metadata ownership as well as the
  /// token itself. The other person will be able to mint authorization tokens and make changes to the
  /// artwork.
  FullRightsTransfer,
  /// Means you are using authorization tokens to print off editions during the auction using
  /// from a MasterEditionV1
  PrintingV1,
  /// Means you are using the MasterEditionV2 to print off editions
  PrintingV2,
  /// Means you are using a MasterEditionV2 as a participation prize.
  Participation,
}

export async function getAuctionExtended({
  auctionProgramId,
  resource,
}: {
  auctionProgramId: StringPublicKey;
  resource: StringPublicKey;
}): Promise<StringPublicKey> {
  return (
    await findProgramAddressBase58(
      [
        Buffer.from(AUCTION_PREFIX),
        toPublicKey(auctionProgramId).toBuffer(),
        toPublicKey(resource).toBuffer(),
        Buffer.from(EXTENDED),
      ],
      toPublicKey(auctionProgramId)
    )
  )[0];
}

export class AuctionManagerStateV2 {
  status: AuctionManagerStatus = AuctionManagerStatus.Initialized;
  safetyConfigItemsValidated: BN = new BN(0);
  bidsPushedToAcceptPayment: BN = new BN(0);
  hasParticipation: boolean = false;

  constructor(args?: AuctionManagerStateV2) {
    Object.assign(this, args);
  }
}
export enum AuctionManagerStatus {
  Initialized,
  Validated,
  Running,
  Disbursing,
  Finished,
}

const AUCTION_MANAGER_SCHEMA = new Map<any, any>([
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
]);

export const decodeAuctionManager = (
  buffer: Buffer
): AuctionManagerV1 | AuctionManagerV2 => {
  return buffer[0] == MetaplexKey.AuctionManagerV1
    ? deserializeUnchecked(AUCTION_MANAGER_SCHEMA, AuctionManagerV1, buffer)
    : deserializeUnchecked(AUCTION_MANAGER_SCHEMA, AuctionManagerV2, buffer);
};

export class AuctionManagerAccountDocument extends StoreAccountDocument {
    auction: string;
    collection: string | undefined;
    price : number | undefined;
    metadata : string;
    nftName : string;
    nftDescription : string;
    nftImageUrl : string;
    auctionState : number;
    constructor(
      store: string,
      account: AccountInfo<Buffer>,
      pubkey: string,
      auction: string,
      collection: string | undefined,
      price : number | undefined,
      metadata : string,
      nftName : string,
      nftDescription : string,
      nftImageUrl : string,
      auctionState : number
    ) {
      super(store, pubkey, account);
      this.auction = auction;
      this.collection = collection;
      this.price = price;
      this.metadata = metadata;
      this.nftName = nftName;
      this.nftDescription = nftDescription;
      this.nftImageUrl = nftImageUrl;
      this.auctionState = auctionState;
    }
  }
