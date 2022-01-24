/// <reference types="node" />
import BN from 'bn.js';
import { AuctionData, MasterEditionV1, MasterEditionV2, Metadata, SafetyDepositBox, Vault } from '../../actions';
import { AccountParser, ParsedAccount } from '../../contexts';
import { StringPublicKey } from '../../utils';
import { AuctionManagerV1, ParticipationConfigV1 } from './deprecatedStates';
export * from './deprecatedInitAuctionManagerV1';
export * from './redeemBid';
export * from './redeemFullRightsTransferBid';
export * from './deprecatedRedeemParticipationBid';
export * from './startAuction';
export * from './deprecatedValidateSafetyDepositBoxV1';
export * from './redeemParticipationBidV3';
export * from './redeemPrintingV2Bid';
export * from './withdrawMasterEdition';
export * from './deprecatedStates';
export declare const METAPLEX_PREFIX = "metaplex";
export declare const INDEX = "index";
export declare const CACHE = "cache";
export declare const TOTALS = "totals";
export declare const MAX_INDEXED_ELEMENTS = 100;
export declare const ORIGINAL_AUTHORITY_LOOKUP_SIZE = 33;
export declare const MAX_PRIZE_TRACKING_TICKET_SIZE: number;
export declare const MAX_WHITELISTED_CREATOR_SIZE: number;
export declare const MAX_PAYOUT_TICKET_SIZE: number;
export declare enum MetaplexKey {
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
    StoreIndexerV1 = 13,
    AuctionCacheV1 = 14,
    PackSet = 15
}
export declare class PrizeTrackingTicket {
    key: MetaplexKey;
    metadata: string;
    supplySnapshot: BN;
    expectedRedemptions: BN;
    redemptions: BN;
    constructor(args: {
        metadata: string;
        supplySnapshot: BN;
        expectedRedemptions: BN;
        redemptions: BN;
    });
}
export declare class PayoutTicket {
    key: MetaplexKey;
    recipient: StringPublicKey;
    amountPaid: BN;
    constructor(args: {
        recipient: StringPublicKey;
        amountPaid: BN;
    });
}
export declare class StoreIndexer {
    key: MetaplexKey;
    store: StringPublicKey;
    page: BN;
    auctionCaches: StringPublicKey[];
    constructor(args: {
        store: StringPublicKey;
        page: BN;
        auctionCaches: StringPublicKey[];
    });
}
export declare class AuctionCache {
    key: MetaplexKey;
    store: StringPublicKey;
    timestamp: BN;
    metadata: StringPublicKey[];
    auction: StringPublicKey;
    vault: StringPublicKey;
    auctionManager: StringPublicKey;
    constructor(args: {
        store: StringPublicKey;
        timestamp: BN;
        metadata: StringPublicKey[];
        auction: StringPublicKey;
        vault: StringPublicKey;
        auctionManager: StringPublicKey;
    });
}
export declare class AuctionManager {
    pubkey: StringPublicKey;
    store: StringPublicKey;
    authority: StringPublicKey;
    auction: StringPublicKey;
    vault: StringPublicKey;
    acceptPayment: StringPublicKey;
    numWinners: BN;
    safetyDepositConfigs: ParsedAccount<SafetyDepositConfig>[];
    bidRedemptions: ParsedAccount<BidRedemptionTicketV2>[];
    instance: ParsedAccount<AuctionManagerV1 | AuctionManagerV2>;
    status: AuctionManagerStatus;
    safetyDepositBoxesExpected: BN;
    participationConfig?: ParticipationConfigV1;
    constructor(args: {
        instance: ParsedAccount<AuctionManagerV1 | AuctionManagerV2>;
        auction: ParsedAccount<AuctionData>;
        vault: ParsedAccount<Vault>;
        safetyDepositConfigs: ParsedAccount<SafetyDepositConfig>[];
        bidRedemptions: ParsedAccount<BidRedemptionTicketV2>[];
    });
    isItemClaimed(winnerIndex: number, safetyDepositBoxIndex: number): boolean;
    getAmountForWinner(winnerIndex: number, safetyDepositBoxIndex: number): BN;
    getItemsFromSafetyDepositBoxes(metadataByMint: Record<string, ParsedAccount<Metadata>>, masterEditionsByPrintingMint: Record<string, ParsedAccount<MasterEditionV1>>, metadataByMasterEdition: Record<string, ParsedAccount<Metadata>>, masterEditions: Record<string, ParsedAccount<MasterEditionV1 | MasterEditionV2>>, boxes: ParsedAccount<SafetyDepositBox>[]): AuctionViewItem[][];
}
export declare class AuctionManagerV2 {
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
    });
}
export declare class AuctionManagerStateV2 {
    status: AuctionManagerStatus;
    safetyConfigItemsValidated: BN;
    bidsPushedToAcceptPayment: BN;
    hasParticipation: boolean;
    constructor(args?: AuctionManagerStateV2);
}
export declare class ParticipationStateV2 {
    collectedToAcceptPayment: BN;
    constructor(args?: ParticipationStateV2);
}
export declare class ParticipationConfigV2 {
    winnerConstraint: WinningConstraint;
    nonWinningConstraint: NonWinningConstraint;
    fixedPrice: BN | null;
    constructor(args?: ParticipationConfigV2);
}
export declare class RedeemBidArgs {
    instruction: number;
}
export declare class RedeemFullRightsTransferBidArgs {
    instruction: number;
}
export declare class StartAuctionArgs {
    instruction: number;
}
export declare class EndAuctionArgs {
    instruction: number;
    reveal: BN[] | null;
    constructor(args: {
        reveal: BN[] | null;
    });
}
export declare class ClaimBidArgs {
    instruction: number;
}
export declare enum ProxyCallAddress {
    RedeemBid = 0,
    RedeemFullRightsTransferBid = 1
}
export declare class RedeemUnusedWinningConfigItemsAsAuctioneerArgs {
    instruction: number;
    winningConfigItemIndex: number;
    proxyCall: ProxyCallAddress;
    constructor(args: {
        winningConfigItemIndex: number;
        proxyCall: ProxyCallAddress;
    });
}
export declare class EmptyPaymentAccountArgs {
    instruction: number;
    winningConfigIndex: number | null;
    winningConfigItemIndex: number | null;
    creatorIndex: number | null;
    constructor(args: {
        winningConfigIndex: number | null;
        winningConfigItemIndex: number | null;
        creatorIndex: number | null;
    });
}
export declare class SetStoreArgs {
    instruction: number;
    public: boolean;
    constructor(args: {
        public: boolean;
    });
}
export declare class SetWhitelistedCreatorArgs {
    instruction: number;
    activated: boolean;
    constructor(args: {
        activated: boolean;
    });
}
export declare class DecommissionAuctionManagerArgs {
    instruction: number;
}
export declare class RedeemPrintingV2BidArgs {
    instruction: number;
    editionOffset: BN;
    winIndex: BN;
    constructor(args: {
        editionOffset: BN;
        winIndex: BN;
    });
}
export declare class WithdrawMasterEditionArgs {
    instruction: number;
}
export declare class RedeemParticipationBidV3Args {
    instruction: number;
    winIndex: BN | null;
    constructor(args: {
        winIndex: BN | null;
    });
}
export declare class SetStoreIndexArgs {
    instruction: number;
    page: BN;
    offset: BN;
    constructor(args: {
        page: BN;
        offset: BN;
    });
}
export declare class SetAuctionCacheArgs {
    instruction: number;
}
export declare enum WinningConstraint {
    NoParticipationPrize = 0,
    ParticipationPrizeGiven = 1
}
export declare enum NonWinningConstraint {
    NoParticipationPrize = 0,
    GivenForFixedPrice = 1,
    GivenForBidPrice = 2
}
export declare enum WinningConfigType {
    TokenOnlyTransfer = 0,
    FullRightsTransfer = 1,
    PrintingV1 = 2,
    PrintingV2 = 3,
    Participation = 4
}
export declare const decodeStoreIndexer: (buffer: Buffer) => StoreIndexer;
export declare const decodeAuctionCache: (buffer: Buffer) => AuctionCache;
export declare const decodePrizeTrackingTicket: (buffer: Buffer) => PrizeTrackingTicket;
export declare const decodeWhitelistedCreator: (buffer: Buffer) => WhitelistedCreator;
export declare const WhitelistedCreatorParser: AccountParser;
export declare const decodeStore: (buffer: Buffer) => Store;
export declare const decodeAuctionManager: (buffer: Buffer) => AuctionManagerV1 | AuctionManagerV2;
export declare const decodeBidRedemptionTicket: (buffer: Buffer) => BidRedemptionTicket;
export declare const decodeSafetyDepositConfig: (buffer: Buffer) => SafetyDepositConfig;
export declare const decodePayoutTicket: (buffer: Buffer) => PayoutTicket;
export declare class WhitelistedCreator {
    key: MetaplexKey;
    address: StringPublicKey;
    activated: boolean;
    twitter?: string;
    name?: string;
    image?: string;
    description?: string;
    background?: string;
    constructor(args: {
        address: string;
        activated: boolean;
    });
}
export declare class Store {
    key: MetaplexKey;
    public: boolean;
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
    });
}
export interface BidRedemptionTicket {
    key: MetaplexKey;
    getBidRedeemed(order: number): boolean;
}
export interface AuctionViewItem {
    winningConfigType: WinningConfigType;
    amount: BN;
    metadata: ParsedAccount<Metadata>;
    safetyDeposit: ParsedAccount<SafetyDepositBox>;
    masterEdition?: ParsedAccount<MasterEditionV1 | MasterEditionV2>;
}
export declare class BidRedemptionTicketV2 implements BidRedemptionTicket {
    key: MetaplexKey;
    winnerIndex: BN | null;
    auctionManager: StringPublicKey;
    data: number[];
    constructor(args: {
        key: MetaplexKey;
        data: number[];
    });
    getBidRedeemed(order: number): boolean;
}
export declare enum AuctionManagerStatus {
    Initialized = 0,
    Validated = 1,
    Running = 2,
    Disbursing = 3,
    Finished = 4
}
export declare enum TupleNumericType {
    U8 = 1,
    U16 = 2,
    U32 = 4,
    U64 = 8
}
export declare class AmountRange {
    amount: BN;
    length: BN;
    constructor(args: {
        amount: BN;
        length: BN;
    });
}
export declare class InitAuctionManagerV2Args {
    instruction: number;
    amountType: TupleNumericType;
    lengthType: TupleNumericType;
    maxRanges: BN;
    constructor(args: {
        amountType: TupleNumericType;
        lengthType: TupleNumericType;
        maxRanges: BN;
    });
}
export declare class SafetyDepositConfig {
    key: MetaplexKey;
    auctionManager: StringPublicKey;
    order: BN;
    winningConfigType: WinningConfigType;
    amountType: TupleNumericType;
    lengthType: TupleNumericType;
    amountRanges: AmountRange[];
    participationConfig: ParticipationConfigV2 | null;
    participationState: ParticipationStateV2 | null;
    constructor(args: {
        data?: Uint8Array;
        directArgs?: {
            auctionManager: StringPublicKey;
            order: BN;
            winningConfigType: WinningConfigType;
            amountType: TupleNumericType;
            lengthType: TupleNumericType;
            amountRanges: AmountRange[];
            participationConfig: ParticipationConfigV2 | null;
            participationState: ParticipationStateV2 | null;
        };
    });
    getBNFromData(data: Uint8Array, offset: number, dataType: TupleNumericType): BN;
    getAmountForWinner(winner: BN): BN;
}
export declare class ValidateSafetyDepositBoxV2Args {
    instruction: number;
    safetyDepositConfig: SafetyDepositConfig;
    constructor(safetyDeposit: SafetyDepositConfig);
}
export declare const SCHEMA: Map<any, any>;
export declare function getAuctionManagerKey(vault: string, auctionKey: string): Promise<string>;
export declare function getAuctionKeys(vault: string): Promise<{
    auctionKey: string;
    auctionManagerKey: string;
}>;
export declare function getBidRedemption(auctionKey: string, bidMetadata: string): Promise<string>;
export declare function getBidderKeys(auctionKey: string, bidder: string): Promise<{
    bidMetadata: string;
    bidRedemption: string;
}>;
export declare function getOriginalAuthority(auctionKey: string, metadata: string): Promise<string>;
export declare const isCreatorPartOfTheStore: (creatorAddress: StringPublicKey, pubkey: StringPublicKey, store?: string | undefined) => Promise<boolean>;
export declare function getWhitelistedCreator(creator: StringPublicKey, storeId?: StringPublicKey): Promise<string>;
export declare function getPrizeTrackingTicket(auctionManager: string, mint: string): Promise<string>;
export declare function getAuctionWinnerTokenTypeTracker(auctionManager: string): Promise<string>;
export declare function getSafetyDepositConfig(auctionManager: string, safetyDeposit: string): Promise<string>;
export declare function getStoreIndexer(page: number): Promise<string>;
export declare function getAuctionCache(auction: StringPublicKey): Promise<string>;
export declare function getPayoutTicket(auctionManager: string, winnerConfigIndex: number | null | undefined, winnerConfigItemIndex: number | null | undefined, creatorIndex: number | null | undefined, safetyDepositBox: string, recipient: string): Promise<string>;
//# sourceMappingURL=index.d.ts.map