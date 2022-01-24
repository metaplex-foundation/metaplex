"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deprecatedValidateParticipation = void 0;
const web3_js_1 = require("@solana/web3.js");
const borsh_1 = require("borsh");
const _1 = require(".");
const utils_1 = require("../../utils");
const deprecatedStates_1 = require("./deprecatedStates");
async function deprecatedValidateParticipation(auctionManager, openEditionMetadata, openEditionMasterAccount, printingAuthorizationHoldingAccount, auctionManagerAuthority, whitelistedCreatorEntry, store, safetyDepositBox, safetyDepositBoxTokenStore, vault, instructions) {
    const PROGRAM_IDS = (0, utils_1.programIds)();
    const value = new deprecatedStates_1.DeprecatedValidateParticipationArgs();
    const data = Buffer.from((0, borsh_1.serialize)(_1.SCHEMA, value));
    const keys = [
        {
            pubkey: (0, utils_1.toPublicKey)(auctionManager),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(openEditionMetadata),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(openEditionMasterAccount),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(printingAuthorizationHoldingAccount),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(auctionManagerAuthority),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(whitelistedCreatorEntry || web3_js_1.SystemProgram.programId),
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
            pubkey: (0, utils_1.toPublicKey)(safetyDepositBoxTokenStore),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(vault),
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
exports.deprecatedValidateParticipation = deprecatedValidateParticipation;
//# sourceMappingURL=deprecatedValidateParticipation.js.map