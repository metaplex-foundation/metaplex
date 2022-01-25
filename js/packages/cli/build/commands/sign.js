"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signMetadataInstruction = exports.signMetadata = void 0;
const web3_js_1 = require("@solana/web3.js");
const constants_1 = require("../helpers/constants");
const transactions_1 = require("../helpers/transactions");
const accounts_1 = require("../helpers/accounts");
const METADATA_SIGNATURE = Buffer.from([7]); //now thats some voodoo magic. WTF metaplex? XD
async function signMetadata(metadata, keypair, env, rpcUrl) {
    const creatorKeyPair = (0, accounts_1.loadWalletKey)(keypair);
    const anchorProgram = await (0, accounts_1.loadCandyProgram)(creatorKeyPair, env, rpcUrl);
    await signWithRetry(anchorProgram, creatorKeyPair, new web3_js_1.PublicKey(metadata));
}
exports.signMetadata = signMetadata;
async function signWithRetry(anchorProgram, creatorKeyPair, metadataAddress) {
    await (0, transactions_1.sendTransactionWithRetryWithKeypair)(anchorProgram.provider.connection, creatorKeyPair, [
        signMetadataInstruction(new web3_js_1.PublicKey(metadataAddress), creatorKeyPair.publicKey),
    ], [], 'single');
}
function signMetadataInstruction(metadata, creator) {
    const data = METADATA_SIGNATURE;
    const keys = [
        {
            pubkey: metadata,
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: creator,
            isSigner: true,
            isWritable: false,
        },
    ];
    return new web3_js_1.TransactionInstruction({
        keys,
        programId: constants_1.TOKEN_METADATA_PROGRAM_ID,
        data,
    });
}
exports.signMetadataInstruction = signMetadataInstruction;
