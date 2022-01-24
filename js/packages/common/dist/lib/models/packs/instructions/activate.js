"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const web3_js_1 = require("@solana/web3.js");
const borsh_1 = require("borsh");
const utils_1 = require("../../../utils");
const packs_1 = require("../../../actions/packs");
async function activate({ packSetKey, authority, }) {
    const PROGRAM_IDS = (0, utils_1.programIds)();
    const value = new packs_1.ActivatePackArgs();
    const data = Buffer.from((0, borsh_1.serialize)(packs_1.PACKS_SCHEMA, value));
    const keys = [
        // pack_set
        {
            pubkey: (0, utils_1.toPublicKey)(packSetKey),
            isSigner: false,
            isWritable: true,
        },
        // signer authority
        {
            pubkey: (0, utils_1.toPublicKey)(authority),
            isSigner: true,
            isWritable: false,
        },
    ];
    return new web3_js_1.TransactionInstruction({
        keys,
        programId: (0, utils_1.toPublicKey)(PROGRAM_IDS.pack_create),
        data,
    });
}
exports.activate = activate;
//# sourceMappingURL=activate.js.map