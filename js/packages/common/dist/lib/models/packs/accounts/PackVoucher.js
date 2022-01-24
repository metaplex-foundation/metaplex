"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVouchersByPackSet = exports.decodePackVoucher = exports.PACK_VOUCHER_SCHEMA = exports.PackVoucher = void 0;
const borsh_1 = require("borsh");
const __1 = require("..");
const __2 = require("../../..");
const web3_1 = require("../../../contexts/meta/web3");
class PackVoucher {
    constructor(args) {
        this.key = __1.PackKey.PackVoucher;
        this.key = __1.PackKey.PackSet;
        this.packSet = args.packSet;
        this.master = args.master;
        this.metadata = args.metadata;
    }
}
exports.PackVoucher = PackVoucher;
exports.PACK_VOUCHER_SCHEMA = new Map([
    [
        PackVoucher,
        {
            kind: 'struct',
            fields: [
                ['key', 'u8'],
                ['packSet', 'pubkeyAsString'],
                ['master', 'pubkeyAsString'],
                ['metadata', 'pubkeyAsString'],
            ],
        },
    ],
]);
const decodePackVoucher = (buffer) => {
    return (0, borsh_1.deserializeUnchecked)(exports.PACK_VOUCHER_SCHEMA, PackVoucher, buffer);
};
exports.decodePackVoucher = decodePackVoucher;
const getVouchersByPackSet = ({ connection, packSetKey, }) => (0, web3_1.getProgramAccounts)(connection, __2.PACK_CREATE_ID.toString(), {
    filters: [
        {
            dataSize: __1.MAX_PACK_VOUCHER_SIZE,
        },
        {
            memcmp: {
                offset: 1,
                bytes: (0, __2.toPublicKey)(packSetKey).toBase58(),
            },
        },
    ],
});
exports.getVouchersByPackSet = getVouchersByPackSet;
//# sourceMappingURL=PackVoucher.js.map