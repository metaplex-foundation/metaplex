import { PublicKey, AccountInfo } from '@solana/web3.js';
export declare type StringPublicKey = string;
export declare class LazyAccountInfoProxy<T> {
    executable: boolean;
    owner: StringPublicKey;
    lamports: number;
    get data(): T;
}
export interface LazyAccountInfo {
    executable: boolean;
    owner: StringPublicKey;
    lamports: number;
    data: [string, string];
}
export declare const toPublicKey: (key: string | PublicKey) => PublicKey;
export declare const pubkeyToString: (key?: PublicKey | null | string) => string;
export interface PublicKeyStringAndAccount<T> {
    pubkey: string;
    account: AccountInfo<T>;
}
export declare const WRAPPED_SOL_MINT: PublicKey;
export declare const TOKEN_PROGRAM_ID: PublicKey;
export declare const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID: PublicKey;
export declare const BPF_UPGRADE_LOADER_ID: PublicKey;
export declare const MEMO_ID: PublicKey;
export declare const METADATA_PROGRAM_ID: string;
export declare const VAULT_ID: string;
export declare const AUCTION_ID: string;
export declare const METAPLEX_ID: string;
export declare const PACK_CREATE_ID: PublicKey;
export declare const ORACLE_ID: PublicKey;
export declare const SYSTEM: PublicKey;
//# sourceMappingURL=ids.d.ts.map