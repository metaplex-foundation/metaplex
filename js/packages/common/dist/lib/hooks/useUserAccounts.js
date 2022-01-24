"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useUserAccounts = void 0;
const accounts_1 = require("../contexts/accounts");
function useUserAccounts() {
    const context = (0, accounts_1.useAccountsContext)();
    const accountByMint = context.userAccounts.reduce((prev, acc) => {
        prev.set(acc.info.mint.toBase58(), acc);
        return prev;
    }, new Map());
    return {
        userAccounts: context.userAccounts,
        accountByMint,
    };
}
exports.useUserAccounts = useUserAccounts;
//# sourceMappingURL=useUserAccounts.js.map