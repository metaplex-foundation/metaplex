"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProvingProcessByPubkey = exports.getProvingProcessByPackSetAndWallet = exports.decodePackProvingProcess = exports.PACK_PROVING_PROCESS_SCHEMA = exports.ProvingProcess = void 0;
const web3_js_1 = require("@solana/web3.js");
const borsh_1 = require("borsh");
const __1 = require("..");
const __2 = require("../../..");
const web3_1 = require("../../../contexts/meta/web3");
class ProvingProcess {
    constructor(args) {
        this.key = __1.PackKey.ProvingProcess;
        this.key = __1.PackKey.PackSet;
        this.walletKey = args.walletKey;
        this.isExhausted = Boolean(args.isExhausted);
        this.voucherMint = args.voucherMint;
        this.packSet = args.packSet;
        this.cardsToRedeem = args.cardsToRedeem;
        this.cardsRedeemed = args.cardsRedeemed;
    }
}
exports.ProvingProcess = ProvingProcess;
exports.PACK_PROVING_PROCESS_SCHEMA = new Map([
    [
        ProvingProcess,
        {
            kind: 'struct',
            fields: [
                ['key', 'u8'],
                ['walletKey', 'pubkeyAsString'],
                ['isExhausted', 'u8'],
                ['voucherMint', 'pubkeyAsString'],
                ['packSet', 'pubkeyAsString'],
                ['cardsRedeemed', 'u32'],
                ['cardsToRedeem', 'map32'], //BTreeMap<u32, u32>
            ],
        },
    ],
]);
const decodePackProvingProcess = (buffer) => {
    return (0, borsh_1.deserializeUnchecked)(exports.PACK_PROVING_PROCESS_SCHEMA, ProvingProcess, buffer);
};
exports.decodePackProvingProcess = decodePackProvingProcess;
const getProvingProcessByPackSetAndWallet = ({ connection, packSetKey, walletKey, }) => (0, web3_1.getProgramAccounts)(connection, __2.PACK_CREATE_ID.toString(), {
    commitment: 'processed',
    filters: [
        {
            dataSize: __1.MAX_PACK_PROVING_PROCESS_SIZE,
        },
        {
            memcmp: {
                offset: 1,
                bytes: (0, __2.toPublicKey)(walletKey).toBase58(),
            },
        },
        {
            memcmp: {
                offset: 1 + 32 + 1 + 32,
                bytes: (0, __2.toPublicKey)(packSetKey).toBase58(),
            },
        },
    ],
});
exports.getProvingProcessByPackSetAndWallet = getProvingProcessByPackSetAndWallet;
const getProvingProcessByPubkey = async (connection, pubkey) => {
    const info = await connection.getAccountInfo(new web3_js_1.PublicKey(pubkey), 'processed');
    if (!info) {
        throw new Error(`Unable to find account: ${pubkey}`);
    }
    return {
        pubkey,
        account: info,
        info: (0, exports.decodePackProvingProcess)(Buffer.from(info === null || info === void 0 ? void 0 : info.data)),
    };
};
exports.getProvingProcessByPubkey = getProvingProcessByPubkey;
//# sourceMappingURL=ProvingProcess.js.map