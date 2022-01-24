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
exports.rustString = exports.uint128 = exports.uint64 = exports.publicKey = void 0;
const web3_js_1 = require("@solana/web3.js");
const bn_js_1 = __importDefault(require("bn.js"));
const BufferLayout = __importStar(require("buffer-layout"));
/**
 * Layout for a public key
 */
const publicKey = (property = 'publicKey') => {
    const publicKeyLayout = BufferLayout.blob(32, property);
    const _decode = publicKeyLayout.decode.bind(publicKeyLayout);
    const _encode = publicKeyLayout.encode.bind(publicKeyLayout);
    publicKeyLayout.decode = (buffer, offset) => {
        const data = _decode(buffer, offset);
        return new web3_js_1.PublicKey(data);
    };
    publicKeyLayout.encode = (key, buffer, offset) => {
        return _encode(key.toBuffer(), buffer, offset);
    };
    return publicKeyLayout;
};
exports.publicKey = publicKey;
/**
 * Layout for a 64bit unsigned value
 */
const uint64 = (property = 'uint64') => {
    const layout = BufferLayout.blob(8, property);
    const _decode = layout.decode.bind(layout);
    const _encode = layout.encode.bind(layout);
    layout.decode = (buffer, offset) => {
        const data = _decode(buffer, offset);
        return new bn_js_1.default([...data]
            .reverse()
            .map(i => `00${i.toString(16)}`.slice(-2))
            .join(''), 16);
    };
    layout.encode = (num, buffer, offset) => {
        const a = num.toArray().reverse();
        let b = Buffer.from(a);
        if (b.length !== 8) {
            const zeroPad = Buffer.alloc(8);
            b.copy(zeroPad);
            b = zeroPad;
        }
        return _encode(b, buffer, offset);
    };
    return layout;
};
exports.uint64 = uint64;
// TODO: wrap in BN (what about decimals?)
const uint128 = (property = 'uint128') => {
    const layout = BufferLayout.blob(16, property);
    const _decode = layout.decode.bind(layout);
    const _encode = layout.encode.bind(layout);
    layout.decode = (buffer, offset) => {
        const data = _decode(buffer, offset);
        return new bn_js_1.default([...data]
            .reverse()
            .map(i => `00${i.toString(16)}`.slice(-2))
            .join(''), 16);
    };
    layout.encode = (num, buffer, offset) => {
        const a = num.toArray().reverse();
        let b = Buffer.from(a);
        if (b.length !== 16) {
            const zeroPad = Buffer.alloc(16);
            b.copy(zeroPad);
            b = zeroPad;
        }
        return _encode(b, buffer, offset);
    };
    return layout;
};
exports.uint128 = uint128;
/**
 * Layout for a Rust String type
 */
const rustString = (property = 'string') => {
    const rsl = BufferLayout.struct([
        BufferLayout.u32('length'),
        BufferLayout.u32('lengthPadding'),
        BufferLayout.blob(BufferLayout.offset(BufferLayout.u32(), -8), 'chars'),
    ], property);
    const _decode = rsl.decode.bind(rsl);
    const _encode = rsl.encode.bind(rsl);
    rsl.decode = (buffer, offset) => {
        const data = _decode(buffer, offset);
        return data.chars.toString('utf8');
    };
    rsl.encode = (str, buffer, offset) => {
        const data = {
            chars: Buffer.from(str, 'utf8'),
        };
        return _encode(data, buffer, offset);
    };
    return rsl;
};
exports.rustString = rustString;
//# sourceMappingURL=layout.js.map