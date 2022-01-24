"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEPRECATED_SCHEMA = exports.getSafetyDepositBoxValidationTicket = exports.BidRedemptionTicketV1 = exports.AuctionManagerStateV1 = exports.WinningConfigStateItem = exports.WinningConfigState = exports.WinningConfigItem = exports.WinningConfig = exports.ParticipationConfigV1 = exports.ParticipationStateV1 = exports.AuctionManagerSettingsV1 = exports.DeprecatedValidateParticipationArgs = exports.DeprecatedPopulateParticipationPrintingAccountArgs = exports.DeprecatedRedeemParticipationBidArgs = exports.DeprecatedValidateSafetyDepositBoxV1Args = exports.DeprecatedInitAuctionManagerV1Args = exports.AuctionManagerV1 = exports.MAX_BID_REDEMPTION_TICKET_V1_SIZE = void 0;
const bn_js_1 = __importDefault(require("bn.js"));
const _1 = require(".");
const utils_1 = require("../../utils");
exports.MAX_BID_REDEMPTION_TICKET_V1_SIZE = 3;
class AuctionManagerV1 {
    constructor(args) {
        this.key = _1.MetaplexKey.AuctionManagerV1;
        this.store = args.store;
        this.authority = args.authority;
        this.auction = args.auction;
        this.vault = args.vault;
        this.acceptPayment = args.acceptPayment;
        this.state = args.state;
        this.settings = args.settings;
    }
}
exports.AuctionManagerV1 = AuctionManagerV1;
class DeprecatedInitAuctionManagerV1Args {
    constructor(args) {
        this.instruction = 0;
        this.settings = args.settings;
    }
}
exports.DeprecatedInitAuctionManagerV1Args = DeprecatedInitAuctionManagerV1Args;
class DeprecatedValidateSafetyDepositBoxV1Args {
    constructor() {
        this.instruction = 1;
    }
}
exports.DeprecatedValidateSafetyDepositBoxV1Args = DeprecatedValidateSafetyDepositBoxV1Args;
class DeprecatedRedeemParticipationBidArgs {
    constructor() {
        this.instruction = 4;
    }
}
exports.DeprecatedRedeemParticipationBidArgs = DeprecatedRedeemParticipationBidArgs;
class DeprecatedPopulateParticipationPrintingAccountArgs {
    constructor() {
        this.instruction = 11;
    }
}
exports.DeprecatedPopulateParticipationPrintingAccountArgs = DeprecatedPopulateParticipationPrintingAccountArgs;
class DeprecatedValidateParticipationArgs {
    constructor() {
        this.instruction = 10;
    }
}
exports.DeprecatedValidateParticipationArgs = DeprecatedValidateParticipationArgs;
class AuctionManagerSettingsV1 {
    constructor(args) {
        this.winningConfigs = [];
        this.participationConfig = null;
        Object.assign(this, args);
    }
}
exports.AuctionManagerSettingsV1 = AuctionManagerSettingsV1;
class ParticipationStateV1 {
    constructor(args) {
        this.collectedToAcceptPayment = new bn_js_1.default(0);
        this.primarySaleHappened = false;
        this.validated = false;
        this.printingAuthorizationTokenAccount = null;
        Object.assign(this, args);
    }
}
exports.ParticipationStateV1 = ParticipationStateV1;
class ParticipationConfigV1 {
    constructor(args) {
        this.winnerConstraint = _1.WinningConstraint.NoParticipationPrize;
        this.nonWinningConstraint = _1.NonWinningConstraint.GivenForFixedPrice;
        this.safetyDepositBoxIndex = 0;
        this.fixedPrice = new bn_js_1.default(0);
        Object.assign(this, args);
    }
}
exports.ParticipationConfigV1 = ParticipationConfigV1;
class WinningConfig {
    constructor(args) {
        this.items = [];
        Object.assign(this, args);
    }
}
exports.WinningConfig = WinningConfig;
class WinningConfigItem {
    constructor(args) {
        this.safetyDepositBoxIndex = 0;
        this.amount = 0;
        this.winningConfigType = _1.WinningConfigType.TokenOnlyTransfer;
        Object.assign(this, args);
    }
}
exports.WinningConfigItem = WinningConfigItem;
class WinningConfigState {
    constructor(args) {
        this.items = [];
        this.moneyPushedToAcceptPayment = false;
        Object.assign(this, args);
    }
}
exports.WinningConfigState = WinningConfigState;
class WinningConfigStateItem {
    constructor(args) {
        this.primarySaleHappened = false;
        this.claimed = false;
        Object.assign(this, args);
    }
}
exports.WinningConfigStateItem = WinningConfigStateItem;
class AuctionManagerStateV1 {
    constructor(args) {
        this.status = _1.AuctionManagerStatus.Initialized;
        this.winningConfigItemsValidated = 0;
        this.winningConfigStates = [];
        this.participationState = null;
        Object.assign(this, args);
    }
}
exports.AuctionManagerStateV1 = AuctionManagerStateV1;
class BidRedemptionTicketV1 {
    constructor(args) {
        this.key = _1.MetaplexKey.BidRedemptionTicketV1;
        this.participationRedeemed = false;
        this.itemsRedeemed = 0;
        Object.assign(this, args);
    }
    getBidRedeemed() {
        return this.participationRedeemed;
    }
}
exports.BidRedemptionTicketV1 = BidRedemptionTicketV1;
async function getSafetyDepositBoxValidationTicket(auctionManager, safetyDepositBox) {
    const PROGRAM_IDS = (0, utils_1.programIds)();
    return (await (0, utils_1.findProgramAddress)([
        Buffer.from(_1.METAPLEX_PREFIX),
        (0, utils_1.toPublicKey)(PROGRAM_IDS.metaplex).toBuffer(),
        (0, utils_1.toPublicKey)(auctionManager).toBuffer(),
        (0, utils_1.toPublicKey)(safetyDepositBox).toBuffer(),
    ], (0, utils_1.toPublicKey)(PROGRAM_IDS.metaplex)))[0];
}
exports.getSafetyDepositBoxValidationTicket = getSafetyDepositBoxValidationTicket;
exports.DEPRECATED_SCHEMA = new Map([
    [
        AuctionManagerV1,
        {
            kind: 'struct',
            fields: [
                ['key', 'u8'],
                ['store', 'pubkeyAsString'],
                ['authority', 'pubkeyAsString'],
                ['auction', 'pubkeyAsString'],
                ['vault', 'pubkeyAsString'],
                ['acceptPayment', 'pubkeyAsString'],
                ['state', AuctionManagerStateV1],
                ['settings', AuctionManagerSettingsV1],
            ],
        },
    ],
    [
        ParticipationConfigV1,
        {
            kind: 'struct',
            fields: [
                ['winnerConstraint', 'u8'],
                ['nonWinningConstraint', 'u8'],
                ['safetyDepositBoxIndex', 'u8'],
                ['fixedPrice', { kind: 'option', type: 'u64' }],
            ],
        },
    ],
    [
        AuctionManagerSettingsV1,
        {
            kind: 'struct',
            fields: [
                ['winningConfigs', [WinningConfig]],
                [
                    'participationConfig',
                    { kind: 'option', type: ParticipationConfigV1 },
                ],
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
                ['primarySaleHappened', 'u8'],
                ['claimed', 'u8'], // bool
            ],
        },
    ],
    [
        AuctionManagerStateV1,
        {
            kind: 'struct',
            fields: [
                ['status', 'u8'],
                ['winningConfigItemsValidated', 'u8'],
                ['winningConfigStates', [WinningConfigState]],
                ['participationState', { kind: 'option', type: ParticipationStateV1 }],
            ],
        },
    ],
    [
        ParticipationStateV1,
        {
            kind: 'struct',
            fields: [
                ['collectedToAcceptPayment', 'u64'],
                ['primarySaleHappened', 'u8'],
                ['validated', 'u8'],
                [
                    'printingAuthorizationTokenAccount',
                    { kind: 'option', type: 'pubkeyAsString' },
                ],
            ],
        },
    ],
    [
        BidRedemptionTicketV1,
        {
            kind: 'struct',
            fields: [
                ['key', 'u8'],
                ['participationRedeemed', 'u8'],
                ['itemsRedeemed', 'u8'], // bool
            ],
        },
    ],
    [
        DeprecatedPopulateParticipationPrintingAccountArgs,
        {
            kind: 'struct',
            fields: [['instruction', 'u8']],
        },
    ],
    [
        DeprecatedInitAuctionManagerV1Args,
        {
            kind: 'struct',
            fields: [
                ['instruction', 'u8'],
                ['settings', AuctionManagerSettingsV1],
            ],
        },
    ],
    [
        DeprecatedValidateSafetyDepositBoxV1Args,
        {
            kind: 'struct',
            fields: [['instruction', 'u8']],
        },
    ],
    [
        DeprecatedRedeemParticipationBidArgs,
        {
            kind: 'struct',
            fields: [['instruction', 'u8']],
        },
    ],
    [
        DeprecatedValidateParticipationArgs,
        {
            kind: 'struct',
            fields: [['instruction', 'u8']],
        },
    ],
]);
//# sourceMappingURL=deprecatedStates.js.map