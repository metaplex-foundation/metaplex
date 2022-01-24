import { Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { TokenAccount } from '../models/account';
export declare function ensureSplAccount(instructions: TransactionInstruction[], cleanupInstructions: TransactionInstruction[], toCheck: TokenAccount, payer: PublicKey, amount: number, signers: Keypair[]): string | PublicKey;
export declare const DEFAULT_TEMP_MEM_SPACE = 65548;
export declare function createTempMemoryAccount(instructions: TransactionInstruction[], payer: PublicKey, signers: Keypair[], owner: PublicKey, space?: number): PublicKey;
export declare function createUninitializedMint(instructions: TransactionInstruction[], payer: PublicKey, amount: number, signers: Keypair[]): PublicKey;
export declare function createUninitializedAccount(instructions: TransactionInstruction[], payer: PublicKey, amount: number, signers: Keypair[]): PublicKey;
export declare function createAssociatedTokenAccountInstruction(instructions: TransactionInstruction[], associatedTokenAddress: PublicKey, payer: PublicKey, walletAddress: PublicKey, splTokenMintAddress: PublicKey): void;
export declare function createMint(instructions: TransactionInstruction[], payer: PublicKey, mintRentExempt: number, decimals: number, owner: PublicKey, freezeAuthority: PublicKey, signers: Keypair[]): PublicKey;
export declare function createTokenAccount(instructions: TransactionInstruction[], payer: PublicKey, accountRentExempt: number, mint: PublicKey, owner: PublicKey, signers: Keypair[]): PublicKey;
export declare function ensureWrappedAccount(instructions: TransactionInstruction[], cleanupInstructions: TransactionInstruction[], toCheck: TokenAccount | undefined, payer: PublicKey, amount: number, signers: Keypair[]): string;
export declare function findOrCreateAccountByMint(payer: PublicKey, owner: PublicKey, instructions: TransactionInstruction[], cleanupInstructions: TransactionInstruction[], accountRentExempt: number, mint: PublicKey, // use to identify same type
signers: Keypair[], excluded?: Set<string>): PublicKey;
//# sourceMappingURL=account.d.ts.map