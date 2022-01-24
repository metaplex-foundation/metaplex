"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deserializeMint = exports.deserializeAccount = void 0;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
// TODO: expose in spl package
const deserializeAccount = (data) => {
    const accountInfo = spl_token_1.AccountLayout.decode(data);
    accountInfo.mint = new web3_js_1.PublicKey(accountInfo.mint);
    accountInfo.owner = new web3_js_1.PublicKey(accountInfo.owner);
    accountInfo.amount = spl_token_1.u64.fromBuffer(accountInfo.amount);
    if (accountInfo.delegateOption === 0) {
        accountInfo.delegate = null;
        accountInfo.delegatedAmount = new spl_token_1.u64(0);
    }
    else {
        accountInfo.delegate = new web3_js_1.PublicKey(accountInfo.delegate);
        accountInfo.delegatedAmount = spl_token_1.u64.fromBuffer(accountInfo.delegatedAmount);
    }
    accountInfo.isInitialized = accountInfo.state !== 0;
    accountInfo.isFrozen = accountInfo.state === 2;
    if (accountInfo.isNativeOption === 1) {
        accountInfo.rentExemptReserve = spl_token_1.u64.fromBuffer(accountInfo.isNative);
        accountInfo.isNative = true;
    }
    else {
        accountInfo.rentExemptReserve = null;
        accountInfo.isNative = false;
    }
    if (accountInfo.closeAuthorityOption === 0) {
        accountInfo.closeAuthority = null;
    }
    else {
        accountInfo.closeAuthority = new web3_js_1.PublicKey(accountInfo.closeAuthority);
    }
    return accountInfo;
};
exports.deserializeAccount = deserializeAccount;
// TODO: expose in spl package
const deserializeMint = (data) => {
    if (data.length !== spl_token_1.MintLayout.span) {
        throw new Error('Not a valid Mint');
    }
    const mintInfo = spl_token_1.MintLayout.decode(data);
    if (mintInfo.mintAuthorityOption === 0) {
        mintInfo.mintAuthority = null;
    }
    else {
        mintInfo.mintAuthority = new web3_js_1.PublicKey(mintInfo.mintAuthority);
    }
    mintInfo.supply = spl_token_1.u64.fromBuffer(mintInfo.supply);
    mintInfo.isInitialized = mintInfo.isInitialized !== 0;
    if (mintInfo.freezeAuthorityOption === 0) {
        mintInfo.freezeAuthority = null;
    }
    else {
        mintInfo.freezeAuthority = new web3_js_1.PublicKey(mintInfo.freezeAuthority);
    }
    return mintInfo;
};
exports.deserializeMint = deserializeMint;
//# sourceMappingURL=deserialize.js.map