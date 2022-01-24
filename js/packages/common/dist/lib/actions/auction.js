"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelBid = exports.getAuctionExtended = exports.getBidderPotKey = exports.placeBid = exports.setAuctionAuthority = exports.startAuctionWithResource = exports.createAuction = exports.decodeAuctionData = exports.AUCTION_SCHEMA = exports.CreateAuctionArgs = exports.WinnerLimit = exports.WinnerLimitType = exports.BidderPot = exports.BIDDER_POT_LEN = exports.BidderMetadata = exports.BIDDER_METADATA_LEN = exports.AuctionData = exports.AuctionDataExtended = exports.PriceFloor = exports.PriceFloorType = exports.BASE_AUCTION_DATA_SIZE = exports.decodeBidderMetadata = exports.BidderMetadataParser = exports.decodeAuctionDataExtended = exports.AuctionDataExtendedParser = exports.decodeBidderPot = exports.BidderPotParser = exports.decodeAuction = exports.AuctionParser = exports.BidState = exports.Bid = exports.BidStateType = exports.AuctionState = exports.MAX_AUCTION_DATA_EXTENDED_SIZE = exports.BIDDER_POT_TOKEN = exports.EXTENDED = exports.METADATA = exports.AUCTION_PREFIX = void 0;
const web3_js_1 = require("@solana/web3.js");
const programIds_1 = require("../utils/programIds");
const borsh_1 = require("borsh");
const bn_js_1 = __importDefault(require("bn.js"));
const moment_1 = __importDefault(require("moment"));
const utils_1 = require("../utils");
exports.AUCTION_PREFIX = 'auction';
exports.METADATA = 'metadata';
exports.EXTENDED = 'extended';
exports.BIDDER_POT_TOKEN = 'bidder_pot_token';
exports.MAX_AUCTION_DATA_EXTENDED_SIZE = 8 + 9 + 2 + 9 + 33 + 158;
var AuctionState;
(function (AuctionState) {
    AuctionState[AuctionState["Created"] = 0] = "Created";
    AuctionState[AuctionState["Started"] = 1] = "Started";
    AuctionState[AuctionState["Ended"] = 2] = "Ended";
})(AuctionState = exports.AuctionState || (exports.AuctionState = {}));
var BidStateType;
(function (BidStateType) {
    BidStateType[BidStateType["EnglishAuction"] = 0] = "EnglishAuction";
    BidStateType[BidStateType["OpenEdition"] = 1] = "OpenEdition";
})(BidStateType = exports.BidStateType || (exports.BidStateType = {}));
class Bid {
    constructor(args) {
        this.key = args.key;
        this.amount = args.amount;
    }
}
exports.Bid = Bid;
class BidState {
    constructor(args) {
        this.type = args.type;
        this.bids = args.bids;
        this.max = args.max;
    }
    getWinnerAt(winnerIndex) {
        const convertedIndex = this.bids.length - winnerIndex - 1;
        if (convertedIndex >= 0 && convertedIndex < this.bids.length) {
            return this.bids[convertedIndex].key;
        }
        else {
            return null;
        }
    }
    getAmountAt(winnerIndex) {
        const convertedIndex = this.bids.length - winnerIndex - 1;
        if (convertedIndex >= 0 && convertedIndex < this.bids.length) {
            return this.bids[convertedIndex].amount;
        }
        else {
            return null;
        }
    }
    getWinnerIndex(bidder) {
        if (!this.bids)
            return null;
        const index = this.bids.findIndex(b => b.key === bidder);
        // auction stores data in reverse order
        if (index !== -1) {
            const zeroBased = this.bids.length - index - 1;
            return zeroBased < this.max.toNumber() ? zeroBased : null;
        }
        else
            return null;
    }
}
exports.BidState = BidState;
const AuctionParser = (pubkey, account) => ({
    pubkey,
    account,
    info: (0, exports.decodeAuction)(account.data),
});
exports.AuctionParser = AuctionParser;
const decodeAuction = (buffer) => {
    return (0, borsh_1.deserializeUnchecked)(exports.AUCTION_SCHEMA, AuctionData, buffer);
};
exports.decodeAuction = decodeAuction;
const BidderPotParser = (pubkey, account) => ({
    pubkey,
    account,
    info: (0, exports.decodeBidderPot)(account.data),
});
exports.BidderPotParser = BidderPotParser;
const decodeBidderPot = (buffer) => {
    return (0, borsh_1.deserializeUnchecked)(exports.AUCTION_SCHEMA, BidderPot, buffer);
};
exports.decodeBidderPot = decodeBidderPot;
const AuctionDataExtendedParser = (pubkey, account) => ({
    pubkey,
    account,
    info: (0, exports.decodeAuctionDataExtended)(account.data),
});
exports.AuctionDataExtendedParser = AuctionDataExtendedParser;
const decodeAuctionDataExtended = (buffer) => {
    return (0, borsh_1.deserializeUnchecked)(exports.AUCTION_SCHEMA, AuctionDataExtended, buffer);
};
exports.decodeAuctionDataExtended = decodeAuctionDataExtended;
const BidderMetadataParser = (pubkey, account) => ({
    pubkey,
    account,
    info: (0, exports.decodeBidderMetadata)(account.data),
});
exports.BidderMetadataParser = BidderMetadataParser;
const decodeBidderMetadata = (buffer) => {
    return (0, borsh_1.deserializeUnchecked)(exports.AUCTION_SCHEMA, BidderMetadata, buffer);
};
exports.decodeBidderMetadata = decodeBidderMetadata;
exports.BASE_AUCTION_DATA_SIZE = 32 + 32 + 32 + 9 + 9 + 9 + 9 + 1 + 32 + 1 + 8 + 8;
var PriceFloorType;
(function (PriceFloorType) {
    PriceFloorType[PriceFloorType["None"] = 0] = "None";
    PriceFloorType[PriceFloorType["Minimum"] = 1] = "Minimum";
    PriceFloorType[PriceFloorType["BlindedPrice"] = 2] = "BlindedPrice";
})(PriceFloorType = exports.PriceFloorType || (exports.PriceFloorType = {}));
class PriceFloor {
    constructor(args) {
        this.type = args.type;
        this.hash = args.hash || new Uint8Array(32);
        if (this.type === PriceFloorType.Minimum) {
            if (args.minPrice) {
                this.hash.set(args.minPrice.toArrayLike(Buffer, 'le', 8), 0);
            }
            else {
                this.minPrice = new bn_js_1.default((args.hash || new Uint8Array(0)).slice(0, 8), 'le');
            }
        }
    }
}
exports.PriceFloor = PriceFloor;
class AuctionDataExtended {
    constructor(args) {
        this.totalUncancelledBids = args.totalUncancelledBids;
        this.tickSize = args.tickSize;
        this.gapTickSizePercentage = args.gapTickSizePercentage;
        this.instantSalePrice = args.instantSalePrice;
        this.name = args.name;
    }
}
exports.AuctionDataExtended = AuctionDataExtended;
class AuctionData {
    constructor(args) {
        this.authority = args.authority;
        this.tokenMint = args.tokenMint;
        this.lastBid = args.lastBid;
        this.endedAt = args.endedAt;
        this.endAuctionAt = args.endAuctionAt;
        this.auctionGap = args.auctionGap;
        this.priceFloor = args.priceFloor;
        this.state = args.state;
        this.bidState = args.bidState;
    }
    timeToEnd() {
        var _a;
        const now = (0, moment_1.default)().unix();
        const ended = { days: 0, hours: 0, minutes: 0, seconds: 0 };
        let endAt = ((_a = this.endedAt) === null || _a === void 0 ? void 0 : _a.toNumber()) || 0;
        if (this.auctionGap && this.lastBid) {
            endAt = Math.max(endAt, this.auctionGap.toNumber() + this.lastBid.toNumber());
        }
        let delta = endAt - now;
        if (!endAt || delta <= 0)
            return ended;
        const days = Math.floor(delta / 86400);
        delta -= days * 86400;
        const hours = Math.floor(delta / 3600) % 24;
        delta -= hours * 3600;
        const minutes = Math.floor(delta / 60) % 60;
        delta -= minutes * 60;
        const seconds = Math.floor(delta % 60);
        return { days, hours, minutes, seconds };
    }
    ended() {
        const now = (0, moment_1.default)().unix();
        if (!this.endedAt)
            return false;
        if (this.endedAt.toNumber() > now)
            return false;
        if (this.endedAt.toNumber() < now) {
            if (this.auctionGap && this.lastBid) {
                const newEnding = this.auctionGap.toNumber() + this.lastBid.toNumber();
                return newEnding < now;
            }
            else
                return true;
        }
    }
}
exports.AuctionData = AuctionData;
exports.BIDDER_METADATA_LEN = 32 + 32 + 8 + 8 + 1;
class BidderMetadata {
    constructor(args) {
        this.bidderPubkey = args.bidderPubkey;
        this.auctionPubkey = args.auctionPubkey;
        this.lastBid = args.lastBid;
        this.lastBidTimestamp = args.lastBidTimestamp;
        this.cancelled = args.cancelled;
    }
}
exports.BidderMetadata = BidderMetadata;
exports.BIDDER_POT_LEN = 32 + 32 + 32 + 1;
class BidderPot {
    constructor(args) {
        this.bidderPot = args.bidderPot;
        this.bidderAct = args.bidderAct;
        this.auctionAct = args.auctionAct;
        this.emptied = args.emptied;
    }
}
exports.BidderPot = BidderPot;
var WinnerLimitType;
(function (WinnerLimitType) {
    WinnerLimitType[WinnerLimitType["Unlimited"] = 0] = "Unlimited";
    WinnerLimitType[WinnerLimitType["Capped"] = 1] = "Capped";
})(WinnerLimitType = exports.WinnerLimitType || (exports.WinnerLimitType = {}));
class WinnerLimit {
    constructor(args) {
        this.type = args.type;
        this.usize = args.usize;
    }
}
exports.WinnerLimit = WinnerLimit;
class CreateAuctionArgs {
    constructor(args) {
        this.instruction = 7;
        this.winners = args.winners;
        this.endAuctionAt = args.endAuctionAt;
        this.auctionGap = args.auctionGap;
        this.tokenMint = args.tokenMint;
        this.authority = args.authority;
        this.resource = args.resource;
        this.priceFloor = args.priceFloor;
        this.tickSize = args.tickSize;
        this.gapTickSizePercentage = args.gapTickSizePercentage;
        this.name = args.name;
        this.instantSalePrice = args.instantSalePrice;
    }
}
exports.CreateAuctionArgs = CreateAuctionArgs;
class StartAuctionArgs {
    constructor(args) {
        this.instruction = 4;
        this.resource = args.resource;
    }
}
class PlaceBidArgs {
    constructor(args) {
        this.instruction = 6;
        this.resource = args.resource;
        this.amount = args.amount;
    }
}
class CancelBidArgs {
    constructor(args) {
        this.instruction = 0;
        this.resource = args.resource;
    }
}
class SetAuthorityArgs {
    constructor() {
        this.instruction = 5;
    }
}
exports.AUCTION_SCHEMA = new Map([
    [
        CreateAuctionArgs,
        {
            kind: 'struct',
            fields: [
                ['instruction', 'u8'],
                ['winners', WinnerLimit],
                ['endAuctionAt', { kind: 'option', type: 'u64' }],
                ['auctionGap', { kind: 'option', type: 'u64' }],
                ['tokenMint', 'pubkeyAsString'],
                ['authority', 'pubkeyAsString'],
                ['resource', 'pubkeyAsString'],
                ['priceFloor', PriceFloor],
                ['tickSize', { kind: 'option', type: 'u64' }],
                ['gapTickSizePercentage', { kind: 'option', type: 'u8' }],
                ['instantSalePrice', { kind: 'option', type: 'u64' }],
                ['name', { kind: 'option', type: [32] }],
            ],
        },
    ],
    [
        WinnerLimit,
        {
            kind: 'struct',
            fields: [
                ['type', 'u8'],
                ['usize', 'u64'],
            ],
        },
    ],
    [
        StartAuctionArgs,
        {
            kind: 'struct',
            fields: [
                ['instruction', 'u8'],
                ['resource', 'pubkeyAsString'],
            ],
        },
    ],
    [
        PlaceBidArgs,
        {
            kind: 'struct',
            fields: [
                ['instruction', 'u8'],
                ['amount', 'u64'],
                ['resource', 'pubkeyAsString'],
            ],
        },
    ],
    [
        CancelBidArgs,
        {
            kind: 'struct',
            fields: [
                ['instruction', 'u8'],
                ['resource', 'pubkeyAsString'],
            ],
        },
    ],
    [
        SetAuthorityArgs,
        {
            kind: 'struct',
            fields: [['instruction', 'u8']],
        },
    ],
    [
        AuctionData,
        {
            kind: 'struct',
            fields: [
                ['authority', 'pubkeyAsString'],
                ['tokenMint', 'pubkeyAsString'],
                ['lastBid', { kind: 'option', type: 'u64' }],
                ['endedAt', { kind: 'option', type: 'u64' }],
                ['endAuctionAt', { kind: 'option', type: 'u64' }],
                ['auctionGap', { kind: 'option', type: 'u64' }],
                ['priceFloor', PriceFloor],
                ['state', 'u8'],
                ['bidState', BidState],
            ],
        },
    ],
    [
        AuctionDataExtended,
        {
            kind: 'struct',
            fields: [
                ['totalUncancelledBids', 'u64'],
                ['tickSize', { kind: 'option', type: 'u64' }],
                ['gapTickSizePercentage', { kind: 'option', type: 'u8' }],
                ['instantSalePrice', { kind: 'option', type: 'u64' }],
                ['name', { kind: 'option', type: [32] }],
            ],
        },
    ],
    [
        PriceFloor,
        {
            kind: 'struct',
            fields: [
                ['type', 'u8'],
                ['hash', [32]],
            ],
        },
    ],
    [
        BidState,
        {
            kind: 'struct',
            fields: [
                ['type', 'u8'],
                ['bids', [Bid]],
                ['max', 'u64'],
            ],
        },
    ],
    [
        Bid,
        {
            kind: 'struct',
            fields: [
                ['key', 'pubkeyAsString'],
                ['amount', 'u64'],
            ],
        },
    ],
    [
        BidderMetadata,
        {
            kind: 'struct',
            fields: [
                ['bidderPubkey', 'pubkeyAsString'],
                ['auctionPubkey', 'pubkeyAsString'],
                ['lastBid', 'u64'],
                ['lastBidTimestamp', 'u64'],
                ['cancelled', 'u8'],
            ],
        },
    ],
    [
        BidderPot,
        {
            kind: 'struct',
            fields: [
                ['bidderPot', 'pubkeyAsString'],
                ['bidderAct', 'pubkeyAsString'],
                ['auctionAct', 'pubkeyAsString'],
                ['emptied', 'u8'],
            ],
        },
    ],
]);
const decodeAuctionData = (buffer) => {
    return (0, borsh_1.deserializeUnchecked)(exports.AUCTION_SCHEMA, AuctionData, buffer);
};
exports.decodeAuctionData = decodeAuctionData;
async function createAuction(settings, creator, instructions) {
    const auctionProgramId = (0, programIds_1.programIds)().auction;
    const data = Buffer.from((0, borsh_1.serialize)(exports.AUCTION_SCHEMA, settings));
    const auctionKey = (await (0, utils_1.findProgramAddress)([
        Buffer.from(exports.AUCTION_PREFIX),
        (0, utils_1.toPublicKey)(auctionProgramId).toBuffer(),
        (0, utils_1.toPublicKey)(settings.resource).toBuffer(),
    ], (0, utils_1.toPublicKey)(auctionProgramId)))[0];
    const keys = [
        {
            pubkey: (0, utils_1.toPublicKey)(creator),
            isSigner: true,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(auctionKey),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(await getAuctionExtended({
                auctionProgramId,
                resource: settings.resource,
            })),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: web3_js_1.SYSVAR_RENT_PUBKEY,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: web3_js_1.SystemProgram.programId,
            isSigner: false,
            isWritable: false,
        },
    ];
    instructions.push(new web3_js_1.TransactionInstruction({
        keys,
        programId: (0, utils_1.toPublicKey)(auctionProgramId),
        data: data,
    }));
}
exports.createAuction = createAuction;
async function startAuctionWithResource(resource, creator, instructions) {
    const auctionProgramId = (0, programIds_1.programIds)().auction;
    const data = Buffer.from((0, borsh_1.serialize)(exports.AUCTION_SCHEMA, new StartAuctionArgs({
        resource,
    })));
    const auctionKey = (await (0, utils_1.findProgramAddress)([
        Buffer.from(exports.AUCTION_PREFIX),
        (0, utils_1.toPublicKey)(auctionProgramId).toBuffer(),
        (0, utils_1.toPublicKey)(resource).toBuffer(),
    ], (0, utils_1.toPublicKey)(auctionProgramId)))[0];
    const keys = [
        {
            pubkey: (0, utils_1.toPublicKey)(creator),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(auctionKey),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: web3_js_1.SYSVAR_CLOCK_PUBKEY,
            isSigner: false,
            isWritable: false,
        },
    ];
    instructions.push(new web3_js_1.TransactionInstruction({
        keys,
        programId: (0, utils_1.toPublicKey)(auctionProgramId),
        data: data,
    }));
}
exports.startAuctionWithResource = startAuctionWithResource;
async function setAuctionAuthority(auction, currentAuthority, newAuthority, instructions) {
    const auctionProgramId = (0, programIds_1.programIds)().auction;
    const data = Buffer.from((0, borsh_1.serialize)(exports.AUCTION_SCHEMA, new SetAuthorityArgs()));
    const keys = [
        {
            pubkey: (0, utils_1.toPublicKey)(auction),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(currentAuthority),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(newAuthority),
            isSigner: false,
            isWritable: false,
        },
    ];
    instructions.push(new web3_js_1.TransactionInstruction({
        keys,
        programId: (0, utils_1.toPublicKey)(auctionProgramId),
        data: data,
    }));
}
exports.setAuctionAuthority = setAuctionAuthority;
async function placeBid(bidderPubkey, bidderTokenPubkey, bidderPotTokenPubkey, tokenMintPubkey, transferAuthority, payer, resource, amount, instructions) {
    const auctionProgramId = (0, programIds_1.programIds)().auction;
    const data = Buffer.from((0, borsh_1.serialize)(exports.AUCTION_SCHEMA, new PlaceBidArgs({
        resource,
        amount,
    })));
    const auctionKey = (await (0, utils_1.findProgramAddress)([
        Buffer.from(exports.AUCTION_PREFIX),
        (0, utils_1.toPublicKey)(auctionProgramId).toBuffer(),
        (0, utils_1.toPublicKey)(resource).toBuffer(),
    ], (0, utils_1.toPublicKey)(auctionProgramId)))[0];
    const bidderPotKey = await getBidderPotKey({
        auctionProgramId,
        auctionKey,
        bidderPubkey,
    });
    const bidderMetaKey = (await (0, utils_1.findProgramAddress)([
        Buffer.from(exports.AUCTION_PREFIX),
        (0, utils_1.toPublicKey)(auctionProgramId).toBuffer(),
        (0, utils_1.toPublicKey)(auctionKey).toBuffer(),
        (0, utils_1.toPublicKey)(bidderPubkey).toBuffer(),
        Buffer.from('metadata'),
    ], (0, utils_1.toPublicKey)(auctionProgramId)))[0];
    let bidderPotTokenAccount;
    if (!bidderPotTokenPubkey) {
        bidderPotTokenAccount = (0, utils_1.toPublicKey)((await (0, utils_1.findProgramAddress)([
            Buffer.from(exports.AUCTION_PREFIX),
            (0, utils_1.toPublicKey)(bidderPotKey).toBuffer(),
            Buffer.from(exports.BIDDER_POT_TOKEN),
        ], (0, utils_1.toPublicKey)(auctionProgramId)))[0]);
    }
    else {
        bidderPotTokenAccount = (0, utils_1.toPublicKey)(bidderPotTokenPubkey);
    }
    const keys = [
        {
            pubkey: (0, utils_1.toPublicKey)(bidderPubkey),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(bidderTokenPubkey),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(bidderPotKey),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: bidderPotTokenAccount,
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(bidderMetaKey),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(auctionKey),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(await getAuctionExtended({ auctionProgramId, resource })),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(tokenMintPubkey),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(transferAuthority),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(payer),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: web3_js_1.SYSVAR_CLOCK_PUBKEY,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: web3_js_1.SYSVAR_RENT_PUBKEY,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: web3_js_1.SystemProgram.programId,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, programIds_1.programIds)().token,
            isSigner: false,
            isWritable: false,
        },
    ];
    instructions.push(new web3_js_1.TransactionInstruction({
        keys,
        programId: (0, utils_1.toPublicKey)(auctionProgramId),
        data: data,
    }));
    return {
        amount,
    };
}
exports.placeBid = placeBid;
async function getBidderPotKey({ auctionProgramId, auctionKey, bidderPubkey, }) {
    return (await (0, utils_1.findProgramAddress)([
        Buffer.from(exports.AUCTION_PREFIX),
        (0, utils_1.toPublicKey)(auctionProgramId).toBuffer(),
        (0, utils_1.toPublicKey)(auctionKey).toBuffer(),
        (0, utils_1.toPublicKey)(bidderPubkey).toBuffer(),
    ], (0, utils_1.toPublicKey)(auctionProgramId)))[0];
}
exports.getBidderPotKey = getBidderPotKey;
async function getAuctionExtended({ auctionProgramId, resource, }) {
    return (await (0, utils_1.findProgramAddress)([
        Buffer.from(exports.AUCTION_PREFIX),
        (0, utils_1.toPublicKey)(auctionProgramId).toBuffer(),
        (0, utils_1.toPublicKey)(resource).toBuffer(),
        Buffer.from(exports.EXTENDED),
    ], (0, utils_1.toPublicKey)(auctionProgramId)))[0];
}
exports.getAuctionExtended = getAuctionExtended;
async function cancelBid(bidderPubkey, bidderTokenPubkey, bidderPotTokenPubkey, tokenMintPubkey, resource, instructions) {
    const auctionProgramId = (0, programIds_1.programIds)().auction;
    const data = Buffer.from((0, borsh_1.serialize)(exports.AUCTION_SCHEMA, new CancelBidArgs({
        resource,
    })));
    const auctionKey = (await (0, utils_1.findProgramAddress)([
        Buffer.from(exports.AUCTION_PREFIX),
        (0, utils_1.toPublicKey)(auctionProgramId).toBuffer(),
        (0, utils_1.toPublicKey)(resource).toBuffer(),
    ], (0, utils_1.toPublicKey)(auctionProgramId)))[0];
    const bidderPotKey = await getBidderPotKey({
        auctionProgramId,
        auctionKey,
        bidderPubkey,
    });
    const bidderMetaKey = (await (0, utils_1.findProgramAddress)([
        Buffer.from(exports.AUCTION_PREFIX),
        (0, utils_1.toPublicKey)(auctionProgramId).toBuffer(),
        (0, utils_1.toPublicKey)(auctionKey).toBuffer(),
        (0, utils_1.toPublicKey)(bidderPubkey).toBuffer(),
        Buffer.from('metadata'),
    ], (0, utils_1.toPublicKey)(auctionProgramId)))[0];
    const keys = [
        {
            pubkey: (0, utils_1.toPublicKey)(bidderPubkey),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(bidderTokenPubkey),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(bidderPotKey),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(bidderPotTokenPubkey),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(bidderMetaKey),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(auctionKey),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(await getAuctionExtended({ auctionProgramId, resource })),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(tokenMintPubkey),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: web3_js_1.SYSVAR_CLOCK_PUBKEY,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: web3_js_1.SYSVAR_RENT_PUBKEY,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: web3_js_1.SystemProgram.programId,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, programIds_1.programIds)().token,
            isSigner: false,
            isWritable: false,
        },
    ];
    instructions.push(new web3_js_1.TransactionInstruction({
        keys,
        programId: (0, utils_1.toPublicKey)(auctionProgramId),
        data: data,
    }));
}
exports.cancelBid = cancelBid;
//# sourceMappingURL=auction.js.map