"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenericAccountParser = exports.TokenAccountParser = exports.MintParser = void 0;
const deserialize_1 = require("./deserialize");
const MintParser = (pubKey, info) => {
    const buffer = Buffer.from(info.data);
    const data = (0, deserialize_1.deserializeMint)(buffer);
    const details = {
        pubkey: pubKey,
        account: {
            ...info,
        },
        info: data,
    };
    return details;
};
exports.MintParser = MintParser;
const TokenAccountParser = (pubKey, info) => {
    // Sometimes a wrapped sol account gets closed, goes to 0 length,
    // triggers an update over wss which triggers this guy to get called
    // since your UI already logged that pubkey as a token account. Check for length.
    if (info.data.length > 0) {
        const buffer = Buffer.from(info.data);
        const data = (0, deserialize_1.deserializeAccount)(buffer);
        const details = {
            pubkey: pubKey,
            account: {
                ...info,
            },
            info: data,
        };
        return details;
    }
};
exports.TokenAccountParser = TokenAccountParser;
const GenericAccountParser = (pubKey, info) => {
    const buffer = Buffer.from(info.data);
    const details = {
        pubkey: pubKey,
        account: {
            ...info,
        },
        info: buffer,
    };
    return details;
};
exports.GenericAccountParser = GenericAccountParser;
//# sourceMappingURL=parsesrs.js.map