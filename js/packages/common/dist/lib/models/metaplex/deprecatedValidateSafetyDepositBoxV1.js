"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deprecatedValidateSafetyDepositBoxV1 = void 0;
const web3_js_1 = require("@solana/web3.js");
const borsh_1 = require("borsh");
const _1 = require(".");
const utils_1 = require("../../utils");
const deprecatedStates_1 = require("./deprecatedStates");
async function deprecatedValidateSafetyDepositBoxV1(vault, metadata, safetyDepositBox, safetyDepositTokenStore, tokenMint, auctionManagerAuthority, metadataAuthority, payer, instructions, edition, whitelistedCreator, store, printingMint, printingMintAuthority) {
    const PROGRAM_IDS = (0, utils_1.programIds)();
    const { auctionKey, auctionManagerKey } = await (0, _1.getAuctionKeys)(vault);
    const originalAuthorityLookup = await (0, _1.getOriginalAuthority)(auctionKey, metadata);
    const value = new deprecatedStates_1.DeprecatedValidateSafetyDepositBoxV1Args();
    const data = Buffer.from((0, borsh_1.serialize)(_1.SCHEMA, value));
    const keys = [
        {
            pubkey: (0, utils_1.toPublicKey)(await (0, deprecatedStates_1.getSafetyDepositBoxValidationTicket)(auctionManagerKey, safetyDepositBox)),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(auctionManagerKey),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(metadata),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(originalAuthorityLookup),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(whitelistedCreator || web3_js_1.SystemProgram.programId),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(store),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(safetyDepositBox),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(safetyDepositTokenStore),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(tokenMint),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(edition),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(vault),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(auctionManagerAuthority),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(metadataAuthority),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(payer),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(PROGRAM_IDS.metadata),
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
    if (printingMint && printingMintAuthority) {
        keys.push({
            pubkey: (0, utils_1.toPublicKey)(printingMint),
            isSigner: false,
            isWritable: true,
        });
        keys.push({
            pubkey: (0, utils_1.toPublicKey)(printingMintAuthority),
            isSigner: true,
            isWritable: false,
        });
    }
    instructions.push(new web3_js_1.TransactionInstruction({
        keys,
        programId: (0, utils_1.toPublicKey)(PROGRAM_IDS.metaplex),
        data,
    }));
}
exports.deprecatedValidateSafetyDepositBoxV1 = deprecatedValidateSafetyDepositBoxV1;
//# sourceMappingURL=deprecatedValidateSafetyDepositBoxV1.js.map