"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPackSets = void 0;
const __1 = require("../..");
const PackSet_1 = require("../../models/packs/accounts/PackSet");
const utils_1 = require("../../utils");
const processPackSets = ({ account, pubkey }, setter) => {
    if (!isPackAccount(account))
        return;
    try {
        if (isPackSetAccount(account)) {
            const packSet = (0, PackSet_1.decodePackSet)(account.data);
            const parsedAccount = {
                pubkey,
                account: account,
                info: packSet,
            };
            setter('packs', pubkey, parsedAccount);
        }
    }
    catch {
        // ignore errors
        // add type as first byte for easier deserialization
    }
};
exports.processPackSets = processPackSets;
const isPackAccount = (account) => account && (0, utils_1.pubkeyToString)(account.owner) === utils_1.PACK_CREATE_ID.toString();
const isPackSetAccount = (account) => account.data[0] === __1.PackKey.PackSet;
//# sourceMappingURL=processPackSets.js.map