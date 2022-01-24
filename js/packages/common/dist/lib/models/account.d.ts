/// <reference types="node" />
import { AccountInfo, Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { AccountInfo as TokenAccountInfo } from '@solana/spl-token';
export interface TokenAccount {
    pubkey: string;
    account: AccountInfo<Buffer>;
    info: TokenAccountInfo;
}
export interface ParsedDataAccount {
    amount: number;
    rawAmount: string;
    parsedAssetAddress: string;
    parsedAccount: any;
    assetDecimals: number;
    assetIcon: any;
    name: string;
    symbol: string;
    sourceAddress: string;
    targetAddress: string;
}
export declare const ParsedDataLayout: any;
export declare function approve(instructions: TransactionInstruction[], cleanupInstructions: TransactionInstruction[], account: PublicKey, owner: PublicKey, amount: number, autoRevoke?: boolean, delegate?: PublicKey, existingTransferAuthority?: Keypair): Keypair;
//# sourceMappingURL=account.d.ts.map