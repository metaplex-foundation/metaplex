"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Store = exports.WhitelistedCreator = exports.decodePayoutTicket = exports.decodeSafetyDepositConfig = exports.decodeBidRedemptionTicket = exports.decodeAuctionManager = exports.decodeStore = exports.WhitelistedCreatorParser = exports.decodeWhitelistedCreator = exports.decodePrizeTrackingTicket = exports.decodeAuctionCache = exports.decodeStoreIndexer = exports.WinningConfigType = exports.NonWinningConstraint = exports.WinningConstraint = exports.SetAuctionCacheArgs = exports.SetStoreIndexArgs = exports.RedeemParticipationBidV3Args = exports.WithdrawMasterEditionArgs = exports.RedeemPrintingV2BidArgs = exports.DecommissionAuctionManagerArgs = exports.SetWhitelistedCreatorArgs = exports.SetStoreArgs = exports.EmptyPaymentAccountArgs = exports.RedeemUnusedWinningConfigItemsAsAuctioneerArgs = exports.ProxyCallAddress = exports.ClaimBidArgs = exports.EndAuctionArgs = exports.StartAuctionArgs = exports.RedeemFullRightsTransferBidArgs = exports.RedeemBidArgs = exports.ParticipationConfigV2 = exports.ParticipationStateV2 = exports.AuctionManagerStateV2 = exports.AuctionManagerV2 = exports.AuctionManager = exports.AuctionCache = exports.StoreIndexer = exports.PayoutTicket = exports.PrizeTrackingTicket = exports.MetaplexKey = exports.MAX_PAYOUT_TICKET_SIZE = exports.MAX_WHITELISTED_CREATOR_SIZE = exports.MAX_PRIZE_TRACKING_TICKET_SIZE = exports.ORIGINAL_AUTHORITY_LOOKUP_SIZE = exports.MAX_INDEXED_ELEMENTS = exports.TOTALS = exports.CACHE = exports.INDEX = exports.METAPLEX_PREFIX = void 0;
exports.getPayoutTicket = exports.getAuctionCache = exports.getStoreIndexer = exports.getSafetyDepositConfig = exports.getAuctionWinnerTokenTypeTracker = exports.getPrizeTrackingTicket = exports.getWhitelistedCreator = exports.isCreatorPartOfTheStore = exports.getOriginalAuthority = exports.getBidderKeys = exports.getBidRedemption = exports.getAuctionKeys = exports.getAuctionManagerKey = exports.SCHEMA = exports.ValidateSafetyDepositBoxV2Args = exports.SafetyDepositConfig = exports.InitAuctionManagerV2Args = exports.AmountRange = exports.TupleNumericType = exports.AuctionManagerStatus = exports.BidRedemptionTicketV2 = void 0;
const web3_js_1 = require("@solana/web3.js");
const bn_js_1 = __importDefault(require("bn.js"));
const bs58_1 = __importDefault(require("bs58"));
const borsh_1 = require("borsh");
const actions_1 = require("../../actions");
const utils_1 = require("../../utils");
const deprecatedStates_1 = require("./deprecatedStates");
__exportStar(require("./deprecatedInitAuctionManagerV1"), exports);
__exportStar(require("./redeemBid"), exports);
__exportStar(require("./redeemFullRightsTransferBid"), exports);
__exportStar(require("./deprecatedRedeemParticipationBid"), exports);
__exportStar(require("./startAuction"), exports);
__exportStar(require("./deprecatedValidateSafetyDepositBoxV1"), exports);
__exportStar(require("./redeemParticipationBidV3"), exports);
__exportStar(require("./redeemPrintingV2Bid"), exports);
__exportStar(require("./withdrawMasterEdition"), exports);
__exportStar(require("./deprecatedStates"), exports);
exports.METAPLEX_PREFIX = 'metaplex';
exports.INDEX = 'index';
exports.CACHE = 'cache';
exports.TOTALS = 'totals';
exports.MAX_INDEXED_ELEMENTS = 100;
exports.ORIGINAL_AUTHORITY_LOOKUP_SIZE = 33;
exports.MAX_PRIZE_TRACKING_TICKET_SIZE = 1 + 32 + 8 + 8 + 8 + 50;
exports.MAX_WHITELISTED_CREATOR_SIZE = 2 + 32 + 10;
exports.MAX_PAYOUT_TICKET_SIZE = 1 + 32 + 8;
var MetaplexKey;
(function (MetaplexKey) {
    MetaplexKey[MetaplexKey["Uninitialized"] = 0] = "Uninitialized";
    MetaplexKey[MetaplexKey["OriginalAuthorityLookupV1"] = 1] = "OriginalAuthorityLookupV1";
    MetaplexKey[MetaplexKey["BidRedemptionTicketV1"] = 2] = "BidRedemptionTicketV1";
    MetaplexKey[MetaplexKey["StoreV1"] = 3] = "StoreV1";
    MetaplexKey[MetaplexKey["WhitelistedCreatorV1"] = 4] = "WhitelistedCreatorV1";
    MetaplexKey[MetaplexKey["PayoutTicketV1"] = 5] = "PayoutTicketV1";
    MetaplexKey[MetaplexKey["SafetyDepositValidationTicketV1"] = 6] = "SafetyDepositValidationTicketV1";
    MetaplexKey[MetaplexKey["AuctionManagerV1"] = 7] = "AuctionManagerV1";
    MetaplexKey[MetaplexKey["PrizeTrackingTicketV1"] = 8] = "PrizeTrackingTicketV1";
    MetaplexKey[MetaplexKey["SafetyDepositConfigV1"] = 9] = "SafetyDepositConfigV1";
    MetaplexKey[MetaplexKey["AuctionManagerV2"] = 10] = "AuctionManagerV2";
    MetaplexKey[MetaplexKey["BidRedemptionTicketV2"] = 11] = "BidRedemptionTicketV2";
    MetaplexKey[MetaplexKey["AuctionWinnerTokenTypeTrackerV1"] = 12] = "AuctionWinnerTokenTypeTrackerV1";
    MetaplexKey[MetaplexKey["StoreIndexerV1"] = 13] = "StoreIndexerV1";
    MetaplexKey[MetaplexKey["AuctionCacheV1"] = 14] = "AuctionCacheV1";
    MetaplexKey[MetaplexKey["PackSet"] = 15] = "PackSet";
})(MetaplexKey = exports.MetaplexKey || (exports.MetaplexKey = {}));
class PrizeTrackingTicket {
    constructor(args) {
        this.key = MetaplexKey.PrizeTrackingTicketV1;
        this.key = MetaplexKey.PrizeTrackingTicketV1;
        this.metadata = args.metadata;
        this.supplySnapshot = args.supplySnapshot;
        this.expectedRedemptions = args.expectedRedemptions;
        this.redemptions = args.redemptions;
    }
}
exports.PrizeTrackingTicket = PrizeTrackingTicket;
class PayoutTicket {
    constructor(args) {
        this.key = MetaplexKey.PayoutTicketV1;
        this.key = MetaplexKey.PayoutTicketV1;
        this.recipient = args.recipient;
        this.amountPaid = args.amountPaid;
    }
}
exports.PayoutTicket = PayoutTicket;
class StoreIndexer {
    constructor(args) {
        this.key = MetaplexKey.StoreIndexerV1;
        this.key = MetaplexKey.StoreIndexerV1;
        this.store = args.store;
        this.page = args.page;
        this.auctionCaches = args.auctionCaches;
    }
}
exports.StoreIndexer = StoreIndexer;
class AuctionCache {
    constructor(args) {
        this.key = MetaplexKey.AuctionCacheV1;
        this.key = MetaplexKey.AuctionCacheV1;
        this.store = args.store;
        this.timestamp = args.timestamp;
        this.metadata = args.metadata;
        this.auction = args.auction;
        this.vault = args.vault;
        this.auctionManager = args.auctionManager;
    }
}
exports.AuctionCache = AuctionCache;
class AuctionManager {
    constructor(args) {
        var _a;
        this.pubkey = args.instance.pubkey;
        this.instance = args.instance;
        this.numWinners = args.auction.info.bidState.max;
        this.safetyDepositBoxesExpected =
            this.instance.info.key == MetaplexKey.AuctionManagerV2
                ? new bn_js_1.default(args.vault.info.tokenTypeCount)
                : new bn_js_1.default(this.instance.info.state.winningConfigItemsValidated);
        this.store = this.instance.info.store;
        this.authority = this.instance.info.authority;
        this.vault = this.instance.info.vault;
        this.acceptPayment = this.instance.info.acceptPayment;
        this.auction = this.instance.info.auction;
        this.status = this.instance.info.state.status;
        this.safetyDepositConfigs = args.safetyDepositConfigs;
        this.bidRedemptions = args.bidRedemptions;
        this.participationConfig =
            this.instance.info.key == MetaplexKey.AuctionManagerV2
                ? ((_a = this.safetyDepositConfigs) === null || _a === void 0 ? void 0 : _a.filter(s => s.info.participationConfig).map(s => {
                    var _a, _b, _c;
                    return ({
                        winnerConstraint: ((_a = s.info.participationConfig) === null || _a === void 0 ? void 0 : _a.winnerConstraint) ||
                            WinningConstraint.NoParticipationPrize,
                        nonWinningConstraint: ((_b = s.info.participationConfig) === null || _b === void 0 ? void 0 : _b.nonWinningConstraint) ||
                            NonWinningConstraint.GivenForFixedPrice,
                        fixedPrice: ((_c = s.info.participationConfig) === null || _c === void 0 ? void 0 : _c.fixedPrice) || null,
                        safetyDepositBoxIndex: s.info.order.toNumber(),
                    });
                })[0]) || undefined
                : this.instance.info.settings
                    .participationConfig || undefined;
    }
    isItemClaimed(winnerIndex, safetyDepositBoxIndex) {
        if (this.instance.info.key == MetaplexKey.AuctionManagerV1) {
            const asV1 = this.instance.info;
            const itemIndex = asV1.settings.winningConfigs[winnerIndex].items.findIndex(i => i.safetyDepositBoxIndex == safetyDepositBoxIndex);
            return asV1.state.winningConfigStates[winnerIndex].items[itemIndex]
                .claimed;
        }
        else {
            const winner = this.bidRedemptions.find(b => b.info.winnerIndex && b.info.winnerIndex.eq(new bn_js_1.default(winnerIndex)));
            if (!winner) {
                return false;
            }
            else {
                return winner.info.getBidRedeemed(safetyDepositBoxIndex);
            }
        }
    }
    getAmountForWinner(winnerIndex, safetyDepositBoxIndex) {
        var _a;
        if (this.instance.info.key == MetaplexKey.AuctionManagerV1) {
            return new bn_js_1.default(((_a = this.instance.info.settings.winningConfigs[winnerIndex].items.find(i => i.safetyDepositBoxIndex == safetyDepositBoxIndex)) === null || _a === void 0 ? void 0 : _a.amount) || 0);
        }
        else {
            const safetyDepositConfig = this.safetyDepositConfigs[safetyDepositBoxIndex];
            return safetyDepositConfig.info.getAmountForWinner(new bn_js_1.default(winnerIndex));
        }
    }
    getItemsFromSafetyDepositBoxes(metadataByMint, masterEditionsByPrintingMint, metadataByMasterEdition, masterEditions, boxes) {
        var _a;
        if (this.instance.info.key == MetaplexKey.AuctionManagerV1) {
            return this.instance.info.settings.winningConfigs.map(w => {
                return w.items.map(it => {
                    var _a, _b, _c;
                    let metadata = metadataByMint[(_a = boxes[it.safetyDepositBoxIndex]) === null || _a === void 0 ? void 0 : _a.info.tokenMint];
                    if (!metadata) {
                        // Means is a limited edition v1, so the tokenMint is the printingMint
                        const masterEdition = masterEditionsByPrintingMint[(_b = boxes[it.safetyDepositBoxIndex]) === null || _b === void 0 ? void 0 : _b.info.tokenMint];
                        if (masterEdition) {
                            metadata = metadataByMasterEdition[masterEdition.pubkey];
                        }
                    }
                    return {
                        metadata,
                        winningConfigType: it.winningConfigType,
                        safetyDeposit: boxes[it.safetyDepositBoxIndex],
                        amount: new bn_js_1.default(it.amount),
                        masterEdition: ((_c = metadata === null || metadata === void 0 ? void 0 : metadata.info) === null || _c === void 0 ? void 0 : _c.masterEdition)
                            ? masterEditions[metadata.info.masterEdition]
                            : undefined,
                    };
                });
            });
        }
        else {
            const items = [];
            for (let i = 0; i < this.numWinners.toNumber(); i++) {
                const newWinnerArr = [];
                items.push(newWinnerArr);
                (_a = this.safetyDepositConfigs) === null || _a === void 0 ? void 0 : _a.forEach(s => {
                    var _a;
                    const amount = s.info.getAmountForWinner(new bn_js_1.default(i));
                    if (amount.gt(new bn_js_1.default(0))) {
                        const safetyDeposit = boxes[s.info.order.toNumber()];
                        const metadata = metadataByMint[safetyDeposit.info.tokenMint];
                        newWinnerArr.push({
                            metadata,
                            winningConfigType: s.info.winningConfigType,
                            safetyDeposit,
                            amount,
                            masterEdition: ((_a = metadata === null || metadata === void 0 ? void 0 : metadata.info) === null || _a === void 0 ? void 0 : _a.masterEdition)
                                ? masterEditions[metadata.info.masterEdition]
                                : undefined,
                        });
                    }
                });
            }
            return items;
        }
    }
}
exports.AuctionManager = AuctionManager;
class AuctionManagerV2 {
    constructor(args) {
        this.key = MetaplexKey.AuctionManagerV2;
        this.store = args.store;
        this.authority = args.authority;
        this.auction = args.auction;
        this.vault = args.vault;
        this.acceptPayment = args.acceptPayment;
        this.state = args.state;
        const auction = (0, utils_1.programIds)().auction;
        (0, actions_1.getAuctionExtended)({
            auctionProgramId: auction,
            resource: this.vault,
        }).then(val => (this.auctionDataExtended = val));
    }
}
exports.AuctionManagerV2 = AuctionManagerV2;
class AuctionManagerStateV2 {
    constructor(args) {
        this.status = AuctionManagerStatus.Initialized;
        this.safetyConfigItemsValidated = new bn_js_1.default(0);
        this.bidsPushedToAcceptPayment = new bn_js_1.default(0);
        this.hasParticipation = false;
        Object.assign(this, args);
    }
}
exports.AuctionManagerStateV2 = AuctionManagerStateV2;
class ParticipationStateV2 {
    constructor(args) {
        this.collectedToAcceptPayment = new bn_js_1.default(0);
        Object.assign(this, args);
    }
}
exports.ParticipationStateV2 = ParticipationStateV2;
class ParticipationConfigV2 {
    constructor(args) {
        this.winnerConstraint = WinningConstraint.NoParticipationPrize;
        this.nonWinningConstraint = NonWinningConstraint.GivenForFixedPrice;
        this.fixedPrice = new bn_js_1.default(0);
        Object.assign(this, args);
    }
}
exports.ParticipationConfigV2 = ParticipationConfigV2;
class RedeemBidArgs {
    constructor() {
        this.instruction = 2;
    }
}
exports.RedeemBidArgs = RedeemBidArgs;
class RedeemFullRightsTransferBidArgs {
    constructor() {
        this.instruction = 3;
    }
}
exports.RedeemFullRightsTransferBidArgs = RedeemFullRightsTransferBidArgs;
class StartAuctionArgs {
    constructor() {
        this.instruction = 5;
    }
}
exports.StartAuctionArgs = StartAuctionArgs;
class EndAuctionArgs {
    constructor(args) {
        this.instruction = 20;
        this.reveal = args.reveal;
    }
}
exports.EndAuctionArgs = EndAuctionArgs;
class ClaimBidArgs {
    constructor() {
        this.instruction = 6;
    }
}
exports.ClaimBidArgs = ClaimBidArgs;
var ProxyCallAddress;
(function (ProxyCallAddress) {
    ProxyCallAddress[ProxyCallAddress["RedeemBid"] = 0] = "RedeemBid";
    ProxyCallAddress[ProxyCallAddress["RedeemFullRightsTransferBid"] = 1] = "RedeemFullRightsTransferBid";
})(ProxyCallAddress = exports.ProxyCallAddress || (exports.ProxyCallAddress = {}));
class RedeemUnusedWinningConfigItemsAsAuctioneerArgs {
    constructor(args) {
        this.instruction = 12;
        this.winningConfigItemIndex = args.winningConfigItemIndex;
        this.proxyCall = args.proxyCall;
    }
}
exports.RedeemUnusedWinningConfigItemsAsAuctioneerArgs = RedeemUnusedWinningConfigItemsAsAuctioneerArgs;
class EmptyPaymentAccountArgs {
    constructor(args) {
        this.instruction = 7;
        this.winningConfigIndex = args.winningConfigIndex;
        this.winningConfigItemIndex = args.winningConfigItemIndex;
        this.creatorIndex = args.creatorIndex;
    }
}
exports.EmptyPaymentAccountArgs = EmptyPaymentAccountArgs;
class SetStoreArgs {
    constructor(args) {
        this.instruction = 8;
        this.public = args.public;
    }
}
exports.SetStoreArgs = SetStoreArgs;
class SetWhitelistedCreatorArgs {
    constructor(args) {
        this.instruction = 9;
        this.activated = args.activated;
    }
}
exports.SetWhitelistedCreatorArgs = SetWhitelistedCreatorArgs;
class DecommissionAuctionManagerArgs {
    constructor() {
        this.instruction = 13;
    }
}
exports.DecommissionAuctionManagerArgs = DecommissionAuctionManagerArgs;
class RedeemPrintingV2BidArgs {
    constructor(args) {
        this.instruction = 14;
        this.editionOffset = args.editionOffset;
        this.winIndex = args.winIndex;
    }
}
exports.RedeemPrintingV2BidArgs = RedeemPrintingV2BidArgs;
class WithdrawMasterEditionArgs {
    constructor() {
        this.instruction = 15;
    }
}
exports.WithdrawMasterEditionArgs = WithdrawMasterEditionArgs;
class RedeemParticipationBidV3Args {
    constructor(args) {
        this.instruction = 19;
        this.winIndex = args.winIndex;
    }
}
exports.RedeemParticipationBidV3Args = RedeemParticipationBidV3Args;
class SetStoreIndexArgs {
    constructor(args) {
        this.instruction = 21;
        this.page = args.page;
        this.offset = args.offset;
    }
}
exports.SetStoreIndexArgs = SetStoreIndexArgs;
class SetAuctionCacheArgs {
    constructor() {
        this.instruction = 22;
    }
}
exports.SetAuctionCacheArgs = SetAuctionCacheArgs;
var WinningConstraint;
(function (WinningConstraint) {
    WinningConstraint[WinningConstraint["NoParticipationPrize"] = 0] = "NoParticipationPrize";
    WinningConstraint[WinningConstraint["ParticipationPrizeGiven"] = 1] = "ParticipationPrizeGiven";
})(WinningConstraint = exports.WinningConstraint || (exports.WinningConstraint = {}));
var NonWinningConstraint;
(function (NonWinningConstraint) {
    NonWinningConstraint[NonWinningConstraint["NoParticipationPrize"] = 0] = "NoParticipationPrize";
    NonWinningConstraint[NonWinningConstraint["GivenForFixedPrice"] = 1] = "GivenForFixedPrice";
    NonWinningConstraint[NonWinningConstraint["GivenForBidPrice"] = 2] = "GivenForBidPrice";
})(NonWinningConstraint = exports.NonWinningConstraint || (exports.NonWinningConstraint = {}));
var WinningConfigType;
(function (WinningConfigType) {
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
    WinningConfigType[WinningConfigType["TokenOnlyTransfer"] = 0] = "TokenOnlyTransfer";
    /// Means you are auctioning off the master edition record and it's metadata ownership as well as the
    /// token itself. The other person will be able to mint authorization tokens and make changes to the
    /// artwork.
    WinningConfigType[WinningConfigType["FullRightsTransfer"] = 1] = "FullRightsTransfer";
    /// Means you are using authorization tokens to print off editions during the auction using
    /// from a MasterEditionV1
    WinningConfigType[WinningConfigType["PrintingV1"] = 2] = "PrintingV1";
    /// Means you are using the MasterEditionV2 to print off editions
    WinningConfigType[WinningConfigType["PrintingV2"] = 3] = "PrintingV2";
    /// Means you are using a MasterEditionV2 as a participation prize.
    WinningConfigType[WinningConfigType["Participation"] = 4] = "Participation";
})(WinningConfigType = exports.WinningConfigType || (exports.WinningConfigType = {}));
const decodeStoreIndexer = (buffer) => {
    return (0, borsh_1.deserializeUnchecked)(exports.SCHEMA, StoreIndexer, buffer);
};
exports.decodeStoreIndexer = decodeStoreIndexer;
const decodeAuctionCache = (buffer) => {
    return (0, borsh_1.deserializeUnchecked)(exports.SCHEMA, AuctionCache, buffer);
};
exports.decodeAuctionCache = decodeAuctionCache;
const decodePrizeTrackingTicket = (buffer) => {
    return (0, borsh_1.deserializeUnchecked)(exports.SCHEMA, PrizeTrackingTicket, buffer);
};
exports.decodePrizeTrackingTicket = decodePrizeTrackingTicket;
const decodeWhitelistedCreator = (buffer) => {
    return (0, borsh_1.deserializeUnchecked)(exports.SCHEMA, WhitelistedCreator, buffer);
};
exports.decodeWhitelistedCreator = decodeWhitelistedCreator;
const WhitelistedCreatorParser = (pubkey, account) => ({
    pubkey,
    account,
    info: (0, exports.decodeWhitelistedCreator)(account.data),
});
exports.WhitelistedCreatorParser = WhitelistedCreatorParser;
const decodeStore = (buffer) => {
    return (0, borsh_1.deserializeUnchecked)(exports.SCHEMA, Store, buffer);
};
exports.decodeStore = decodeStore;
const decodeAuctionManager = (buffer) => {
    return buffer[0] == MetaplexKey.AuctionManagerV1
        ? (0, borsh_1.deserializeUnchecked)(exports.SCHEMA, deprecatedStates_1.AuctionManagerV1, buffer)
        : (0, borsh_1.deserializeUnchecked)(exports.SCHEMA, AuctionManagerV2, buffer);
};
exports.decodeAuctionManager = decodeAuctionManager;
const decodeBidRedemptionTicket = (buffer) => {
    return (buffer[0] == MetaplexKey.BidRedemptionTicketV1
        ? (0, borsh_1.deserializeUnchecked)(exports.SCHEMA, deprecatedStates_1.BidRedemptionTicketV1, buffer)
        : new BidRedemptionTicketV2({
            key: MetaplexKey.BidRedemptionTicketV2,
            data: buffer.toJSON().data,
        }));
};
exports.decodeBidRedemptionTicket = decodeBidRedemptionTicket;
const decodeSafetyDepositConfig = (buffer) => {
    return new SafetyDepositConfig({
        data: buffer,
    });
};
exports.decodeSafetyDepositConfig = decodeSafetyDepositConfig;
const decodePayoutTicket = (buffer) => {
    return (0, borsh_1.deserializeUnchecked)(exports.SCHEMA, PayoutTicket, buffer);
};
exports.decodePayoutTicket = decodePayoutTicket;
class WhitelistedCreator {
    constructor(args) {
        this.key = MetaplexKey.WhitelistedCreatorV1;
        this.activated = true;
        this.address = args.address;
        this.activated = args.activated;
    }
}
exports.WhitelistedCreator = WhitelistedCreator;
class Store {
    constructor(args) {
        this.key = MetaplexKey.StoreV1;
        this.public = true;
        this.key = MetaplexKey.StoreV1;
        this.public = args.public;
        this.auctionProgram = args.auctionProgram;
        this.tokenVaultProgram = args.tokenVaultProgram;
        this.tokenMetadataProgram = args.tokenMetadataProgram;
        this.tokenProgram = args.tokenProgram;
    }
}
exports.Store = Store;
class BidRedemptionTicketV2 {
    constructor(args) {
        this.key = MetaplexKey.BidRedemptionTicketV2;
        this.data = [];
        Object.assign(this, args);
        let offset = 2;
        if (this.data[1] == 0) {
            this.winnerIndex = null;
        }
        else {
            this.winnerIndex = new bn_js_1.default(this.data.slice(2, 8), 'le');
            offset += 8;
        }
        this.auctionManager = bs58_1.default.encode(this.data.slice(offset, offset + 32));
    }
    getBidRedeemed(order) {
        let offset = 42;
        if (this.data[1] == 0) {
            offset -= 8;
        }
        const index = Math.floor(order / 8) + offset;
        const positionFromRight = 7 - (order % 8);
        const mask = Math.pow(2, positionFromRight);
        const appliedMask = this.data[index] & mask;
        return appliedMask != 0;
    }
}
exports.BidRedemptionTicketV2 = BidRedemptionTicketV2;
var AuctionManagerStatus;
(function (AuctionManagerStatus) {
    AuctionManagerStatus[AuctionManagerStatus["Initialized"] = 0] = "Initialized";
    AuctionManagerStatus[AuctionManagerStatus["Validated"] = 1] = "Validated";
    AuctionManagerStatus[AuctionManagerStatus["Running"] = 2] = "Running";
    AuctionManagerStatus[AuctionManagerStatus["Disbursing"] = 3] = "Disbursing";
    AuctionManagerStatus[AuctionManagerStatus["Finished"] = 4] = "Finished";
})(AuctionManagerStatus = exports.AuctionManagerStatus || (exports.AuctionManagerStatus = {}));
var TupleNumericType;
(function (TupleNumericType) {
    TupleNumericType[TupleNumericType["U8"] = 1] = "U8";
    TupleNumericType[TupleNumericType["U16"] = 2] = "U16";
    TupleNumericType[TupleNumericType["U32"] = 4] = "U32";
    TupleNumericType[TupleNumericType["U64"] = 8] = "U64";
})(TupleNumericType = exports.TupleNumericType || (exports.TupleNumericType = {}));
class AmountRange {
    constructor(args) {
        this.amount = args.amount;
        this.length = args.length;
    }
}
exports.AmountRange = AmountRange;
class InitAuctionManagerV2Args {
    constructor(args) {
        this.instruction = 17;
        this.amountType = TupleNumericType.U8;
        this.lengthType = TupleNumericType.U8;
        this.maxRanges = new bn_js_1.default(1);
        this.amountType = args.amountType;
        this.lengthType = args.lengthType;
        this.maxRanges = args.maxRanges;
    }
}
exports.InitAuctionManagerV2Args = InitAuctionManagerV2Args;
class SafetyDepositConfig {
    constructor(args) {
        this.key = MetaplexKey.SafetyDepositConfigV1;
        this.auctionManager = web3_js_1.SystemProgram.programId.toBase58();
        this.order = new bn_js_1.default(0);
        this.winningConfigType = WinningConfigType.PrintingV2;
        this.amountType = TupleNumericType.U8;
        this.lengthType = TupleNumericType.U8;
        this.amountRanges = [];
        this.participationConfig = null;
        this.participationState = null;
        if (args.directArgs) {
            Object.assign(this, args.directArgs);
        }
        else if (args.data) {
            this.auctionManager = bs58_1.default.encode(args.data.slice(1, 33));
            this.order = new bn_js_1.default(args.data.slice(33, 41), 'le');
            this.winningConfigType = args.data[41];
            this.amountType = args.data[42];
            this.lengthType = args.data[43];
            const lengthOfArray = new bn_js_1.default(args.data.slice(44, 48), 'le');
            this.amountRanges = [];
            let offset = 48;
            for (let i = 0; i < lengthOfArray.toNumber(); i++) {
                const amount = this.getBNFromData(args.data, offset, this.amountType);
                offset += this.amountType;
                const length = this.getBNFromData(args.data, offset, this.lengthType);
                offset += this.lengthType;
                this.amountRanges.push(new AmountRange({ amount, length }));
            }
            if (args.data[offset] == 0) {
                offset += 1;
                this.participationConfig = null;
            }
            else {
                // pick up participation config manually
                const winnerConstraintAsNumber = args.data[offset + 1];
                const nonWinnerConstraintAsNumber = args.data[offset + 2];
                let fixedPrice = null;
                offset += 3;
                if (args.data[offset] == 1) {
                    fixedPrice = new bn_js_1.default(args.data.slice(offset + 1, offset + 9), 'le');
                    offset += 9;
                }
                else {
                    offset += 1;
                }
                this.participationConfig = new ParticipationConfigV2({
                    winnerConstraint: winnerConstraintAsNumber,
                    nonWinningConstraint: nonWinnerConstraintAsNumber,
                    fixedPrice: fixedPrice,
                });
            }
            if (args.data[offset] == 0) {
                offset += 1;
                this.participationState = null;
            }
            else {
                // pick up participation state manually
                const collectedToAcceptPayment = new bn_js_1.default(args.data.slice(offset + 1, offset + 9), 'le');
                offset += 9;
                this.participationState = new ParticipationStateV2({
                    collectedToAcceptPayment,
                });
            }
        }
    }
    getBNFromData(data, offset, dataType) {
        switch (dataType) {
            case TupleNumericType.U8:
                return new bn_js_1.default(data[offset], 'le');
            case TupleNumericType.U16:
                return new bn_js_1.default(data.slice(offset, offset + 2), 'le');
            case TupleNumericType.U32:
                return new bn_js_1.default(data.slice(offset, offset + 4), 'le');
            case TupleNumericType.U64:
                return new bn_js_1.default(data.slice(offset, offset + 8), 'le');
        }
    }
    getAmountForWinner(winner) {
        let start = new bn_js_1.default(0);
        for (let i = 0; i < this.amountRanges.length; i++) {
            const end = start.add(this.amountRanges[i].length);
            if (winner.gte(start) && winner.lt(end)) {
                return this.amountRanges[i].amount;
            }
            start = end;
        }
        return new bn_js_1.default(0);
    }
}
exports.SafetyDepositConfig = SafetyDepositConfig;
class ValidateSafetyDepositBoxV2Args {
    constructor(safetyDeposit) {
        this.instruction = 18;
        this.safetyDepositConfig = safetyDeposit;
    }
}
exports.ValidateSafetyDepositBoxV2Args = ValidateSafetyDepositBoxV2Args;
exports.SCHEMA = new Map([
    ...deprecatedStates_1.DEPRECATED_SCHEMA,
    [
        StoreIndexer,
        {
            kind: 'struct',
            fields: [
                ['key', 'u8'],
                ['store', 'pubkeyAsString'],
                ['page', 'u64'],
                ['auctionCaches', ['pubkeyAsString']],
            ],
        },
    ],
    [
        AuctionCache,
        {
            kind: 'struct',
            fields: [
                ['key', 'u8'],
                ['store', 'pubkeyAsString'],
                ['timestamp', 'u64'],
                ['metadata', ['pubkeyAsString']],
                ['auction', 'pubkeyAsString'],
                ['vault', 'pubkeyAsString'],
                ['auctionManager', 'pubkeyAsString'],
            ],
        },
    ],
    [
        PrizeTrackingTicket,
        {
            kind: 'struct',
            fields: [
                ['key', 'u8'],
                ['metadata', 'pubkeyAsString'],
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
                ['store', 'pubkeyAsString'],
                ['authority', 'pubkeyAsString'],
                ['auction', 'pubkeyAsString'],
                ['vault', 'pubkeyAsString'],
                ['acceptPayment', 'pubkeyAsString'],
                ['state', AuctionManagerStateV2],
            ],
        },
    ],
    [
        ParticipationConfigV2,
        {
            kind: 'struct',
            fields: [
                ['winnerConstraint', 'u8'],
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
                ['address', 'pubkeyAsString'],
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
                ['auctionProgram', 'pubkeyAsString'],
                ['tokenVaultProgram', 'pubkeyAsString'],
                ['tokenMetadataProgram', 'pubkeyAsString'],
                ['tokenProgram', 'pubkeyAsString'],
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
                ['recipient', 'pubkeyAsString'],
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
                ['auctionManager', 'pubkeyAsString'],
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
        RedeemParticipationBidV3Args,
        {
            kind: 'struct',
            fields: [
                ['instruction', 'u8'],
                ['winIndex', { kind: 'option', type: 'u64' }],
            ],
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
        EndAuctionArgs,
        {
            kind: 'struct',
            fields: [
                ['instruction', 'u8'],
                ['reveal', { kind: 'option', type: [bn_js_1.default] }],
            ],
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
        SetAuctionCacheArgs,
        {
            kind: 'struct',
            fields: [['instruction', 'u8']],
        },
    ],
    [
        SetStoreIndexArgs,
        {
            kind: 'struct',
            fields: [
                ['instruction', 'u8'],
                ['page', 'u64'],
                ['offset', 'u64'],
            ],
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
async function getAuctionManagerKey(vault, auctionKey) {
    const PROGRAM_IDS = (0, utils_1.programIds)();
    return (await (0, utils_1.findProgramAddress)([Buffer.from(exports.METAPLEX_PREFIX), (0, utils_1.toPublicKey)(auctionKey).toBuffer()], (0, utils_1.toPublicKey)(PROGRAM_IDS.metaplex)))[0];
}
exports.getAuctionManagerKey = getAuctionManagerKey;
async function getAuctionKeys(vault) {
    const PROGRAM_IDS = (0, utils_1.programIds)();
    const auctionKey = (await (0, utils_1.findProgramAddress)([
        Buffer.from(actions_1.AUCTION_PREFIX),
        (0, utils_1.toPublicKey)(PROGRAM_IDS.auction).toBuffer(),
        (0, utils_1.toPublicKey)(vault).toBuffer(),
    ], (0, utils_1.toPublicKey)(PROGRAM_IDS.auction)))[0];
    const auctionManagerKey = await getAuctionManagerKey(vault, auctionKey);
    return { auctionKey, auctionManagerKey };
}
exports.getAuctionKeys = getAuctionKeys;
async function getBidRedemption(auctionKey, bidMetadata) {
    const PROGRAM_IDS = (0, utils_1.programIds)();
    return (await (0, utils_1.findProgramAddress)([
        Buffer.from(exports.METAPLEX_PREFIX),
        (0, utils_1.toPublicKey)(auctionKey).toBuffer(),
        (0, utils_1.toPublicKey)(bidMetadata).toBuffer(),
    ], (0, utils_1.toPublicKey)(PROGRAM_IDS.metaplex)))[0];
}
exports.getBidRedemption = getBidRedemption;
async function getBidderKeys(auctionKey, bidder) {
    const PROGRAM_IDS = (0, utils_1.programIds)();
    const bidMetadata = (await (0, utils_1.findProgramAddress)([
        Buffer.from(actions_1.AUCTION_PREFIX),
        (0, utils_1.toPublicKey)(PROGRAM_IDS.auction).toBuffer(),
        (0, utils_1.toPublicKey)(auctionKey).toBuffer(),
        (0, utils_1.toPublicKey)(bidder).toBuffer(),
        Buffer.from(actions_1.METADATA),
    ], (0, utils_1.toPublicKey)(PROGRAM_IDS.auction)))[0];
    const bidRedemption = await getBidRedemption(auctionKey, bidMetadata);
    return { bidMetadata, bidRedemption };
}
exports.getBidderKeys = getBidderKeys;
async function getOriginalAuthority(auctionKey, metadata) {
    const PROGRAM_IDS = (0, utils_1.programIds)();
    return (await (0, utils_1.findProgramAddress)([
        Buffer.from(exports.METAPLEX_PREFIX),
        (0, utils_1.toPublicKey)(auctionKey).toBuffer(),
        (0, utils_1.toPublicKey)(metadata).toBuffer(),
    ], (0, utils_1.toPublicKey)(PROGRAM_IDS.metaplex)))[0];
}
exports.getOriginalAuthority = getOriginalAuthority;
const isCreatorPartOfTheStore = async (creatorAddress, pubkey, store) => {
    const creatorKeyInStore = await getWhitelistedCreator(creatorAddress, store);
    return creatorKeyInStore === pubkey;
};
exports.isCreatorPartOfTheStore = isCreatorPartOfTheStore;
async function getWhitelistedCreator(creator, storeId) {
    const PROGRAM_IDS = (0, utils_1.programIds)();
    const store = storeId || PROGRAM_IDS.store;
    if (!store) {
        throw new Error('Store not initialized');
    }
    return (await (0, utils_1.findProgramAddress)([
        Buffer.from(exports.METAPLEX_PREFIX),
        (0, utils_1.toPublicKey)(PROGRAM_IDS.metaplex).toBuffer(),
        (0, utils_1.toPublicKey)(store).toBuffer(),
        (0, utils_1.toPublicKey)(creator).toBuffer(),
    ], (0, utils_1.toPublicKey)(PROGRAM_IDS.metaplex)))[0];
}
exports.getWhitelistedCreator = getWhitelistedCreator;
async function getPrizeTrackingTicket(auctionManager, mint) {
    const PROGRAM_IDS = (0, utils_1.programIds)();
    const store = PROGRAM_IDS.store;
    if (!store) {
        throw new Error('Store not initialized');
    }
    return (await (0, utils_1.findProgramAddress)([
        Buffer.from(exports.METAPLEX_PREFIX),
        (0, utils_1.toPublicKey)(PROGRAM_IDS.metaplex).toBuffer(),
        (0, utils_1.toPublicKey)(auctionManager).toBuffer(),
        (0, utils_1.toPublicKey)(mint).toBuffer(),
    ], (0, utils_1.toPublicKey)(PROGRAM_IDS.metaplex)))[0];
}
exports.getPrizeTrackingTicket = getPrizeTrackingTicket;
async function getAuctionWinnerTokenTypeTracker(auctionManager) {
    const PROGRAM_IDS = (0, utils_1.programIds)();
    const store = PROGRAM_IDS.store;
    if (!store) {
        throw new Error('Store not initialized');
    }
    return (await (0, utils_1.findProgramAddress)([
        Buffer.from(exports.METAPLEX_PREFIX),
        (0, utils_1.toPublicKey)(PROGRAM_IDS.metaplex).toBuffer(),
        (0, utils_1.toPublicKey)(auctionManager).toBuffer(),
        Buffer.from(exports.TOTALS),
    ], (0, utils_1.toPublicKey)(PROGRAM_IDS.metaplex)))[0];
}
exports.getAuctionWinnerTokenTypeTracker = getAuctionWinnerTokenTypeTracker;
async function getSafetyDepositConfig(auctionManager, safetyDeposit) {
    const PROGRAM_IDS = (0, utils_1.programIds)();
    const store = PROGRAM_IDS.store;
    if (!store) {
        throw new Error('Store not initialized');
    }
    return (await (0, utils_1.findProgramAddress)([
        Buffer.from(exports.METAPLEX_PREFIX),
        (0, utils_1.toPublicKey)(PROGRAM_IDS.metaplex).toBuffer(),
        (0, utils_1.toPublicKey)(auctionManager).toBuffer(),
        (0, utils_1.toPublicKey)(safetyDeposit).toBuffer(),
    ], (0, utils_1.toPublicKey)(PROGRAM_IDS.metaplex)))[0];
}
exports.getSafetyDepositConfig = getSafetyDepositConfig;
async function getStoreIndexer(page) {
    const PROGRAM_IDS = (0, utils_1.programIds)();
    const store = PROGRAM_IDS.store;
    if (!store) {
        throw new Error('Store not initialized');
    }
    return (await (0, utils_1.findProgramAddress)([
        Buffer.from(exports.METAPLEX_PREFIX),
        (0, utils_1.toPublicKey)(PROGRAM_IDS.metaplex).toBuffer(),
        (0, utils_1.toPublicKey)(store).toBuffer(),
        Buffer.from(exports.INDEX),
        Buffer.from(page.toString()),
    ], (0, utils_1.toPublicKey)(PROGRAM_IDS.metaplex)))[0];
}
exports.getStoreIndexer = getStoreIndexer;
async function getAuctionCache(auction) {
    const PROGRAM_IDS = (0, utils_1.programIds)();
    const store = PROGRAM_IDS.store;
    if (!store) {
        throw new Error('Store not initialized');
    }
    console.log('Auction', auction);
    return (await (0, utils_1.findProgramAddress)([
        Buffer.from(exports.METAPLEX_PREFIX),
        (0, utils_1.toPublicKey)(PROGRAM_IDS.metaplex).toBuffer(),
        (0, utils_1.toPublicKey)(store).toBuffer(),
        (0, utils_1.toPublicKey)(auction).toBuffer(),
        Buffer.from(exports.CACHE),
    ], (0, utils_1.toPublicKey)(PROGRAM_IDS.metaplex)))[0];
}
exports.getAuctionCache = getAuctionCache;
async function getPayoutTicket(auctionManager, winnerConfigIndex, winnerConfigItemIndex, creatorIndex, safetyDepositBox, recipient) {
    const PROGRAM_IDS = (0, utils_1.programIds)();
    return (await (0, utils_1.findProgramAddress)([
        Buffer.from(exports.METAPLEX_PREFIX),
        (0, utils_1.toPublicKey)(auctionManager).toBuffer(),
        Buffer.from(winnerConfigIndex !== null && winnerConfigIndex !== undefined
            ? winnerConfigIndex.toString()
            : 'participation'),
        Buffer.from(winnerConfigItemIndex !== null && winnerConfigItemIndex !== undefined
            ? winnerConfigItemIndex.toString()
            : '0'),
        Buffer.from(creatorIndex !== null && creatorIndex !== undefined
            ? creatorIndex.toString()
            : 'auctioneer'),
        (0, utils_1.toPublicKey)(safetyDepositBox).toBuffer(),
        (0, utils_1.toPublicKey)(recipient).toBuffer(),
    ], (0, utils_1.toPublicKey)(PROGRAM_IDS.metaplex)))[0];
}
exports.getPayoutTicket = getPayoutTicket;
//# sourceMappingURL=index.js.map