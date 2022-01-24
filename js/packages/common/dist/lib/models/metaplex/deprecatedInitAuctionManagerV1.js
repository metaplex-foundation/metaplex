"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deprecatedInitAuctionManagerV1 = void 0;
const web3_js_1 = require("@solana/web3.js");
const borsh_1 = require("borsh");
const _1 = require(".");
const utils_1 = require("../../utils");
const deprecatedStates_1 = require("./deprecatedStates");
async function deprecatedInitAuctionManagerV1(vault, auctionManagerAuthority, payer, acceptPaymentAccount, store, settings, instructions) {
    const PROGRAM_IDS = (0, utils_1.programIds)();
    const { auctionKey, auctionManagerKey } = await (0, _1.getAuctionKeys)(vault);
    const value = new deprecatedStates_1.DeprecatedInitAuctionManagerV1Args({
        settings,
    });
    const data = Buffer.from((0, borsh_1.serialize)(_1.SCHEMA, value));
    const keys = [
        {
            pubkey: (0, utils_1.toPublicKey)(auctionManagerKey),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(vault),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(auctionKey),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(auctionManagerAuthority),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(payer),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(acceptPaymentAccount),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(store),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: web3_js_1.SystemProgram.programId,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: web3_js_1.SYSVAR_RENT_PUBKEY,
            isSigner: false,
            isWritable: false,
        },
    ];
    instructions.push(new web3_js_1.TransactionInstruction({
        keys,
        programId: (0, utils_1.toPublicKey)(PROGRAM_IDS.metaplex),
        data,
    }));
}
exports.deprecatedInitAuctionManagerV1 = deprecatedInitAuctionManagerV1;
//# sourceMappingURL=deprecatedInitAuctionManagerV1.js.map