import { AccountInfo } from '@solana/web3.js';
import { TokenAccount } from '../../models';
import { ParsedAccountBase } from './types';
import { StringPublicKey } from '../../utils';
export declare const MintParser: (pubKey: StringPublicKey, info: AccountInfo<Buffer>) => ParsedAccountBase;
export declare const TokenAccountParser: (pubKey: StringPublicKey, info: AccountInfo<Buffer>) => TokenAccount | undefined;
export declare const GenericAccountParser: (pubKey: StringPublicKey, info: AccountInfo<Buffer>) => ParsedAccountBase;
//# sourceMappingURL=parsesrs.d.ts.map