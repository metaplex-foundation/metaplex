"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.arweaveUpload = void 0;
const anchor = __importStar(require("@project-serum/anchor"));
const form_data_1 = __importDefault(require("form-data"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const loglevel_1 = __importDefault(require("loglevel"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const promises_1 = require("fs/promises");
const arweave_cost_1 = require("@metaplex/arweave-cost");
const constants_1 = require("../constants");
const transactions_1 = require("../transactions");
const ARWEAVE_UPLOAD_ENDPOINT = 'https://us-central1-metaplex-studios.cloudfunctions.net/uploadFile';
async function fetchAssetCostToStore(fileSizes) {
    const result = await (0, arweave_cost_1.calculate)(fileSizes);
    loglevel_1.default.debug('Arweave cost estimates:', result);
    return result.solana * anchor.web3.LAMPORTS_PER_SOL;
}
async function upload(data, manifest, index) {
    loglevel_1.default.debug(`trying to upload image ${index}: ${manifest.name}`);
    return await (await (0, node_fetch_1.default)(ARWEAVE_UPLOAD_ENDPOINT, {
        method: 'POST',
        // @ts-ignore
        body: data,
    })).json();
}
function estimateManifestSize(filenames) {
    const paths = {};
    for (const name of filenames) {
        paths[name] = {
            id: 'artestaC_testsEaEmAGFtestEGtestmMGmgMGAV438',
            ext: path_1.default.extname(name).replace('.', ''),
        };
    }
    const manifest = {
        manifest: 'arweave/paths',
        version: '0.1.0',
        paths,
        index: {
            path: 'metadata.json',
        },
    };
    const data = Buffer.from(JSON.stringify(manifest), 'utf8');
    loglevel_1.default.debug('Estimated manifest size:', data.length);
    return data.length;
}
async function arweaveUpload(walletKeyPair, anchorProgram, env, image, manifestBuffer, // TODO rename metadataBuffer
manifest, // TODO rename metadata
index) {
    var _a, _b;
    const imageExt = path_1.default.extname(image);
    const fsStat = await (0, promises_1.stat)(image);
    const estimatedManifestSize = estimateManifestSize([
        `${index}${imageExt}`,
        'metadata.json',
    ]);
    const storageCost = await fetchAssetCostToStore([
        fsStat.size,
        manifestBuffer.length,
        estimatedManifestSize,
    ]);
    loglevel_1.default.debug(`lamport cost to store ${image}: ${storageCost}`);
    const instructions = [
        anchor.web3.SystemProgram.transfer({
            fromPubkey: walletKeyPair.publicKey,
            toPubkey: constants_1.ARWEAVE_PAYMENT_WALLET,
            lamports: storageCost,
        }),
    ];
    const tx = await (0, transactions_1.sendTransactionWithRetryWithKeypair)(anchorProgram.provider.connection, walletKeyPair, instructions, [], 'confirmed');
    loglevel_1.default.debug(`solana transaction (${env}) for arweave payment:`, tx);
    const data = new form_data_1.default();
    data.append('transaction', tx['txid']);
    data.append('env', env);
    data.append('file[]', fs_1.default.createReadStream(image), {
        filename: `${index}${imageExt}`,
        contentType: `image/${imageExt.replace('.', '')}`,
    });
    data.append('file[]', manifestBuffer, 'metadata.json');
    const result = await upload(data, manifest, index);
    const metadataFile = (_a = result.messages) === null || _a === void 0 ? void 0 : _a.find(m => m.filename === 'manifest.json');
    const imageFile = (_b = result.messages) === null || _b === void 0 ? void 0 : _b.find(m => m.filename === `${index}${imageExt}`);
    if (metadataFile === null || metadataFile === void 0 ? void 0 : metadataFile.transactionId) {
        const link = `https://arweave.net/${metadataFile.transactionId}`;
        const imageLink = `https://arweave.net/${imageFile.transactionId}?ext=${imageExt.replace('.', '')}`;
        loglevel_1.default.debug(`File uploaded: ${link}`);
        return [link, imageLink];
    }
    else {
        // @todo improve
        throw new Error(`No transaction ID for upload: ${index}`);
    }
}
exports.arweaveUpload = arweaveUpload;
