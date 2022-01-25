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
exports.delay = exports.getAccountsByCreatorAddress = exports.signAllMetadataFromCandyMachine = void 0;
const web3_js_1 = require("@solana/web3.js");
const transactions_1 = require("../helpers/transactions");
const borsh = __importStar(require("borsh"));
const constants_1 = require("../helpers/constants");
const types_1 = require("../types");
const sign_1 = require("./sign");
const loglevel_1 = __importDefault(require("loglevel"));
const various_1 = require("../helpers/various");
const SIGNING_INTERVAL = 60 * 1000; //60s
let lastCount = 0;
/*
 Get accounts by candy machine creator address
 Get only verified ones
 Get only unverified ones with creator address
 Grab n at a time and batch sign and send transaction

 PS: Don't sign candy machine addresses that you do not know about. Signing verifies your participation.
*/
async function signAllMetadataFromCandyMachine(connection, wallet, candyMachineAddress, batchSize, daemon) {
    if (daemon) {
        // noinspection InfiniteLoopJS
        for (;;) {
            await findAndSignMetadata(candyMachineAddress, connection, wallet, batchSize);
            await (0, various_1.sleep)(SIGNING_INTERVAL);
        }
    }
    else {
        await findAndSignMetadata(candyMachineAddress, connection, wallet, batchSize);
    }
}
exports.signAllMetadataFromCandyMachine = signAllMetadataFromCandyMachine;
async function findAndSignMetadata(candyMachineAddress, connection, wallet, batchSize) {
    const metadataByCandyMachine = await getAccountsByCreatorAddress(candyMachineAddress, connection);
    if (lastCount === metadataByCandyMachine.length) {
        loglevel_1.default.debug(`Didn't find any new NFTs to sign - ${new Date()}`);
        return;
    }
    lastCount = metadataByCandyMachine.length;
    loglevel_1.default.info(`Found ${metadataByCandyMachine.length} nft's minted by candy machine ${candyMachineAddress}`);
    const candyVerifiedListToSign = await getCandyMachineVerifiedMetadata(metadataByCandyMachine, candyMachineAddress, wallet.publicKey.toBase58());
    loglevel_1.default.info(`Found ${candyVerifiedListToSign.length} nft's to sign by  ${wallet.publicKey.toBase58()}`);
    await sendSignMetadata(connection, wallet, candyVerifiedListToSign, batchSize);
}
async function getAccountsByCreatorAddress(creatorAddress, connection) {
    const metadataAccounts = await getProgramAccounts(connection, constants_1.TOKEN_METADATA_PROGRAM_ID.toBase58(), {
        filters: [
            {
                memcmp: {
                    offset: 1 + // key
                        32 + // update auth
                        32 + // mint
                        4 + // name string length
                        constants_1.MAX_NAME_LENGTH + // name
                        4 + // uri string length
                        constants_1.MAX_URI_LENGTH + // uri*
                        4 + // symbol string length
                        constants_1.MAX_SYMBOL_LENGTH + // symbol
                        2 + // seller fee basis points
                        1 + // whether or not there is a creators vec
                        4 + // creators vec length
                        0 * constants_1.MAX_CREATOR_LEN,
                    bytes: creatorAddress,
                },
            },
        ],
    });
    const decodedAccounts = [];
    for (let i = 0; i < metadataAccounts.length; i++) {
        const e = metadataAccounts[i];
        const decoded = await decodeMetadata(e.account.data);
        const accountPubkey = e.pubkey;
        const store = [decoded, accountPubkey];
        decodedAccounts.push(store);
    }
    return decodedAccounts;
}
exports.getAccountsByCreatorAddress = getAccountsByCreatorAddress;
async function getProgramAccounts(connection, programId, configOrCommitment) {
    const extra = {};
    let commitment;
    //let encoding;
    if (configOrCommitment) {
        if (typeof configOrCommitment === 'string') {
            commitment = configOrCommitment;
        }
        else {
            commitment = configOrCommitment.commitment;
            //encoding = configOrCommitment.encoding;
            if (configOrCommitment.dataSlice) {
                extra.dataSlice = configOrCommitment.dataSlice;
            }
            if (configOrCommitment.filters) {
                extra.filters = configOrCommitment.filters;
            }
        }
    }
    const args = connection._buildArgs([programId], commitment, 'base64', extra);
    const unsafeRes = await connection._rpcRequest('getProgramAccounts', args);
    //console.log(unsafeRes)
    const data = unsafeRes.result.map(item => {
        return {
            account: {
                // TODO: possible delay parsing could be added here
                data: Buffer.from(item.account.data[0], 'base64'),
                executable: item.account.executable,
                lamports: item.account.lamports,
                // TODO: maybe we can do it in lazy way? or just use string
                owner: item.account.owner,
            },
            pubkey: item.pubkey,
        };
    });
    return data;
}
// eslint-disable-next-line no-control-regex
const METADATA_REPLACE = new RegExp('\u0000', 'g');
async function decodeMetadata(buffer) {
    const metadata = borsh.deserializeUnchecked(types_1.METADATA_SCHEMA, types_1.Metadata, buffer);
    metadata.data.name = metadata.data.name.replace(METADATA_REPLACE, '');
    metadata.data.uri = metadata.data.uri.replace(METADATA_REPLACE, '');
    metadata.data.symbol = metadata.data.symbol.replace(METADATA_REPLACE, '');
    return metadata;
}
async function getCandyMachineVerifiedMetadata(metadataList, candyAddress, creatorAddress) {
    const verifiedList = [];
    metadataList.forEach(meta => {
        let verifiedCandy = false;
        let verifiedCreator = true;
        meta[0].data.creators.forEach(creator => {
            if (new web3_js_1.PublicKey(creator.address).toBase58() == candyAddress &&
                creator.verified === 1) {
                verifiedCandy = true;
            }
            if (new web3_js_1.PublicKey(creator.address).toBase58() == creatorAddress &&
                creator.verified === 0) {
                verifiedCreator = false;
            }
        });
        if (verifiedCandy && !verifiedCreator) {
            verifiedList.push(meta);
        }
    });
    return verifiedList;
}
async function sendSignMetadata(connection, wallet, metadataList, batchsize) {
    let total = 0;
    while (metadataList.length > 0) {
        loglevel_1.default.debug('Signing metadata ');
        let sliceAmount = batchsize;
        if (metadataList.length < batchsize) {
            sliceAmount = metadataList.length;
        }
        const removed = metadataList.splice(0, sliceAmount);
        total += sliceAmount;
        await delay(500);
        await signMetadataBatch(removed, connection, wallet);
        loglevel_1.default.debug(`Processed ${total} nfts`);
    }
    loglevel_1.default.info(`Finished signing metadata for ${total} NFTs`);
}
async function signMetadataBatch(metadataList, connection, keypair) {
    const instructions = metadataList.map(meta => {
        return (0, sign_1.signMetadataInstruction)(new web3_js_1.PublicKey(meta[1]), keypair.publicKey);
    });
    await (0, transactions_1.sendTransactionWithRetryWithKeypair)(connection, keypair, instructions, [], 'single');
}
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
exports.delay = delay;
