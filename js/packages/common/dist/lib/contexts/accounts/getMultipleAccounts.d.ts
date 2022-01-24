/// <reference types="node" />
import { AccountInfo } from '@solana/web3.js';
export declare const getMultipleAccounts: (connection: any, keys: string[], commitment: string) => Promise<{
    keys: string[];
    array: AccountInfo<Buffer>[];
}>;
//# sourceMappingURL=getMultipleAccounts.d.ts.map