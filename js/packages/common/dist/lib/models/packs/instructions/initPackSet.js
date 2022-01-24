"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initPackSet = void 0;
const web3_js_1 = require("@solana/web3.js");
const borsh_1 = require("borsh");
const metaplex_1 = require("../../metaplex");
const utils_1 = require("../../../utils");
const __1 = require("../../..");
async function initPackSet({ name, description, uri, mutable, distributionType, allowedAmountToRedeem, redeemStartDate, redeemEndDate, packSetKey, authority, }) {
    const PROGRAM_IDS = (0, utils_1.programIds)();
    const value = new __1.InitPackSetArgs({
        name,
        description,
        uri,
        mutable,
        distributionType,
        allowedAmountToRedeem,
        redeemStartDate,
        redeemEndDate,
    });
    const store = PROGRAM_IDS.store;
    if (!store) {
        throw new Error('Store not initialized');
    }
    const whitelistedCreator = await (0, metaplex_1.getWhitelistedCreator)(authority);
    const data = Buffer.from((0, borsh_1.serialize)(__1.PACKS_SCHEMA, value));
    const keys = [
        {
            pubkey: (0, utils_1.toPublicKey)(packSetKey),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(authority),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(store),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: PROGRAM_IDS.oracle,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(web3_js_1.SYSVAR_RENT_PUBKEY),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(web3_js_1.SYSVAR_CLOCK_PUBKEY),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(whitelistedCreator),
            isSigner: false,
            isWritable: false,
        },
    ];
    return new web3_js_1.TransactionInstruction({
        keys,
        programId: (0, utils_1.toPublicKey)(PROGRAM_IDS.pack_create),
        data,
    });
}
exports.initPackSet = initPackSet;
//# sourceMappingURL=initPackSet.js.map