"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMetadataFromCache = exports.updateFromCache = void 0;
const web3_js_1 = require("@solana/web3.js");
const transactions_1 = require("../helpers/transactions");
const borsh_1 = require("borsh");
const loglevel_1 = __importDefault(require("loglevel"));
const various_1 = require("../helpers/various");
const signAll_1 = require("./signAll");
const instructions_1 = require("../helpers/instructions");
const schema_1 = require("../helpers/schema");
const SIGNING_INTERVAL = 60 * 1000; //60s
async function updateFromCache(connection, wallet, candyMachineAddress, batchSize, daemon, cacheContent, newCacheContent) {
    if (daemon) {
        // noinspection InfiniteLoopJS
        for (;;) {
            await updateMetadataFromCache(candyMachineAddress, connection, wallet, batchSize, cacheContent, newCacheContent);
            await (0, various_1.sleep)(SIGNING_INTERVAL);
        }
    }
    else {
        await updateMetadataFromCache(candyMachineAddress, connection, wallet, batchSize, cacheContent, newCacheContent);
    }
}
exports.updateFromCache = updateFromCache;
async function updateMetadataFromCache(candyMachineAddress, connection, wallet, batchSize, cacheContent, newCacheContent) {
    const metadataByCandyMachine = await (0, signAll_1.getAccountsByCreatorAddress)(candyMachineAddress, connection);
    const differences = {};
    for (let i = 0; i < Object.keys(cacheContent.items).length; i++) {
        if (cacheContent.items[i.toString()].link !=
            newCacheContent.items[i.toString()].link) {
            differences[cacheContent.items[i.toString()].link] =
                newCacheContent.items[i.toString()].link;
        }
    }
    const toUpdate = metadataByCandyMachine.filter(m => !!differences[m[0].data.uri]);
    loglevel_1.default.info('Found', toUpdate.length, 'uris to update');
    let total = 0;
    while (toUpdate.length > 0) {
        loglevel_1.default.debug('Signing metadata ');
        let sliceAmount = batchSize;
        if (toUpdate.length < batchSize) {
            sliceAmount = toUpdate.length;
        }
        const removed = toUpdate.splice(0, sliceAmount);
        total += sliceAmount;
        await (0, signAll_1.delay)(500);
        await updateMetadataBatch(removed, connection, wallet, differences);
        loglevel_1.default.debug(`Processed ${total} nfts`);
    }
    loglevel_1.default.info(`Finished signing metadata for ${total} NFTs`);
}
exports.updateMetadataFromCache = updateMetadataFromCache;
async function updateMetadataBatch(metadataList, connection, keypair, differences) {
    const instructions = metadataList.map(meta => {
        const newData = new schema_1.Data({
            ...meta[0].data,
            creators: meta[0].data.creators.map(c => new schema_1.Creator({ ...c, address: new web3_js_1.PublicKey(c.address).toBase58() })),
            uri: differences[meta[0].data.uri],
        });
        const value = new schema_1.UpdateMetadataArgs({
            data: newData,
            updateAuthority: keypair.publicKey.toBase58(),
            primarySaleHappened: null,
        });
        const txnData = Buffer.from((0, borsh_1.serialize)(schema_1.METADATA_SCHEMA, value));
        return (0, instructions_1.createUpdateMetadataInstruction)(new web3_js_1.PublicKey(meta[1]), keypair.publicKey, txnData);
    });
    await (0, transactions_1.sendTransactionWithRetryWithKeypair)(connection, keypair, instructions, [], 'single');
}
