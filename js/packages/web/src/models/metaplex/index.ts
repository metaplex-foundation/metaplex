import {
  AUCTION_PREFIX,
  programIds,
  METADATA,
  AccountParser,
  findProgramAddress,
} from '@oyster/common';
import { AccountInfo, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { deserializeUnchecked } from 'borsh';
import {
  AuctionManagerV1,
  BidRedemptionTicketV1,
  DEPRECATED_SCHEMA,
} from './deprecatedStates';

export * from './deprecatedInitAuctionManagerV1';
export * from './redeemBid';
export * from './redeemFullRightsTransferBid';
export * from './deprecatedRedeemParticipationBid';
export * from './startAuction';
export * from './deprecatedValidateSafetyDepositBoxV1';
export * from './redeemParticipationBidV2';
export * from './redeemPrintingV2Bid';
export * from './withdrawMasterEdition';

export const METAPLEX_PREFIX = 'metaplex';
export const ORIGINAL_AUTHORITY_LOOKUP_SIZE = 33;
export const MAX_BID_REDEMPTION_TICKET_SIZE = 3;
export const MAX_PRIZE_TRACKING_TICKET_SIZE = 1 + 32 + 8 + 8 + 8 + 50;
export enum MetaplexKey {
  Uninitialized = 0,
  OriginalAuthorityLookupV1 = 1,
  BidRedemptionTicketV1 = 2,
  StoreV1 = 3,
  WhitelistedCreatorV1 = 4,
  PayoutTicketV1 = 5,
  SafetyDepositValidationTicketV1 = 6,
  AuctionManagerV1 = 7,
  PrizeTrackingTicketV1 = 8,
  SafetyDepositConfigV1 = 9,
  AuctionManagerV2 = 10,
  BidRedemptionTicketV2 = 11,
  AuctionWinnerTokenTypeTrackerV1 = 12,
}
export class PrizeTrackingTicket {
  key: MetaplexKey = MetaplexKey.PrizeTrackingTicketV1;
  metadata: PublicKey;
  supplySnapshot: BN;
  expectedRedemptions: BN;
  redemptions: BN;

  constructor(args: {
    metadata: PublicKey;
    supplySnapshot: BN;
    expectedRedemptions: BN;
    redemptions: BN;
  }) {
    this.key = MetaplexKey.PrizeTrackingTicketV1;
    this.metadata = args.metadata;
    this.supplySnapshot = args.supplySnapshot;
    this.expectedRedemptions = args.expectedRedemptions;
    this.redemptions = args.redemptions;
  }
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
export interface AuctionManager {
  key: MetaplexKey;
  store: PublicKey;
  authority: PublicKey;
  auction: PublicKey;
  vault: PublicKey;
  acceptPayment: PublicKey;
}

export class AuctionManagerV2 implements AuctionManager {
  key: MetaplexKey;
  store: PublicKey;
  authority: PublicKey;
  auction: PublicKey;
  vault: PublicKey;
  acceptPayment: PublicKey;
  state: AuctionManagerStateV2;

  constructor(args: {
    store: PublicKey;
    authority: PublicKey;
    auction: PublicKey;
    vault: PublicKey;
    acceptPayment: PublicKey;
    state: AuctionManagerStateV2;
  }) {
    this.key = MetaplexKey.AuctionManagerV2;
    this.store = args.store;
    this.authority = args.authority;
    this.auction = args.auction;
    this.vault = args.vault;
    this.acceptPayment = args.acceptPayment;
    this.state = args.state;
  }
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

export class ParticipationStateV2 {
  collectedToAcceptPayment: BN = new BN(0);

  constructor(args?: ParticipationStateV2) {
    Object.assign(this, args);
  }
}

export class ParticipationConfigV2 {
  winnerConstraint: WinningConstraint = WinningConstraint.NoParticipationPrize;
  nonWinningConstraint: NonWinningConstraint =
    NonWinningConstraint.GivenForFixedPrice;
  fixedPrice: BN | null = new BN(0);

  constructor(args?: ParticipationConfigV2) {
    Object.assign(this, args);
  }
}

export class RedeemBidArgs {
  instruction = 2;
}

export class RedeemFullRightsTransferBidArgs {
  instruction = 3;
}

export class StartAuctionArgs {
  instruction = 5;
}
export class ClaimBidArgs {
  instruction = 6;
}

export enum ProxyCallAddress {
  RedeemBid = 0,
  RedeemFullRightsTransferBid = 1,
}
export class RedeemUnusedWinningConfigItemsAsAuctioneerArgs {
  instruction = 12;
  winningConfigItemIndex: number;
  proxyCall: ProxyCallAddress;
  constructor(args: {
    winningConfigItemIndex: number;
    proxyCall: ProxyCallAddress;
  }) {
    this.winningConfigItemIndex = args.winningConfigItemIndex;
    this.proxyCall = args.proxyCall;
  }
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

export class DecommissionAuctionManagerArgs {
  instruction = 13;
}

export class RedeemPrintingV2BidArgs {
  instruction = 14;
  editionOffset: BN;
  winIndex: BN;
  constructor(args: { editionOffset: BN; winIndex: BN }) {
    this.editionOffset = args.editionOffset;
    this.winIndex = args.winIndex;
  }
}
export class WithdrawMasterEditionArgs {
  instruction = 15;
}
export class RedeemParticipationBidV2Args {
  instruction = 16;
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

export const decodePrizeTrackingTicket = (buffer: Buffer) => {
  return deserializeUnchecked(
    SCHEMA,
    PrizeTrackingTicket,
    buffer,
  ) as PrizeTrackingTicket;
};

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
  return (
    buffer[0] == MetaplexKey.AuctionManagerV1
      ? deserializeUnchecked(SCHEMA, AuctionManagerV1, buffer)
      : deserializeUnchecked(SCHEMA, AuctionManagerV2, buffer)
  ) as AuctionManager;
};

export const decodeBidRedemptionTicket = (buffer: Buffer) => {
  return (
    buffer[0] == MetaplexKey.BidRedemptionTicketV1
      ? deserializeUnchecked(SCHEMA, BidRedemptionTicketV1, buffer)
      : new BidRedemptionTicketV2({
          key: MetaplexKey.BidRedemptionTicketV2,
          data: buffer.slice(1).toJSON().data,
        })
  ) as BidRedemptionTicket;
};

export const decodePayoutTicket = (buffer: Buffer) => {
  return deserializeUnchecked(SCHEMA, PayoutTicket, buffer) as PayoutTicket;
};

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

export interface BidRedemptionTicket {
  key: MetaplexKey;
}
export class BidRedemptionTicketV2 implements BidRedemptionTicket {
  key: MetaplexKey = MetaplexKey.BidRedemptionTicketV2;
  data: number[] = [];

  constructor(args?: BidRedemptionTicketV2) {
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

export enum TupleNumericType {
  U8 = 1,
  U16 = 2,
  U32 = 4,
  U64 = 8,
}

export class AmountRange {
  amount: BN;
  length: BN;
  constructor(args: { amount: BN; length: BN }) {
    this.amount = args.amount;
    this.length = args.length;
  }
}

export class InitAuctionManagerV2Args {
  instruction = 17;
  amountType: TupleNumericType = TupleNumericType.U8;
  lengthType: TupleNumericType = TupleNumericType.U8;
  maxRanges: BN = new BN(1);

  constructor(args: {
    amountType: TupleNumericType;
    lengthType: TupleNumericType;
    maxRanges: BN;
  }) {
    this.amountType = args.amountType;
    this.lengthType = args.lengthType;
    this.maxRanges = args.maxRanges;
  }
}

export class SafetyDepositConfig {
  key: MetaplexKey = MetaplexKey.SafetyDepositConfigV1;
  order: BN;
  winningConfigType: WinningConfigType;
  amountType: TupleNumericType = TupleNumericType.U8;
  lengthType: TupleNumericType = TupleNumericType.U8;
  amountRanges: AmountRange[] = [];
  participationConfig: ParticipationConfigV2 | null;
  participationState: ParticipationStateV2 | null;
  constructor(args: {
    order: BN;
    winningConfigType: WinningConfigType;
    amountType: TupleNumericType;
    lengthType: TupleNumericType;
    amountRanges: AmountRange[];
    participationConfig: ParticipationConfigV2 | null;
    participationState: ParticipationStateV2 | null;
  }) {
    this.order = args.order;
    this.winningConfigType = args.winningConfigType;
    this.amountType = args.amountType;
    this.lengthType = args.lengthType;
    this.amountRanges = args.amountRanges;
    this.participationConfig = args.participationConfig;
    this.participationState = args.participationState;
  }
}

export class ValidateSafetyDepositBoxV2Args {
  instruction = 18;
  safetyDepositConfig: SafetyDepositConfig;
  constructor(safetyDeposit: SafetyDepositConfig) {
    this.safetyDepositConfig = safetyDeposit;
  }
}

export const SCHEMA = new Map<any, any>([
  ...DEPRECATED_SCHEMA,
  [
    PrizeTrackingTicket,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['metadata', 'pubkey'],
        ['supplySnapshot', 'u64'],
        ['expectedRedemptions', 'u64'],
        ['redemptions', 'u64'],
      ],
    },
  ],
  [
    AuctionManagerV2,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['store', 'pubkey'],
        ['authority', 'pubkey'],
        ['auction', 'pubkey'],
        ['vault', 'pubkey'],
        ['acceptPayment', 'pubkey'],
        ['state', AuctionManagerStateV2],
      ],
    },
  ],
  [
    ParticipationConfigV2,
    {
      kind: 'struct',
      fields: [
        ['winnerConstraint', 'u8'], // enum
        ['nonWinningConstraint', 'u8'],
        ['fixedPrice', { kind: 'option', type: 'u64' }],
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
    AuctionManagerStateV2,
    {
      kind: 'struct',
      fields: [
        ['status', 'u8'],
        ['safetyConfigItemsValidated', 'u64'],
        ['bidsPushedToAcceptPayment', 'u64'],
        ['hasParticipation', 'u8'],
      ],
    },
  ],
  [
    ParticipationStateV2,
    {
      kind: 'struct',
      fields: [['collectedToAcceptPayment', 'u64']],
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
    AmountRange,
    {
      kind: 'struct',
      fields: [
        ['amount', 'u64'],
        ['length', 'u64'],
      ],
    },
  ],
  [
    SafetyDepositConfig,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['order', 'u64'],
        ['winningConfigType', 'u8'],
        ['amountType', 'u8'],
        ['lengthType', 'u8'],
        ['amountRanges', [AmountRange]],
        [
          'participationConfig',
          { kind: 'option', type: ParticipationConfigV2 },
        ],
        ['participationState', { kind: 'option', type: ParticipationStateV2 }],
      ],
    },
  ],
  [
    RedeemUnusedWinningConfigItemsAsAuctioneerArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['winningConfigItemIndex', 'u8'],
        ['proxyCall', 'u8'],
      ],
    },
  ],
  [
    DecommissionAuctionManagerArgs,
    {
      kind: 'struct',
      fields: [['instruction', 'u8']],
    },
  ],
  [
    RedeemPrintingV2BidArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['editionOffset', 'u64'],
        ['winIndex', 'u64'],
      ],
    },
  ],
  [
    WithdrawMasterEditionArgs,
    {
      kind: 'struct',
      fields: [['instruction', 'u8']],
    },
  ],

  [
    RedeemParticipationBidV2Args,
    {
      kind: 'struct',
      fields: [['instruction', 'u8']],
    },
  ],
  [
    InitAuctionManagerV2Args,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['amountType', 'u8'],
        ['lengthType', 'u8'],
        ['maxRanges', 'u64'],
      ],
    },
  ],
  [
    ValidateSafetyDepositBoxV2Args,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['safetyDepositConfig', SafetyDepositConfig],
      ],
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
]);

export async function getAuctionManagerKey(
  vault: PublicKey,
  auctionKey: PublicKey,
): Promise<PublicKey> {
  const PROGRAM_IDS = programIds();

  return (
    await findProgramAddress(
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
    await findProgramAddress(
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

export async function getBidRedemption(
  auctionKey: PublicKey,
  bidMetadata: PublicKey,
): Promise<PublicKey> {
  const PROGRAM_IDS = programIds();

  return (
    await findProgramAddress(
      [
        Buffer.from(METAPLEX_PREFIX),
        auctionKey.toBuffer(),
        bidMetadata.toBuffer(),
      ],
      PROGRAM_IDS.metaplex,
    )
  )[0];
}

export async function getBidderKeys(
  auctionKey: PublicKey,
  bidder: PublicKey,
): Promise<{ bidMetadata: PublicKey; bidRedemption: PublicKey }> {
  const PROGRAM_IDS = programIds();

  const bidMetadata: PublicKey = (
    await findProgramAddress(
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

  const bidRedemption: PublicKey = await getBidRedemption(
    auctionKey,
    bidMetadata,
  );

  return { bidMetadata, bidRedemption };
}

export async function getOriginalAuthority(
  auctionKey: PublicKey,
  metadata: PublicKey,
): Promise<PublicKey> {
  const PROGRAM_IDS = programIds();

  return (
    await findProgramAddress(
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
    await findProgramAddress(
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

export async function getPrizeTrackingTicket(
  auctionManager: PublicKey,
  mint: PublicKey,
) {
  const PROGRAM_IDS = programIds();
  const store = PROGRAM_IDS.store;
  if (!store) {
    throw new Error('Store not initialized');
  }

  return (
    await findProgramAddress(
      [
        Buffer.from(METAPLEX_PREFIX),
        PROGRAM_IDS.metaplex.toBuffer(),
        auctionManager.toBuffer(),
        mint.toBuffer(),
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
    await findProgramAddress(
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
