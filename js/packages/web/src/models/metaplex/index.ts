import {
  AUCTION_PREFIX,
  programIds,
  METADATA,
  AccountParser,
} from '@oyster/common';
import { AccountInfo, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { deserializeUnchecked } from 'borsh';

export * from './initAuctionManager';
export * from './redeemBid';
export * from './redeemFullRightsTransferBid';
export * from './redeemParticipationBid';
export * from './startAuction';
export * from './validateSafetyDepositBox';

export const METAPLEX_PREFIX = 'metaplex';
export const ORIGINAL_AUTHORITY_LOOKUP_SIZE = 33;

export enum MetaplexKey {
  Uninitialized = 0,
  OriginalAuthorityLookupV1 = 1,
  BidRedemptionTicketV1 = 2,
  StoreV1 = 3,
  WhitelistedCreatorV1 = 4,
  PayoutTicketV1 = 5,
  SafetyDepositValidationTicketV1 = 6,
  AuctionManagerV1 = 7,
}

export class PayoutTicket {
  key: MetaplexKey = MetaplexKey.PayoutTicketV1;
  recipient: PublicKey;
  amountPaid: BN;

  constructor(args: { recipient: PublicKey; amountPaid: BN }) {
    this.key = MetaplexKey.PayoutTicketV1;
    this.recipient = args.recipient;
    this.amountPaid = args.amountPaid;
  }
}
export class AuctionManager {
  key: MetaplexKey;
  store: PublicKey;
  authority: PublicKey;
  auction: PublicKey;
  vault: PublicKey;
  acceptPayment: PublicKey;
  state: AuctionManagerState;
  settings: AuctionManagerSettings;

  constructor(args: {
    store: PublicKey;
    authority: PublicKey;
    auction: PublicKey;
    vault: PublicKey;
    acceptPayment: PublicKey;
    state: AuctionManagerState;
    settings: AuctionManagerSettings;
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

export class InitAuctionManagerArgs {
  instruction = 0;
  settings: AuctionManagerSettings;

  constructor(args: { settings: AuctionManagerSettings }) {
    this.settings = args.settings;
  }
}

export class ValidateSafetyDepositBoxArgs {
  instruction = 1;
}

export class RedeemBidArgs {
  instruction = 2;
}

export class RedeemFullRightsTransferBidArgs {
  instruction = 3;
}

export class RedeemParticipationBidArgs {
  instruction = 4;
}

export class StartAuctionArgs {
  instruction = 5;
}
export class ClaimBidArgs {
  instruction = 6;
}

export class PopulateParticipationPrintingAccountArgs {
  instruction = 11;
}

export class EmptyPaymentAccountArgs {
  instruction = 7;
  winningConfigIndex: number | null;
  winningConfigItemIndex: number | null;
  creatorIndex: number | null;
  constructor(args: {
    winningConfigIndex: number | null;
    winningConfigItemIndex: number | null;
    creatorIndex: number | null;
  }) {
    this.winningConfigIndex = args.winningConfigIndex;
    this.winningConfigItemIndex = args.winningConfigItemIndex;
    this.creatorIndex = args.creatorIndex;
  }
}

export class SetStoreArgs {
  instruction = 8;
  public: boolean;
  constructor(args: { public: boolean }) {
    this.public = args.public;
  }
}

export class SetWhitelistedCreatorArgs {
  instruction = 9;
  activated: boolean;
  constructor(args: { activated: boolean }) {
    this.activated = args.activated;
  }
}

export class ValidateParticipationArgs {
  instruction = 10;
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

export class AuctionManagerSettings {
  winningConfigs: WinningConfig[] = [];
  participationConfig: ParticipationConfig | null = null;

  constructor(args?: AuctionManagerSettings) {
    Object.assign(this, args);
  }
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
  /// Means you are using authorization tokens to print off editions during the auction
  Printing,
}
export class ParticipationState {
  collectedToAcceptPayment: BN = new BN(0);
  primarySaleHappened: boolean = false;
  validated: boolean = false;
  printingAuthorizationTokenAccount: PublicKey | null = null;

  constructor(args?: ParticipationState) {
    Object.assign(this, args);
  }
}

export class ParticipationConfig {
  winnerConstraint: WinningConstraint = WinningConstraint.NoParticipationPrize;
  nonWinningConstraint: NonWinningConstraint =
    NonWinningConstraint.GivenForFixedPrice;
  safetyDepositBoxIndex: number = 0;
  fixedPrice: BN | null = new BN(0);

  constructor(args?: ParticipationConfig) {
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

export const decodeWhitelistedCreator = (buffer: Buffer) => {
  return deserializeUnchecked(
    SCHEMA,
    WhitelistedCreator,
    buffer,
  ) as WhitelistedCreator;
};

export const WhitelistedCreatorParser: AccountParser = (
  pubkey: PublicKey,
  account: AccountInfo<Buffer>,
) => ({
  pubkey,
  account,
  info: decodeWhitelistedCreator(account.data),
});

export const decodeStore = (buffer: Buffer) => {
  return deserializeUnchecked(SCHEMA, Store, buffer) as Store;
};

export const decodeAuctionManager = (buffer: Buffer) => {
  return deserializeUnchecked(SCHEMA, AuctionManager, buffer) as AuctionManager;
};

export const decodeBidRedemptionTicket = (buffer: Buffer) => {
  return deserializeUnchecked(
    SCHEMA,
    BidRedemptionTicket,
    buffer,
  ) as BidRedemptionTicket;
};

export const decodePayoutTicket = (buffer: Buffer) => {
  return deserializeUnchecked(SCHEMA, PayoutTicket, buffer) as PayoutTicket;
};

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

export class WhitelistedCreator {
  key: MetaplexKey = MetaplexKey.WhitelistedCreatorV1;
  address: PublicKey;
  activated: boolean = true;

  // Populated from name service
  twitter?: string;
  name?: string;
  image?: string;
  description?: string;

  constructor(args: { address: PublicKey; activated: boolean }) {
    this.address = args.address;
    this.activated = args.activated;
  }
}

export class Store {
  key: MetaplexKey = MetaplexKey.StoreV1;
  public: boolean = true;
  auctionProgram: PublicKey;
  tokenVaultProgram: PublicKey;
  tokenMetadataProgram: PublicKey;
  tokenProgram: PublicKey;

  constructor(args: {
    public: boolean;
    auctionProgram: PublicKey;
    tokenVaultProgram: PublicKey;
    tokenMetadataProgram: PublicKey;
    tokenProgram: PublicKey;
  }) {
    this.key = MetaplexKey.StoreV1;
    this.public = args.public;
    this.auctionProgram = args.auctionProgram;
    this.tokenVaultProgram = args.tokenVaultProgram;
    this.tokenMetadataProgram = args.tokenMetadataProgram;
    this.tokenProgram = args.tokenProgram;
  }
}

export class AuctionManagerState {
  status: AuctionManagerStatus = AuctionManagerStatus.Initialized;
  winningConfigItemsValidated: number = 0;

  winningConfigStates: WinningConfigState[] = [];

  participationState: ParticipationState | null = null;

  constructor(args?: AuctionManagerState) {
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

export class BidRedemptionTicket {
  key: MetaplexKey = MetaplexKey.BidRedemptionTicketV1;
  participationRedeemed: boolean = false;
  itemsRedeemed: number = 0;

  constructor(args?: BidRedemptionTicket) {
    Object.assign(this, args);
  }
}

export const SCHEMA = new Map<any, any>([
  [
    AuctionManager,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['store', 'pubkey'],
        ['authority', 'pubkey'],
        ['auction', 'pubkey'],
        ['vault', 'pubkey'],
        ['acceptPayment', 'pubkey'],
        ['state', AuctionManagerState],
        ['settings', AuctionManagerSettings],
      ],
    },
  ],
  [
    ParticipationConfig,
    {
      kind: 'struct',
      fields: [
        ['winnerConstraint', 'u8'], // enum
        ['nonWinningConstraint', 'u8'],
        ['safetyDepositBoxIndex', 'u8'],
        ['fixedPrice', { kind: 'option', type: 'u64' }],
      ],
    },
  ],
  [
    AuctionManagerSettings,
    {
      kind: 'struct',
      fields: [
        ['winningConfigs', [WinningConfig]],
        ['participationConfig', { kind: 'option', type: ParticipationConfig }],
      ],
    },
  ],
  [
    WinningConfig,
    {
      kind: 'struct',
      fields: [['items', [WinningConfigItem]]],
    },
  ],
  [
    WinningConfigItem,
    {
      kind: 'struct',
      fields: [
        ['safetyDepositBoxIndex', 'u8'],
        ['amount', 'u8'],
        ['winningConfigType', 'u8'],
      ],
    },
  ],
  [
    WinningConfigState,
    {
      kind: 'struct',
      fields: [
        ['items', [WinningConfigStateItem]],
        ['moneyPushedToAcceptPayment', 'u8'], // bool
      ],
    },
  ],
  [
    WinningConfigStateItem,
    {
      kind: 'struct',
      fields: [
        ['primarySaleHappened', 'u8'], //bool
        ['claimed', 'u8'], // bool
      ],
    },
  ],
  [
    WhitelistedCreator,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['address', 'pubkey'],
        ['activated', 'u8'],
      ],
    },
  ],
  [
    Store,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['public', 'u8'],
        ['auctionProgram', 'pubkey'],
        ['tokenVaultProgram', 'pubkey'],
        ['tokenMetadataProgram', 'pubkey'],
        ['tokenProgram', 'pubkey'],
      ],
    },
  ],
  [
    AuctionManagerState,
    {
      kind: 'struct',
      fields: [
        ['status', 'u8'],
        ['winningConfigItemsValidated', 'u8'],
        ['winningConfigStates', [WinningConfigState]],
        ['participationState', { kind: 'option', type: ParticipationState }],
      ],
    },
  ],
  [
    ParticipationState,
    {
      kind: 'struct',
      fields: [
        ['collectedToAcceptPayment', 'u64'],
        ['primarySaleHappened', 'u8'], //bool
        ['validated', 'u8'], //bool
        [
          'printingAuthorizationTokenAccount',
          { kind: 'option', type: 'pubkey' },
        ],
      ],
    },
  ],
  [
    BidRedemptionTicket,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['participationRedeemed', 'u8'], // bool
        ['itemsRedeemed', 'u8'], // bool
      ],
    },
  ],
  [
    PayoutTicket,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['recipient', 'pubkey'],
        ['amountPaid', 'u64'],
      ],
    },
  ],
  [
    PopulateParticipationPrintingAccountArgs,
    {
      kind: 'struct',
      fields: [['instruction', 'u8']],
    },
  ],
  [
    InitAuctionManagerArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['settings', AuctionManagerSettings],
      ],
    },
  ],
  [
    ValidateSafetyDepositBoxArgs,
    {
      kind: 'struct',
      fields: [['instruction', 'u8']],
    },
  ],
  [
    RedeemBidArgs,
    {
      kind: 'struct',
      fields: [['instruction', 'u8']],
    },
  ],
  [
    RedeemFullRightsTransferBidArgs,
    {
      kind: 'struct',
      fields: [['instruction', 'u8']],
    },
  ],
  [
    RedeemParticipationBidArgs,
    {
      kind: 'struct',
      fields: [['instruction', 'u8']],
    },
  ],
  [
    StartAuctionArgs,
    {
      kind: 'struct',
      fields: [['instruction', 'u8']],
    },
  ],
  [
    ClaimBidArgs,
    {
      kind: 'struct',
      fields: [['instruction', 'u8']],
    },
  ],
  [
    EmptyPaymentAccountArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['winningConfigIndex', { kind: 'option', type: 'u8' }],
        ['winningConfigItemIndex', { kind: 'option', type: 'u8' }],
        ['creatorIndex', { kind: 'option', type: 'u8' }],
      ],
    },
  ],
  [
    SetStoreArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['public', 'u8'], //bool
      ],
    },
  ],
  [
    SetWhitelistedCreatorArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['activated', 'u8'], //bool
      ],
    },
  ],
  [
    ValidateParticipationArgs,
    {
      kind: 'struct',
      fields: [['instruction', 'u8']],
    },
  ],
]);

export async function getAuctionManagerKey(
  vault: PublicKey,
  auctionKey: PublicKey,
): Promise<PublicKey> {
  const PROGRAM_IDS = programIds();

  return (
    await PublicKey.findProgramAddress(
      [Buffer.from(METAPLEX_PREFIX), auctionKey.toBuffer()],
      PROGRAM_IDS.metaplex,
    )
  )[0];
}

export async function getAuctionKeys(
  vault: PublicKey,
): Promise<{ auctionKey: PublicKey; auctionManagerKey: PublicKey }> {
  const PROGRAM_IDS = programIds();

  const auctionKey: PublicKey = (
    await PublicKey.findProgramAddress(
      [
        Buffer.from(AUCTION_PREFIX),
        PROGRAM_IDS.auction.toBuffer(),
        vault.toBuffer(),
      ],
      PROGRAM_IDS.auction,
    )
  )[0];

  const auctionManagerKey = await getAuctionManagerKey(vault, auctionKey);

  return { auctionKey, auctionManagerKey };
}

export async function getBidderKeys(
  auctionKey: PublicKey,
  bidder: PublicKey,
): Promise<{ bidMetadata: PublicKey; bidRedemption: PublicKey }> {
  const PROGRAM_IDS = programIds();

  const bidMetadata: PublicKey = (
    await PublicKey.findProgramAddress(
      [
        Buffer.from(AUCTION_PREFIX),
        PROGRAM_IDS.auction.toBuffer(),
        auctionKey.toBuffer(),
        bidder.toBuffer(),
        Buffer.from(METADATA),
      ],
      PROGRAM_IDS.auction,
    )
  )[0];

  const bidRedemption: PublicKey = (
    await PublicKey.findProgramAddress(
      [
        Buffer.from(METAPLEX_PREFIX),
        auctionKey.toBuffer(),
        bidMetadata.toBuffer(),
      ],
      PROGRAM_IDS.metaplex,
    )
  )[0];

  return { bidMetadata, bidRedemption };
}

export async function getOriginalAuthority(
  auctionKey: PublicKey,
  metadata: PublicKey,
): Promise<PublicKey> {
  const PROGRAM_IDS = programIds();

  return (
    await PublicKey.findProgramAddress(
      [
        Buffer.from(METAPLEX_PREFIX),
        auctionKey.toBuffer(),
        metadata.toBuffer(),
      ],
      PROGRAM_IDS.metaplex,
    )
  )[0];
}

export async function getWhitelistedCreator(creator: PublicKey) {
  const PROGRAM_IDS = programIds();
  const store = PROGRAM_IDS.store;
  if (!store) {
    throw new Error('Store not initialized');
  }

  return (
    await PublicKey.findProgramAddress(
      [
        Buffer.from(METAPLEX_PREFIX),
        PROGRAM_IDS.metaplex.toBuffer(),
        store.toBuffer(),
        creator.toBuffer(),
      ],
      PROGRAM_IDS.metaplex,
    )
  )[0];
}

export async function getSafetyDepositBoxValidationTicket(
  auctionManager: PublicKey,
  safetyDepositBox: PublicKey,
) {
  const PROGRAM_IDS = programIds();
  return (
    await PublicKey.findProgramAddress(
      [
        Buffer.from(METAPLEX_PREFIX),
        PROGRAM_IDS.metaplex.toBuffer(),
        auctionManager.toBuffer(),
        safetyDepositBox.toBuffer(),
      ],
      PROGRAM_IDS.metaplex,
    )
  )[0];
}

export async function getPayoutTicket(
  auctionManager: PublicKey,
  winnerConfigIndex: number | null | undefined,
  winnerConfigItemIndex: number | null | undefined,
  creatorIndex: number | null | undefined,
  safetyDepositBox: PublicKey,
  recipient: PublicKey,
) {
  const PROGRAM_IDS = programIds();

  return (
    await PublicKey.findProgramAddress(
      [
        Buffer.from(METAPLEX_PREFIX),
        auctionManager.toBuffer(),
        Buffer.from(
          winnerConfigIndex !== null && winnerConfigIndex !== undefined
            ? winnerConfigIndex.toString()
            : 'participation',
        ),
        Buffer.from(
          winnerConfigItemIndex !== null && winnerConfigItemIndex !== undefined
            ? winnerConfigItemIndex.toString()
            : '0',
        ),
        Buffer.from(
          creatorIndex !== null && creatorIndex !== undefined
            ? creatorIndex.toString()
            : 'auctioneer',
        ),
        safetyDepositBox.toBuffer(),
        recipient.toBuffer(),
      ],
      PROGRAM_IDS.metaplex,
    )
  )[0];
}
