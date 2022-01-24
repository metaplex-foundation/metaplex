"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCachedAccount = exports.cache = exports.genericCache = void 0;
const web3_js_1 = require("@solana/web3.js");
const eventEmitter_1 = require("../../utils/eventEmitter");
const deserialize_1 = require("./deserialize");
exports.genericCache = new Map();
const mintCache = new Map();
const pendingCalls = new Map();
const pendingMintCalls = new Map();
const keyToAccountParser = new Map();
const getMintInfo = async (connection, pubKey) => {
    const info = await connection.getAccountInfo(pubKey);
    if (info === null) {
        throw new Error('Failed to find mint account');
    }
    const data = Buffer.from(info.data);
    return (0, deserialize_1.deserializeMint)(data);
};
exports.cache = {
    emitter: new eventEmitter_1.EventEmitter(),
    query: async (connection, pubKey, parser) => {
        let id;
        if (typeof pubKey === 'string') {
            id = new web3_js_1.PublicKey(pubKey);
        }
        else {
            id = pubKey;
        }
        const address = id.toBase58();
        const account = exports.genericCache.get(address);
        if (account) {
            return account;
        }
        let query = pendingCalls.get(address);
        if (query) {
            return query;
        }
        // TODO: refactor to use multiple accounts query with flush like behavior
        query = connection.getAccountInfo(id).then(data => {
            if (!data) {
                throw new Error('Account not found');
            }
            return exports.cache.add(id, data, parser);
        });
        pendingCalls.set(address, query);
        return query;
    },
    add: (id, obj, parser, isActive) => {
        const address = typeof id === 'string' ? id : id === null || id === void 0 ? void 0 : id.toBase58();
        const deserialize = parser ? parser : keyToAccountParser.get(address);
        if (!deserialize) {
            throw new Error('Deserializer needs to be registered or passed as a parameter');
        }
        exports.cache.registerParser(id, deserialize);
        pendingCalls.delete(address);
        const account = deserialize(address, obj);
        if (!account) {
            return;
        }
        if (isActive === undefined)
            isActive = true;
        else if (isActive instanceof Function)
            isActive = isActive(account);
        const isNew = !exports.genericCache.has(address);
        exports.genericCache.set(address, account);
        exports.cache.emitter.raiseCacheUpdated(address, isNew, deserialize, isActive);
        return account;
    },
    get: (pubKey) => {
        let key;
        if (typeof pubKey !== 'string') {
            key = pubKey.toBase58();
        }
        else {
            key = pubKey;
        }
        return exports.genericCache.get(key);
    },
    delete: (pubKey) => {
        let key;
        if (typeof pubKey !== 'string') {
            key = pubKey.toBase58();
        }
        else {
            key = pubKey;
        }
        if (exports.genericCache.get(key)) {
            exports.genericCache.delete(key);
            exports.cache.emitter.raiseCacheDeleted(key);
            return true;
        }
        return false;
    },
    byParser: (parser) => {
        const result = [];
        for (const id of keyToAccountParser.keys()) {
            if (keyToAccountParser.get(id) === parser) {
                result.push(id);
            }
        }
        return result;
    },
    registerParser: (pubkey, parser) => {
        if (pubkey) {
            const address = typeof pubkey === 'string' ? pubkey : pubkey === null || pubkey === void 0 ? void 0 : pubkey.toBase58();
            keyToAccountParser.set(address, parser);
        }
        return pubkey;
    },
    queryMint: async (connection, pubKey) => {
        let id;
        if (typeof pubKey === 'string') {
            id = new web3_js_1.PublicKey(pubKey);
        }
        else {
            id = pubKey;
        }
        const address = id.toBase58();
        const mint = mintCache.get(address);
        if (mint) {
            return mint;
        }
        let query = pendingMintCalls.get(address);
        if (query) {
            return query;
        }
        query = getMintInfo(connection, id).then(data => {
            pendingMintCalls.delete(address);
            mintCache.set(address, data);
            return data;
        });
        pendingMintCalls.set(address, query);
        return query;
    },
    getMint: (pubKey) => {
        let key;
        if (typeof pubKey !== 'string') {
            key = pubKey.toBase58();
        }
        else {
            key = pubKey;
        }
        return mintCache.get(key);
    },
    addMint: (pubKey, obj) => {
        const mint = (0, deserialize_1.deserializeMint)(obj.data);
        const id = pubKey.toBase58();
        mintCache.set(id, mint);
        return mint;
    },
};
const getCachedAccount = (predicate) => {
    for (const account of exports.genericCache.values()) {
        if (predicate(account)) {
            return account;
        }
    }
};
exports.getCachedAccount = getCachedAccount;
//# sourceMappingURL=cache.js.map