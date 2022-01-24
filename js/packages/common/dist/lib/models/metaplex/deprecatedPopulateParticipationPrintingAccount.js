"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deprecatedPopulateParticipationPrintingAccount = void 0;
const web3_js_1 = require("@solana/web3.js");
const borsh_1 = require("borsh");
const _1 = require(".");
const actions_1 = require("../../actions");
const utils_1 = require("../../utils");
const deprecatedStates_1 = require("./deprecatedStates");
async function deprecatedPopulateParticipationPrintingAccount(vault, auctionManager, auction, safetyDepositTokenStore, transientOneTimeAccount, printingTokenAccount, safetyDeposit, fractionMint, printingMint, oneTimePrintingAuthorizationMint, masterEdition, metadata, payer, instructions) {
    const PROGRAM_IDS = (0, utils_1.programIds)();
    const store = PROGRAM_IDS.store;
    if (!store) {
        throw new Error('Store not initialized');
    }
    const transferAuthority = (await (0, utils_1.findProgramAddress)([
        Buffer.from(actions_1.VAULT_PREFIX),
        (0, utils_1.toPublicKey)(PROGRAM_IDS.vault).toBuffer(),
        (0, utils_1.toPublicKey)(vault).toBuffer(),
    ], (0, utils_1.toPublicKey)(PROGRAM_IDS.vault)))[0];
    const value = new deprecatedStates_1.DeprecatedPopulateParticipationPrintingAccountArgs();
    const data = Buffer.from((0, borsh_1.serialize)(_1.SCHEMA, value));
    const keys = [
        {
            pubkey: (0, utils_1.toPublicKey)(safetyDepositTokenStore),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(transientOneTimeAccount),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(printingTokenAccount),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(oneTimePrintingAuthorizationMint),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(printingMint),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(safetyDeposit),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(vault),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(fractionMint),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(auction),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(await (0, actions_1.getAuctionExtended)({
                auctionProgramId: PROGRAM_IDS.auction,
                resource: vault,
            })),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(auctionManager),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: PROGRAM_IDS.token,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(PROGRAM_IDS.vault),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(PROGRAM_IDS.metadata),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: store,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(masterEdition),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(metadata),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(transferAuthority),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(payer),
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
exports.deprecatedPopulateParticipationPrintingAccount = deprecatedPopulateParticipationPrintingAccount;
//# sourceMappingURL=deprecatedPopulateParticipationPrintingAccount.js.map