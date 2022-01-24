"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SYSTEM = exports.ORACLE_ID = exports.PACK_CREATE_ID = exports.METAPLEX_ID = exports.AUCTION_ID = exports.VAULT_ID = exports.METADATA_PROGRAM_ID = exports.MEMO_ID = exports.BPF_UPGRADE_LOADER_ID = exports.SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = exports.TOKEN_PROGRAM_ID = exports.WRAPPED_SOL_MINT = exports.pubkeyToString = exports.toPublicKey = exports.LazyAccountInfoProxy = void 0;
const web3_js_1 = require("@solana/web3.js");
class LazyAccountInfoProxy {
    constructor() {
        this.executable = false;
        this.owner = '';
        this.lamports = 0;
    }
    get data() {
        //
        return undefined;
    }
}
exports.LazyAccountInfoProxy = LazyAccountInfoProxy;
const PubKeysInternedMap = new Map();
const toPublicKey = (key) => {
    if (typeof key !== 'string') {
        return key;
    }
    let result = PubKeysInternedMap.get(key);
    if (!result) {
        result = new web3_js_1.PublicKey(key);
        PubKeysInternedMap.set(key, result);
    }
    return result;
};
exports.toPublicKey = toPublicKey;
const pubkeyToString = (key = '') => {
    return typeof key === 'string' ? key : (key === null || key === void 0 ? void 0 : key.toBase58()) || '';
};
exports.pubkeyToString = pubkeyToString;
exports.WRAPPED_SOL_MINT = new web3_js_1.PublicKey('So11111111111111111111111111111111111111112');
exports.TOKEN_PROGRAM_ID = new web3_js_1.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
exports.SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new web3_js_1.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
exports.BPF_UPGRADE_LOADER_ID = new web3_js_1.PublicKey('BPFLoaderUpgradeab1e11111111111111111111111');
exports.MEMO_ID = new web3_js_1.PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
exports.METADATA_PROGRAM_ID = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s';
exports.VAULT_ID = 'vau1zxA2LbssAUEF7Gpw91zMM1LvXrvpzJtmZ58rPsn';
exports.AUCTION_ID = 'auctxRXPeJoc4817jDhf4HbjnhEcr1cCXenosMhK5R8';
exports.METAPLEX_ID = 'p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98';
exports.PACK_CREATE_ID = new web3_js_1.PublicKey('packFeFNZzMfD9aVWL7QbGz1WcU7R9zpf6pvNsw2BLu');
exports.ORACLE_ID = new web3_js_1.PublicKey('rndshKFf48HhGaPbaCd3WQYtgCNKzRgVQ3U2we4Cvf9');
exports.SYSTEM = new web3_js_1.PublicKey('11111111111111111111111111111111');
//# sourceMappingURL=ids.js.map