"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPackSetByPubkey = exports.getPackSets = exports.decodePackSet = exports.PACK_SET_SCHEMA = exports.PackSet = void 0;
const web3_js_1 = require("@solana/web3.js");
const borsh_1 = require("borsh");
const __1 = require("..");
const __2 = require("../../..");
const web3_1 = require("../../../contexts/meta/web3");
class PackSet {
    constructor(args) {
        this.key = __1.PackKey.PackSet;
        this.key = __1.PackKey.PackSet;
        this.store = args.store;
        this.authority = args.authority;
        this.description = args.description.replace(/\0/g, '');
        this.uri = args.uri.replace(/\0/g, '');
        this.name = new TextDecoder().decode(args.name).replace(/\0/g, '');
        this.packCards = args.packCards;
        this.packVouchers = args.packVouchers;
        this.totalWeight = args.totalWeight;
        this.totalEditions = args.totalEditions;
        this.mutable = !!args.mutable;
        this.packState = args.packState;
        this.allowedAmountToRedeem = args.allowedAmountToRedeem;
        this.distributionType = args.distributionType;
        this.redeemStartDate = args.redeemStartDate;
        this.redeemEndDate = args.redeemEndDate;
        this.randomOracle = args.randomOracle;
    }
}
exports.PackSet = PackSet;
exports.PACK_SET_SCHEMA = new Map([
    [
        PackSet,
        {
            kind: 'struct',
            fields: [
                ['accountType', 'u8'],
                ['store', 'pubkeyAsString'],
                ['authority', 'pubkeyAsString'],
                ['description', 'string'],
                ['uri', 'string'],
                ['name', [32]],
                ['packCards', 'u32'],
                ['packVouchers', 'u32'],
                ['totalWeight', 'u64'],
                ['totalEditions', 'u64'],
                ['mutable', 'u8'],
                ['packState', 'u8'],
                ['distributionType', 'u8'],
                ['allowedAmountToRedeem', 'u32'],
                ['redeemStartDate', 'u64'],
                ['redeemEndDate', { kind: 'option', type: 'u64' }],
                ['randomOracle', 'pubkeyAsString'],
            ],
        },
    ],
]);
const decodePackSet = (buffer) => {
    return (0, borsh_1.deserializeUnchecked)(exports.PACK_SET_SCHEMA, PackSet, buffer);
};
exports.decodePackSet = decodePackSet;
const getPackSets = ({ connection, storeId, }) => {
    if (!storeId) {
        return Promise.resolve([]);
    }
    return (0, web3_1.getProgramAccounts)(connection, __2.PACK_CREATE_ID.toString(), {
        filters: [
            {
                dataSize: __1.MAX_PACK_SET_SIZE,
            },
            {
                memcmp: {
                    offset: 1,
                    bytes: storeId.toBase58(),
                },
            },
        ],
    });
};
exports.getPackSets = getPackSets;
const getPackSetByPubkey = async (connection, pubkey) => {
    const info = await connection.getAccountInfo(new web3_js_1.PublicKey(pubkey));
    if (!info) {
        throw new Error(`Unable to find account: ${pubkey}`);
    }
    return {
        pubkey,
        account: info,
    };
};
exports.getPackSetByPubkey = getPackSetByPubkey;
//# sourceMappingURL=PackSet.js.map