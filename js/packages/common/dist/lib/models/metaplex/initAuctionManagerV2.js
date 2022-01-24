"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initAuctionManagerV2 = void 0;
const web3_js_1 = require("@solana/web3.js");
const borsh_1 = require("borsh");
const _1 = require(".");
const utils_1 = require("../../utils");
async function initAuctionManagerV2(vault, auctionManagerAuthority, payer, acceptPaymentAccount, store, amountType, lengthType, maxRanges, instructions) {
    const PROGRAM_IDS = (0, utils_1.programIds)();
    const { auctionKey, auctionManagerKey } = await (0, _1.getAuctionKeys)(vault);
    const value = new _1.InitAuctionManagerV2Args({
        amountType,
        lengthType,
        maxRanges,
    });
    const tokenTracker = await (0, _1.getAuctionWinnerTokenTypeTracker)(auctionManagerKey);
    const data = Buffer.from((0, borsh_1.serialize)(_1.SCHEMA, value));
    const keys = [
        {
            pubkey: (0, utils_1.toPublicKey)(auctionManagerKey),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(tokenTracker),
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
exports.initAuctionManagerV2 = initAuctionManagerV2;
//# sourceMappingURL=initAuctionManagerV2.js.map