"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.claimBid = void 0;
const web3_js_1 = require("@solana/web3.js");
const borsh_1 = require("borsh");
const _1 = require(".");
const actions_1 = require("../../actions");
const utils_1 = require("../../utils");
async function claimBid(acceptPayment, bidder, bidderPotToken, vault, tokenMint, instructions) {
    const PROGRAM_IDS = (0, utils_1.programIds)();
    const store = PROGRAM_IDS.store;
    if (!store) {
        throw new Error('Store not initialized');
    }
    const { auctionKey, auctionManagerKey } = await (0, _1.getAuctionKeys)(vault);
    const bidderPotKey = await (0, actions_1.getBidderPotKey)({
        auctionProgramId: PROGRAM_IDS.auction,
        auctionKey,
        bidderPubkey: bidder,
    });
    const value = new _1.ClaimBidArgs();
    const data = Buffer.from((0, borsh_1.serialize)(_1.SCHEMA, value));
    const auctionExtendedKey = await (0, actions_1.getAuctionExtended)({
        auctionProgramId: PROGRAM_IDS.auction,
        resource: vault,
    });
    const keys = [
        {
            pubkey: (0, utils_1.toPublicKey)(acceptPayment),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(bidderPotToken),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(bidderPotKey),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(auctionManagerKey),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(auctionKey),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(bidder),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(tokenMint),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(vault),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(store),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(PROGRAM_IDS.auction),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: web3_js_1.SYSVAR_CLOCK_PUBKEY,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: PROGRAM_IDS.token,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(auctionExtendedKey),
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
exports.claimBid = claimBid;
//# sourceMappingURL=claimBid.js.map