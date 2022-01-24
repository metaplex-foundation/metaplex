"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCardsByPackSet = exports.decodePackCard = exports.PACK_CARD_SCHEMA = exports.PackCard = void 0;
const borsh_1 = require("borsh");
const __1 = require("..");
const __2 = require("../../..");
const web3_1 = require("../../../contexts/meta/web3");
class PackCard {
    constructor(args) {
        this.key = __1.PackKey.PackCard;
        this.key = __1.PackKey.PackSet;
        this.packSet = args.packSet;
        this.master = args.master;
        this.metadata = args.metadata;
        this.tokenAccount = args.tokenAccount;
        this.maxSupply = args.maxSupply;
        this.weight = args.weight;
    }
}
exports.PackCard = PackCard;
exports.PACK_CARD_SCHEMA = new Map([
    [
        PackCard,
        {
            kind: 'struct',
            fields: [
                ['key', 'u8'],
                ['packSet', 'pubkeyAsString'],
                ['master', 'pubkeyAsString'],
                ['metadata', 'pubkeyAsString'],
                ['tokenAccount', 'pubkeyAsString'],
                ['maxSupply', 'u32'],
                ['weight', 'u16'],
            ],
        },
    ],
]);
const decodePackCard = (buffer) => {
    return (0, borsh_1.deserializeUnchecked)(exports.PACK_CARD_SCHEMA, PackCard, buffer);
};
exports.decodePackCard = decodePackCard;
const getCardsByPackSet = ({ connection, packSetKey, }) => (0, web3_1.getProgramAccounts)(connection, __2.PACK_CREATE_ID.toString(), {
    filters: [
        {
            dataSize: __1.MAX_PACK_CARD_SIZE,
        },
        {
            memcmp: {
                offset: 1,
                bytes: packSetKey,
            },
        },
    ],
});
exports.getCardsByPackSet = getCardsByPackSet;
//# sourceMappingURL=PackCard.js.map