import { AccountInfo, Connection, PublicKey } from '@solana/web3.js';
import { MintInfo } from '@solana/spl-token';
import { TokenAccount } from '../../models';
import { EventEmitter } from '../../utils/eventEmitter';
import { ParsedAccountBase, AccountParser } from './types';
export declare const genericCache: Map<string, ParsedAccountBase>;
export declare const cache: {
    emitter: EventEmitter;
    query: (connection: Connection, pubKey: string | PublicKey, parser?: AccountParser | undefined) => Promise<ParsedAccountBase>;
    add: (id: PublicKey | string, obj: AccountInfo<Buffer>, parser?: AccountParser | undefined, isActive?: boolean | ((parsed: any) => boolean) | undefined) => ParsedAccountBase | undefined;
    get: (pubKey: string | PublicKey) => ParsedAccountBase | undefined;
    delete: (pubKey: string | PublicKey) => boolean;
    byParser: (parser: AccountParser) => string[];
    registerParser: (pubkey: PublicKey | string, parser: AccountParser) => string | PublicKey;
    queryMint: (connection: Connection, pubKey: string | PublicKey) => Promise<MintInfo>;
    getMint: (pubKey: string | PublicKey) => MintInfo | undefined;
    addMint: (pubKey: PublicKey, obj: AccountInfo<Buffer>) => MintInfo;
};
export declare const getCachedAccount: (predicate: (account: TokenAccount) => boolean) => TokenAccount | undefined;
//# sourceMappingURL=cache.d.ts.map