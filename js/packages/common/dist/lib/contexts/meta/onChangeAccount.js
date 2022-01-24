"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onChangeAccount = void 0;
const utils_1 = require("../../utils");
const onChangeAccount = (process, setter) => async (info) => {
    const pubkey = (0, utils_1.pubkeyToString)(info.accountId);
    const account = info.accountInfo;
    await process({
        pubkey,
        account: {
            ...account,
            // to make sure these accounts get processed by processAuctions, processVaultData, etc
            owner: account.owner.toBase58(),
        },
    }, setter);
};
exports.onChangeAccount = onChangeAccount;
//# sourceMappingURL=onChangeAccount.js.map