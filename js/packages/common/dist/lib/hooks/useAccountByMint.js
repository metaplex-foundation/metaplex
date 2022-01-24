"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAccountByMint = void 0;
const useUserAccounts_1 = require("../hooks/useUserAccounts");
const useAccountByMint = (mint) => {
    const { userAccounts } = (0, useUserAccounts_1.useUserAccounts)();
    const mintAddress = typeof mint === 'string' ? mint : mint === null || mint === void 0 ? void 0 : mint.toBase58();
    const index = userAccounts.findIndex(acc => acc.info.mint.toBase58() === mintAddress);
    if (index !== -1) {
        return userAccounts[index];
    }
    return;
};
exports.useAccountByMint = useAccountByMint;
//# sourceMappingURL=useAccountByMint.js.map