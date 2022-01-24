"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addVoucherToPack = void 0;
const web3_js_1 = require("@solana/web3.js");
const borsh_1 = require("borsh");
const __1 = require("../../..");
const utils_1 = require("../../../utils");
const find_1 = require("../find");
async function addVoucherToPack({ index, packSetKey, authority, mint, tokenAccount, }) {
    const PROGRAM_IDS = (0, utils_1.programIds)();
    const value = new __1.AddVoucherToPackArgs();
    const masterMetadataKey = await (0, __1.getMetadata)(mint);
    const masterEdition = await (0, __1.getEdition)(mint);
    const packVoucher = await (0, find_1.findPackVoucherProgramAddress)(packSetKey, index);
    const { pubkey: sourceKey } = tokenAccount;
    const store = PROGRAM_IDS.store;
    if (!store) {
        throw new Error('Store not initialized');
    }
    const data = Buffer.from((0, borsh_1.serialize)(__1.PACKS_SCHEMA, value));
    const keys = [
        // pack_set
        {
            pubkey: (0, utils_1.toPublicKey)(packSetKey),
            isSigner: false,
            isWritable: true,
        },
        // pack_voucher
        {
            pubkey: (0, utils_1.toPublicKey)(packVoucher),
            isSigner: false,
            isWritable: true,
        },
        // signer authority
        {
            pubkey: (0, utils_1.toPublicKey)(authority),
            isSigner: true,
            isWritable: true,
        },
        // voucher_owner
        {
            pubkey: (0, utils_1.toPublicKey)(authority),
            isSigner: true,
            isWritable: false,
        },
        // master_edition
        {
            pubkey: (0, utils_1.toPublicKey)(masterEdition),
            isSigner: false,
            isWritable: false,
        },
        // master_metadata
        {
            pubkey: (0, utils_1.toPublicKey)(masterMetadataKey),
            isSigner: false,
            isWritable: false,
        },
        // mint
        {
            pubkey: (0, utils_1.toPublicKey)(mint),
            isSigner: false,
            isWritable: false,
        },
        // source
        {
            pubkey: (0, utils_1.toPublicKey)(sourceKey),
            isSigner: false,
            isWritable: true,
        },
        // store
        {
            pubkey: (0, utils_1.toPublicKey)(store),
            isSigner: false,
            isWritable: false,
        },
        // rent
        {
            pubkey: (0, utils_1.toPublicKey)(web3_js_1.SYSVAR_RENT_PUBKEY),
            isSigner: false,
            isWritable: false,
        },
        // system_program
        {
            pubkey: web3_js_1.SystemProgram.programId,
            isSigner: false,
            isWritable: false,
        },
        // spl_token program
        {
            pubkey: (0, utils_1.programIds)().token,
            isSigner: false,
            isWritable: false,
        },
    ];
    return new web3_js_1.TransactionInstruction({
        keys,
        programId: (0, utils_1.toPublicKey)(PROGRAM_IDS.pack_create),
        data,
    });
}
exports.addVoucherToPack = addVoucherToPack;
//# sourceMappingURL=addVoucherToPack.js.map