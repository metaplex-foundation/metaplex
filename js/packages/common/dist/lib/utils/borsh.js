"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extendBorsh = void 0;
const web3_js_1 = require("@solana/web3.js");
const borsh_1 = require("borsh");
const bs58_1 = __importDefault(require("bs58"));
const extendBorsh = () => {
    borsh_1.BinaryReader.prototype.readPubkey = function () {
        const reader = this;
        const array = reader.readFixedArray(32);
        return new web3_js_1.PublicKey(array);
    };
    borsh_1.BinaryWriter.prototype.writePubkey = function (value) {
        const writer = this;
        writer.writeFixedArray(value.toBuffer());
    };
    borsh_1.BinaryReader.prototype.readPubkeyAsString = function () {
        const reader = this;
        const array = reader.readFixedArray(32);
        return bs58_1.default.encode(array);
    };
    borsh_1.BinaryWriter.prototype.writePubkeyAsString = function (value) {
        const writer = this;
        writer.writeFixedArray(bs58_1.default.decode(value));
    };
    // BTreeMap<u32, u32>
    borsh_1.BinaryReader.prototype.readMap32 = function () {
        const reader = this;
        const map = new Map();
        const length = reader.readU32();
        for (let i = 0; i < length; i++) {
            const key = reader.readU32();
            const val = reader.readU32();
            map.set(key, val);
        }
        return map;
    };
    // BTreeMap<u32, u32>
    borsh_1.BinaryWriter.prototype.writeMap32 = function (value) {
        const writer = this;
        value.forEach((val, key) => {
            writer.writeU32(key);
            writer.writeU32(val);
        });
    };
};
exports.extendBorsh = extendBorsh;
(0, exports.extendBorsh)();
//# sourceMappingURL=borsh.js.map