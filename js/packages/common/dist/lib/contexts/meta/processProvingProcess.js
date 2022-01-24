"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processProvingProcess = void 0;
const __1 = require("../..");
const ProvingProcess_1 = require("../../models/packs/accounts/ProvingProcess");
const utils_1 = require("../../utils");
const processProvingProcess = ({ account, pubkey }, setter) => {
    if (!isPackAccount(account))
        return;
    try {
        if (isPackProvingProcessAccount(account)) {
            const provingProcess = (0, ProvingProcess_1.decodePackProvingProcess)(account.data);
            const parsedAccount = {
                pubkey,
                account: account,
                info: provingProcess,
            };
            setter('provingProcesses', pubkey, parsedAccount);
        }
    }
    catch {
        // ignore errors
        // add type as first byte for easier deserialization
    }
};
exports.processProvingProcess = processProvingProcess;
const isPackAccount = (account) => account && (0, utils_1.pubkeyToString)(account.owner) === utils_1.PACK_CREATE_ID.toString();
const isPackProvingProcessAccount = (account) => account.data[0] === __1.PackKey.ProvingProcess;
//# sourceMappingURL=processProvingProcess.js.map