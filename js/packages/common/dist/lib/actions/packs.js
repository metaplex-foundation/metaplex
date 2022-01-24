"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PACKS_SCHEMA = exports.CleanUpArgs = exports.RequestCardToRedeemArgs = exports.ClaimPackArgs = exports.ActivatePackArgs = exports.AddVoucherToPackArgs = exports.AddCardToPackArgs = exports.InitPackSetArgs = void 0;
class InitPackSetArgs {
    constructor(args) {
        this.instruction = 0;
        this.name = args.name;
        this.description = args.description;
        this.uri = args.uri;
        this.mutable = args.mutable;
        this.distributionType = args.distributionType;
        this.allowedAmountToRedeem = args.allowedAmountToRedeem;
        this.redeemStartDate = args.redeemStartDate;
        this.redeemEndDate = args.redeemEndDate;
    }
}
exports.InitPackSetArgs = InitPackSetArgs;
class AddCardToPackArgs {
    constructor(args) {
        this.instruction = 1;
        this.maxSupply = args.maxSupply;
        this.weight = args.weight;
        this.index = args.index;
    }
}
exports.AddCardToPackArgs = AddCardToPackArgs;
class AddVoucherToPackArgs {
    constructor() {
        this.instruction = 2;
    }
}
exports.AddVoucherToPackArgs = AddVoucherToPackArgs;
class ActivatePackArgs {
    constructor() {
        this.instruction = 3;
    }
}
exports.ActivatePackArgs = ActivatePackArgs;
class ClaimPackArgs {
    constructor(args) {
        this.instruction = 6;
        this.index = args.index;
    }
}
exports.ClaimPackArgs = ClaimPackArgs;
class RequestCardToRedeemArgs {
    constructor(args) {
        this.instruction = 12;
        this.index = args.index;
    }
}
exports.RequestCardToRedeemArgs = RequestCardToRedeemArgs;
class CleanUpArgs {
    constructor() {
        this.instruction = 13;
    }
}
exports.CleanUpArgs = CleanUpArgs;
exports.PACKS_SCHEMA = new Map([
    [
        InitPackSetArgs,
        {
            kind: 'struct',
            fields: [
                ['instruction', 'u8'],
                ['name', [32]],
                ['description', 'string'],
                ['uri', 'string'],
                ['mutable', 'u8'],
                ['distributionType', 'u8'],
                ['allowedAmountToRedeem', 'u32'],
                ['redeemStartDate', { kind: 'option', type: 'u64' }],
                ['redeemEndDate', { kind: 'option', type: 'u64' }],
            ],
        },
    ],
    [
        AddCardToPackArgs,
        {
            kind: 'struct',
            fields: [
                ['instruction', 'u8'],
                ['maxSupply', 'u32'],
                ['weight', 'u16'],
                ['index', 'u32'],
            ],
        },
    ],
    [
        AddVoucherToPackArgs,
        {
            kind: 'struct',
            fields: [['instruction', 'u8']],
        },
    ],
    [
        ActivatePackArgs,
        {
            kind: 'struct',
            fields: [['instruction', 'u8']],
        },
    ],
    [
        ClaimPackArgs,
        {
            kind: 'struct',
            fields: [
                ['instruction', 'u8'],
                ['index', 'u32'],
            ],
        },
    ],
    [
        RequestCardToRedeemArgs,
        {
            kind: 'struct',
            fields: [
                ['instruction', 'u8'],
                ['index', 'u32'],
            ],
        },
    ],
    [
        CleanUpArgs,
        {
            kind: 'struct',
            fields: [['instruction', 'u8']],
        },
    ],
]);
//# sourceMappingURL=packs.js.map