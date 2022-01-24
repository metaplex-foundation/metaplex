"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unsafeResAccounts = exports.unsafeAccount = exports.getProgramAccounts = void 0;
async function getProgramAccounts(connection, programId, configOrCommitment) {
    const extra = {};
    let commitment;
    //let encoding;
    if (configOrCommitment) {
        if (typeof configOrCommitment === 'string') {
            commitment = configOrCommitment;
        }
        else {
            commitment = configOrCommitment.commitment;
            //encoding = configOrCommitment.encoding;
            if (configOrCommitment.dataSlice) {
                extra.dataSlice = configOrCommitment.dataSlice;
            }
            if (configOrCommitment.filters) {
                extra.filters = configOrCommitment.filters;
            }
        }
    }
    const args = connection._buildArgs([programId], commitment, 'base64', extra);
    const unsafeRes = await connection._rpcRequest('getProgramAccounts', args);
    return unsafeResAccounts(unsafeRes.result);
}
exports.getProgramAccounts = getProgramAccounts;
function unsafeAccount(account) {
    return {
        // TODO: possible delay parsing could be added here
        data: Buffer.from(account.data[0], 'base64'),
        executable: account.executable,
        lamports: account.lamports,
        // TODO: maybe we can do it in lazy way? or just use string
        owner: account.owner,
    };
}
exports.unsafeAccount = unsafeAccount;
function unsafeResAccounts(data) {
    return data.map(item => ({
        account: unsafeAccount(item.account),
        pubkey: item.pubkey,
    }));
}
exports.unsafeResAccounts = unsafeResAccounts;
//# sourceMappingURL=web3.js.map