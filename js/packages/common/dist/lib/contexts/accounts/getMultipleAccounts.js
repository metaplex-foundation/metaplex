"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMultipleAccounts = void 0;
const utils_1 = require("../../utils/utils");
const getMultipleAccounts = async (connection, keys, commitment) => {
    const result = await Promise.all((0, utils_1.chunks)(keys, 99).map(chunk => getMultipleAccountsCore(connection, chunk, commitment)));
    const array = result
        .map(a => a.array.map(acc => {
        if (!acc) {
            return undefined;
        }
        const { data, ...rest } = acc;
        const obj = {
            ...rest,
            data: Buffer.from(data[0], 'base64'),
        };
        return obj;
    }))
        .flat();
    return { keys, array };
};
exports.getMultipleAccounts = getMultipleAccounts;
const getMultipleAccountsCore = async (connection, keys, commitment) => {
    const args = connection._buildArgs([keys], commitment, 'base64');
    const unsafeRes = await connection._rpcRequest('getMultipleAccounts', args);
    if (unsafeRes.error) {
        throw new Error('failed to get info about account ' + unsafeRes.error.message);
    }
    if (unsafeRes.result.value) {
        const array = unsafeRes.result.value;
        return { keys, array };
    }
    // TODO: fix
    throw new Error();
};
//# sourceMappingURL=getMultipleAccounts.js.map