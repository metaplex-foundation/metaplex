"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setStoreIndex = void 0;
const web3_js_1 = require("@solana/web3.js");
const borsh_1 = require("borsh");
const _1 = require(".");
const utils_1 = require("../../utils");
async function setStoreIndex(storeIndex, auctionCache, payer, page, offset, instructions, belowCache, aboveCache) {
    const PROGRAM_IDS = (0, utils_1.programIds)();
    const store = PROGRAM_IDS.store;
    if (!store) {
        throw new Error('Store not initialized');
    }
    const value = new _1.SetStoreIndexArgs({ page, offset });
    const data = Buffer.from((0, borsh_1.serialize)(_1.SCHEMA, value));
    const keys = [
        {
            pubkey: (0, utils_1.toPublicKey)(storeIndex),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(payer),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(auctionCache),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(store),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: PROGRAM_IDS.system,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: web3_js_1.SYSVAR_RENT_PUBKEY,
            isSigner: false,
            isWritable: false,
        },
    ];
    if (aboveCache) {
        keys.push({
            pubkey: (0, utils_1.toPublicKey)(aboveCache),
            isSigner: false,
            isWritable: false,
        });
    }
    if (belowCache) {
        keys.push({
            pubkey: (0, utils_1.toPublicKey)(belowCache),
            isSigner: false,
            isWritable: false,
        });
    }
    instructions.push(new web3_js_1.TransactionInstruction({
        keys,
        programId: (0, utils_1.toPublicKey)(PROGRAM_IDS.metaplex),
        data,
    }));
}
exports.setStoreIndex = setStoreIndex;
//# sourceMappingURL=setStoreIndex.js.map