"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPackCards = void 0;
const __1 = require("../..");
const PackCard_1 = require("../../models/packs/accounts/PackCard");
const utils_1 = require("../../utils");
const processPackCards = ({ account, pubkey }, setter) => {
    if (!isPackAccount(account))
        return;
    try {
        if (isPackCardAccount(account)) {
            const packCard = (0, PackCard_1.decodePackCard)(account.data);
            const parsedAccount = {
                pubkey,
                account: account,
                info: packCard,
            };
            setter('packCards', pubkey, parsedAccount);
            setter('packCardsByPackSet', packCard.packSet, parsedAccount);
        }
    }
    catch {
        // ignore errors
        // add type as first byte for easier deserialization
    }
};
exports.processPackCards = processPackCards;
const isPackAccount = (account) => account && (0, utils_1.pubkeyToString)(account.owner) === utils_1.PACK_CREATE_ID.toString();
const isPackCardAccount = (account) => account.data[0] === __1.PackKey.PackCard;
//# sourceMappingURL=processPackCards.js.map