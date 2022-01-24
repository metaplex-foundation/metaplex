"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestCardToRedeem = void 0;
const web3_js_1 = require("@solana/web3.js");
const borsh_1 = require("borsh");
const utils_1 = require("../../../utils");
const __1 = require("../../..");
const find_1 = require("../find");
async function requestCardToRedeem({ index, packSetKey, editionKey, editionMint, voucherKey, tokenAccount, wallet, randomOracle, }) {
    const PROGRAM_IDS = (0, utils_1.programIds)();
    const value = new __1.RequestCardToRedeemArgs({
        index,
    });
    const store = PROGRAM_IDS.store;
    if (!store) {
        throw new Error('Store not initialized');
    }
    const provingProcess = await (0, find_1.findProvingProcessProgramAddress)(packSetKey, wallet, (0, utils_1.toPublicKey)(editionMint));
    const packConfig = await (0, find_1.findPackConfigProgramAddress)(packSetKey);
    const data = Buffer.from((0, borsh_1.serialize)(__1.PACKS_SCHEMA, value));
    const keys = [
        // pack_set
        {
            pubkey: (0, utils_1.toPublicKey)(packSetKey),
            isSigner: false,
            isWritable: false,
        },
        // pack_config
        {
            pubkey: (0, utils_1.toPublicKey)(packConfig),
            isSigner: false,
            isWritable: true,
        },
        // store
        {
            pubkey: (0, utils_1.toPublicKey)(store),
            isSigner: false,
            isWritable: false,
        },
        // edition
        {
            pubkey: (0, utils_1.toPublicKey)(editionKey),
            isSigner: false,
            isWritable: false,
        },
        // edition_mint
        {
            pubkey: (0, utils_1.toPublicKey)(editionMint),
            isSigner: false,
            isWritable: true,
        },
        // pack_voucher
        {
            pubkey: (0, utils_1.toPublicKey)(voucherKey),
            isSigner: false,
            isWritable: false,
        },
        // proving_process
        {
            pubkey: (0, utils_1.toPublicKey)(provingProcess),
            isSigner: false,
            isWritable: true,
        },
        // user_wallet
        {
            pubkey: wallet,
            isSigner: true,
            isWritable: true,
        },
        // randomness_oracle
        {
            pubkey: (0, utils_1.toPublicKey)(randomOracle),
            isSigner: false,
            isWritable: false,
        },
        // clock
        {
            pubkey: (0, utils_1.toPublicKey)(web3_js_1.SYSVAR_CLOCK_PUBKEY),
            isSigner: false,
            isWritable: false,
        },
        // rent
        {
            pubkey: (0, utils_1.toPublicKey)(web3_js_1.SYSVAR_RENT_PUBKEY),
            isSigner: false,
            isWritable: false,
        },
        // spl_token program
        {
            pubkey: (0, utils_1.programIds)().token,
            isSigner: false,
            isWritable: false,
        },
        // system_program
        {
            pubkey: web3_js_1.SystemProgram.programId,
            isSigner: false,
            isWritable: false,
        },
    ];
    if (tokenAccount) {
        // user_token_account
        keys.push({
            pubkey: (0, utils_1.toPublicKey)(tokenAccount),
            isSigner: false,
            isWritable: true,
        });
    }
    return new web3_js_1.TransactionInstruction({
        keys,
        programId: (0, utils_1.toPublicKey)(PROGRAM_IDS.pack_create),
        data,
    });
}
exports.requestCardToRedeem = requestCardToRedeem;
//# sourceMappingURL=requestCardToRedeem.js.map