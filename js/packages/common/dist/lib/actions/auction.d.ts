import { TransactionInstruction } from '@solana/web3.js';
import BN from 'bn.js';
import { AccountParser } from '../contexts/accounts/types';
import { StringPublicKey } from '../utils';
export declare const AUCTION_PREFIX = "auction";
export declare const METADATA = "metadata";
export declare const EXTENDED = "extended";
export declare const BIDDER_POT_TOKEN = "bidder_pot_token";
export declare const MAX_AUCTION_DATA_EXTENDED_SIZE: number;
export declare enum AuctionState {
    Created = 0,
    Started = 1,
    Ended = 2
}
export declare enum BidStateType {
    EnglishAuction = 0,
    OpenEdition = 1
}
export declare class Bid {
    key: StringPublicKey;
    amount: BN;
    constructor(args: {
        key: StringPublicKey;
        amount: BN;
    });
}
export declare class BidState {
    type: BidStateType;
    bids: Bid[];
    max: BN;
    getWinnerAt(winnerIndex: number): StringPublicKey | null;
    getAmountAt(winnerIndex: number): BN | null;
    getWinnerIndex(bidder: StringPublicKey): number | null;
    constructor(args: {
        type: BidStateType;
        bids: Bid[];
        max: BN;
    });
}
export declare const AuctionParser: AccountParser;
export declare const decodeAuction: (buffer: Buffer) => AuctionData;
export declare const BidderPotParser: AccountParser;
export declare const decodeBidderPot: (buffer: Buffer) => BidderPot;
export declare const AuctionDataExtendedParser: AccountParser;
export declare const decodeAuctionDataExtended: (buffer: Buffer) => AuctionDataExtended;
export declare const BidderMetadataParser: AccountParser;
export declare const decodeBidderMetadata: (buffer: Buffer) => BidderMetadata;
export declare const BASE_AUCTION_DATA_SIZE: number;
export declare enum PriceFloorType {
    None = 0,
    Minimum = 1,
    BlindedPrice = 2
}
export declare class PriceFloor {
    type: PriceFloorType;
    hash: Uint8Array;
    minPrice?: BN;
    constructor(args: {
        type: PriceFloorType;
        hash?: Uint8Array;
        minPrice?: BN;
    });
}
export declare class AuctionDataExtended {
    totalUncancelledBids: BN;
    tickSize: BN | null;
    gapTickSizePercentage: number | null;
    instantSalePrice: BN | null;
    name: number[] | null;
    constructor(args: {
        totalUncancelledBids: BN;
        tickSize: BN | null;
        gapTickSizePercentage: number | null;
        instantSalePrice: BN | null;
        name: number[] | null;
    });
}
export interface CountdownState {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}
export declare class AuctionData {
    authority: StringPublicKey;
    tokenMint: StringPublicKey;
    lastBid: BN | null;
    endedAt: BN | null;
    endAuctionAt: BN | null;
    auctionGap: BN | null;
    priceFloor: PriceFloor;
    state: AuctionState;
    bidState: BidState;
    bidRedemptionKey?: StringPublicKey;
    auctionDataExtended?: StringPublicKey;
    timeToEnd(): CountdownState;
    ended(): boolean | undefined;
    constructor(args: {
        authority: StringPublicKey;
        tokenMint: StringPublicKey;
        lastBid: BN | null;
        endedAt: BN | null;
        endAuctionAt: BN | null;
        auctionGap: BN | null;
        priceFloor: PriceFloor;
        state: AuctionState;
        bidState: BidState;
        totalUncancelledBids: BN;
    });
}
export declare const BIDDER_METADATA_LEN: number;
export declare class BidderMetadata {
    bidderPubkey: StringPublicKey;
    auctionPubkey: StringPublicKey;
    lastBid: BN;
    lastBidTimestamp: BN;
    cancelled: boolean;
    constructor(args: {
        bidderPubkey: StringPublicKey;
        auctionPubkey: StringPublicKey;
        lastBid: BN;
        lastBidTimestamp: BN;
        cancelled: boolean;
    });
}
export declare const BIDDER_POT_LEN: number;
export declare class BidderPot {
    bidderPot: StringPublicKey;
    bidderAct: StringPublicKey;
    auctionAct: StringPublicKey;
    emptied: boolean;
    constructor(args: {
        bidderPot: StringPublicKey;
        bidderAct: StringPublicKey;
        auctionAct: StringPublicKey;
        emptied: boolean;
    });
}
export declare enum WinnerLimitType {
    Unlimited = 0,
    Capped = 1
}
export declare class WinnerLimit {
    type: WinnerLimitType;
    usize: BN;
    constructor(args: {
        type: WinnerLimitType;
        usize: BN;
    });
}
export interface IPartialCreateAuctionArgs {
    winners: WinnerLimit;
    endAuctionAt: BN | null;
    auctionGap: BN | null;
    tokenMint: StringPublicKey;
    priceFloor: PriceFloor;
    tickSize: BN | null;
    gapTickSizePercentage: number | null;
    instantSalePrice: BN | null;
    name: number[] | null;
}
export declare class CreateAuctionArgs implements IPartialCreateAuctionArgs {
    instruction: number;
    winners: WinnerLimit;
    endAuctionAt: BN | null;
    auctionGap: BN | null;
    tokenMint: StringPublicKey;
    authority: StringPublicKey;
    resource: StringPublicKey;
    priceFloor: PriceFloor;
    tickSize: BN | null;
    gapTickSizePercentage: number | null;
    instantSalePrice: BN | null;
    name: number[] | null;
    constructor(args: {
        winners: WinnerLimit;
        endAuctionAt: BN | null;
        auctionGap: BN | null;
        tokenMint: StringPublicKey;
        authority: StringPublicKey;
        resource: StringPublicKey;
        priceFloor: PriceFloor;
        tickSize: BN | null;
        gapTickSizePercentage: number | null;
        name: number[] | null;
        instantSalePrice: BN | null;
    });
}
export declare const AUCTION_SCHEMA: Map<any, any>;
export declare const decodeAuctionData: (buffer: Buffer) => AuctionData;
export declare function createAuction(settings: CreateAuctionArgs, creator: StringPublicKey, instructions: TransactionInstruction[]): Promise<void>;
export declare function startAuctionWithResource(resource: StringPublicKey, creator: StringPublicKey, instructions: TransactionInstruction[]): Promise<void>;
export declare function setAuctionAuthority(auction: StringPublicKey, currentAuthority: StringPublicKey, newAuthority: StringPublicKey, instructions: TransactionInstruction[]): Promise<void>;
export declare function placeBid(bidderPubkey: StringPublicKey, bidderTokenPubkey: StringPublicKey, bidderPotTokenPubkey: StringPublicKey | undefined, tokenMintPubkey: StringPublicKey, transferAuthority: StringPublicKey, payer: StringPublicKey, resource: StringPublicKey, amount: BN, instructions: TransactionInstruction[]): Promise<{
    amount: BN;
}>;
export declare function getBidderPotKey({ auctionProgramId, auctionKey, bidderPubkey, }: {
    auctionProgramId: StringPublicKey;
    auctionKey: StringPublicKey;
    bidderPubkey: StringPublicKey;
}): Promise<StringPublicKey>;
export declare function getAuctionExtended({ auctionProgramId, resource, }: {
    auctionProgramId: StringPublicKey;
    resource: StringPublicKey;
}): Promise<StringPublicKey>;
export declare function cancelBid(bidderPubkey: StringPublicKey, bidderTokenPubkey: StringPublicKey, bidderPotTokenPubkey: StringPublicKey, tokenMintPubkey: StringPublicKey, resource: StringPublicKey, instructions: TransactionInstruction[]): Promise<void>;
//# sourceMappingURL=auction.d.ts.map