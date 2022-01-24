"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findPackVoucherProgramAddress = exports.findPackCardProgramAddress = exports.findPackConfigProgramAddress = exports.findProvingProcessProgramAddress = exports.getProgramAuthority = exports.CONFIG_PREFIX = exports.PROVING_PROCESS_PREFIX = exports.VOUCHER_PREFIX = exports.CARD_PREFIX = exports.PACKS_PREFIX = void 0;
const web3_js_1 = require("@solana/web3.js");
const __1 = require("../..");
exports.PACKS_PREFIX = 'packs';
exports.CARD_PREFIX = 'card';
exports.VOUCHER_PREFIX = 'voucher';
exports.PROVING_PROCESS_PREFIX = 'proving';
exports.CONFIG_PREFIX = 'config';
async function getProgramAuthority() {
    const PROGRAM_IDS = (0, __1.programIds)();
    return (await (0, __1.findProgramAddress)([
        Buffer.from(exports.PACKS_PREFIX),
        (0, __1.toPublicKey)(PROGRAM_IDS.pack_create).toBuffer(),
    ], (0, __1.toPublicKey)(PROGRAM_IDS.pack_create)))[0];
}
exports.getProgramAuthority = getProgramAuthority;
async function findProvingProcessProgramAddress(packSetKey, userWallet, voucherMint) {
    const PROGRAM_IDS = (0, __1.programIds)();
    return (await (0, __1.findProgramAddress)([
        Buffer.from(exports.PROVING_PROCESS_PREFIX),
        packSetKey.toBuffer(),
        userWallet.toBuffer(),
        voucherMint.toBuffer(),
    ], (0, __1.toPublicKey)(PROGRAM_IDS.pack_create)))[0];
}
exports.findProvingProcessProgramAddress = findProvingProcessProgramAddress;
async function findPackConfigProgramAddress(packSetKey) {
    const PROGRAM_IDS = (0, __1.programIds)();
    return (await (0, __1.findProgramAddress)([Buffer.from(exports.CONFIG_PREFIX), packSetKey.toBuffer()], (0, __1.toPublicKey)(PROGRAM_IDS.pack_create)))[0];
}
exports.findPackConfigProgramAddress = findPackConfigProgramAddress;
async function findPackCardProgramAddress(pack, index) {
    return findProgramAddressByPrefix(pack, index, exports.CARD_PREFIX);
}
exports.findPackCardProgramAddress = findPackCardProgramAddress;
async function findPackVoucherProgramAddress(pack, index) {
    return findProgramAddressByPrefix(pack, index, exports.VOUCHER_PREFIX);
}
exports.findPackVoucherProgramAddress = findPackVoucherProgramAddress;
async function findProgramAddressByPrefix(packSetKey, index, prefix) {
    const PROGRAM_IDS = (0, __1.programIds)();
    const numberBuffer = Buffer.allocUnsafe(4);
    numberBuffer.writeUInt16LE(index);
    return (await (0, __1.findProgramAddress)([Buffer.from(prefix), new web3_js_1.PublicKey(packSetKey).toBuffer(), numberBuffer], (0, __1.toPublicKey)(PROGRAM_IDS.pack_create)))[0];
}
//# sourceMappingURL=find.js.map