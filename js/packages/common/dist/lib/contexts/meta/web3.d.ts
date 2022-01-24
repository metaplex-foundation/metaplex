/// <reference types="node" />
import { AccountInfo, Connection } from '@solana/web3.js';
import { StringPublicKey } from '../../utils/ids';
import { AccountAndPubkey } from './types';
export declare function getProgramAccounts(connection: Connection, programId: StringPublicKey, configOrCommitment?: any): Promise<Array<AccountAndPubkey>>;
export declare function unsafeAccount(account: AccountInfo<[string, string]>): AccountInfo<Buffer>;
export declare function unsafeResAccounts(data: Array<{
    account: AccountInfo<[string, string]>;
    pubkey: string;
}>): {
    account: AccountInfo<Buffer>;
    pubkey: string;
}[];
//# sourceMappingURL=web3.d.ts.map