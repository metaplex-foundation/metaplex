"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.claimPack = void 0;
const web3_js_1 = require("@solana/web3.js");
const borsh_1 = require("borsh");
const utils_1 = require("../../../utils");
const __1 = require("../../..");
const find_1 = require("../find");
async function claimPack({ index, packSetKey, wallet, voucherMint, userToken, newMint, metadataMint, edition, randomOracle, }) {
    const PROGRAM_IDS = (0, utils_1.programIds)();
    const value = new __1.ClaimPackArgs({ index });
    const provingProcess = await (0, find_1.findProvingProcessProgramAddress)((0, utils_1.toPublicKey)(packSetKey), wallet, (0, utils_1.toPublicKey)(voucherMint));
    const packCard = await (0, find_1.findPackCardProgramAddress)((0, utils_1.toPublicKey)(packSetKey), index);
    const newMetadata = await (0, __1.getMetadata)(newMint);
    const metadata = await (0, __1.getMetadata)(metadataMint);
    const newEdition = await (0, __1.getEdition)(newMint);
    const masterEdition = await (0, __1.getEdition)(metadataMint);
    const editionMarkPda = await (0, __1.getEditionMarkPda)(metadataMint, edition);
    const programAuthority = await (0, find_1.getProgramAuthority)();
    const data = Buffer.from((0, borsh_1.serialize)(__1.PACKS_SCHEMA, value));
    const keys = [
        // pack_set
        {
            pubkey: (0, utils_1.toPublicKey)(packSetKey),
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
        // program_authority
        {
            pubkey: (0, utils_1.toPublicKey)(programAuthority),
            isSigner: false,
            isWritable: false,
        },
        // pack_card
        {
            pubkey: (0, utils_1.toPublicKey)(packCard),
            isSigner: false,
            isWritable: true,
        },
        // user_token_acc
        {
            pubkey: (0, utils_1.toPublicKey)(userToken),
            isSigner: false,
            isWritable: true,
        },
        // new_metadata_acc
        {
            pubkey: (0, utils_1.toPublicKey)(newMetadata),
            isSigner: false,
            isWritable: true,
        },
        // new_edition_acc
        {
            pubkey: (0, utils_1.toPublicKey)(newEdition),
            isSigner: false,
            isWritable: true,
        },
        // master_edition_acc
        {
            pubkey: (0, utils_1.toPublicKey)(masterEdition),
            isSigner: false,
            isWritable: true,
        },
        // new_mint_account
        {
            pubkey: (0, utils_1.toPublicKey)(newMint),
            isSigner: false,
            isWritable: true,
        },
        // new_mint_authority_acc
        {
            pubkey: wallet,
            isSigner: true,
            isWritable: true,
        },
        // metadata_acc
        {
            pubkey: (0, utils_1.toPublicKey)(metadata),
            isSigner: false,
            isWritable: true,
        },
        // metadata_mint_acc
        {
            pubkey: (0, utils_1.toPublicKey)(metadataMint),
            isSigner: false,
            isWritable: true,
        },
        // edition_mark
        {
            pubkey: (0, utils_1.toPublicKey)(editionMarkPda),
            isSigner: false,
            isWritable: true,
        },
        // rent
        {
            pubkey: (0, utils_1.toPublicKey)(web3_js_1.SYSVAR_RENT_PUBKEY),
            isSigner: false,
            isWritable: false,
        },
        // randomness_oracle
        {
            pubkey: (0, utils_1.toPublicKey)(randomOracle),
            isSigner: false,
            isWritable: false,
        },
        // metaplex_token_metadata
        {
            pubkey: (0, utils_1.toPublicKey)((0, utils_1.programIds)().metadata),
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
    return new web3_js_1.TransactionInstruction({
        keys,
        programId: (0, utils_1.toPublicKey)(PROGRAM_IDS.pack_create),
        data,
    });
}
exports.claimPack = claimPack;
//# sourceMappingURL=claimPack.js.map