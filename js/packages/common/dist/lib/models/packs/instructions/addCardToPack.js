"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addCardToPack = void 0;
const web3_js_1 = require("@solana/web3.js");
const borsh_1 = require("borsh");
const __1 = require("../../..");
const utils_1 = require("../../../utils");
const packs_1 = require("../../../actions/packs");
const find_1 = require("../find");
async function addCardToPack({ maxSupply, weight, index, packSetKey, authority, mint, tokenAccount, toAccount, }) {
    const PROGRAM_IDS = (0, utils_1.programIds)();
    const value = new packs_1.AddCardToPackArgs({
        maxSupply,
        weight,
        index,
    });
    const store = PROGRAM_IDS.store;
    if (!store) {
        throw new Error('Store not initialized');
    }
    const masterMetadataKey = await (0, __1.getMetadata)(mint);
    const masterEdition = await (0, __1.getEdition)(mint);
    const programAuthority = await (0, find_1.getProgramAuthority)();
    const packCard = await (0, find_1.findPackCardProgramAddress)(packSetKey, index);
    const packConfig = await (0, find_1.findPackConfigProgramAddress)(packSetKey);
    const { pubkey: sourceKey } = tokenAccount;
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
        // pack_card
        {
            pubkey: (0, utils_1.toPublicKey)(packCard),
            isSigner: false,
            isWritable: true,
        },
        // signer authority
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
        // token_account
        {
            pubkey: (0, utils_1.toPublicKey)(toAccount.publicKey),
            isSigner: false,
            isWritable: true,
        },
        // program_authority
        {
            pubkey: (0, utils_1.toPublicKey)(programAuthority),
            isSigner: false,
            isWritable: false,
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
exports.addCardToPack = addCardToPack;
//# sourceMappingURL=addCardToPack.js.map