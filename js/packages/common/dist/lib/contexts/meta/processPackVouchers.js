"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPackVouchers = void 0;
const __1 = require("../..");
const PackVoucher_1 = require("../../models/packs/accounts/PackVoucher");
const utils_1 = require("../../utils");
const processPackVouchers = ({ account, pubkey }, setter) => {
    if (!isPackAccount(account))
        return;
    try {
        if (isPackVoucherAccount(account)) {
            const packVoucher = (0, PackVoucher_1.decodePackVoucher)(account.data);
            const parsedAccount = {
                pubkey,
                account: account,
                info: packVoucher,
            };
            setter('vouchers', pubkey, parsedAccount);
        }
    }
    catch {
        // ignore errors
        // add type as first byte for easier deserialization
    }
};
exports.processPackVouchers = processPackVouchers;
const isPackAccount = (account) => account && (0, utils_1.pubkeyToString)(account.owner) === utils_1.PACK_CREATE_ID.toString();
const isPackVoucherAccount = (account) => account.data[0] === __1.PackKey.PackVoucher;
//# sourceMappingURL=processPackVouchers.js.map