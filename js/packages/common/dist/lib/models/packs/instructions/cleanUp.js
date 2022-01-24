"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanUp = void 0;
const web3_js_1 = require("@solana/web3.js");
const borsh_1 = require("borsh");
const utils_1 = require("../../../utils");
const packs_1 = require("../../../actions/packs");
const find_1 = require("../find");
async function cleanUp(packSetKey) {
    const PROGRAM_IDS = (0, utils_1.programIds)();
    const value = new packs_1.CleanUpArgs();
    const store = PROGRAM_IDS.store;
    if (!store) {
        throw new Error('Store not initialized');
    }
    const packConfig = await (0, find_1.findPackConfigProgramAddress)(packSetKey);
    const data = Buffer.from((0, borsh_1.serialize)(packs_1.PACKS_SCHEMA, value));
    const keys = [
        // pack_set
        {
            pubkey: (0, utils_1.toPublicKey)(packSetKey),
            isSigner: false,
            isWritable: true,
        },
        // pack_config
        {
            pubkey: (0, utils_1.toPublicKey)(packConfig),
            isSigner: false,
            isWritable: true,
        },
    ];
    return new web3_js_1.TransactionInstruction({
        keys,
        programId: (0, utils_1.toPublicKey)(PROGRAM_IDS.pack_create),
        data,
    });
}
exports.cleanUp = cleanUp;
//# sourceMappingURL=cleanUp.js.map