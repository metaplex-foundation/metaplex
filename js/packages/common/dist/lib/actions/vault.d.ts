/// <reference types="node" />
import { TransactionInstruction } from '@solana/web3.js';
import BN from 'bn.js';
import { StringPublicKey } from '../utils';
export declare const VAULT_PREFIX = "vault";
export declare enum VaultKey {
    Uninitialized = 0,
    VaultV1 = 3,
    SafetyDepositBoxV1 = 1,
    ExternalPriceAccountV1 = 2
}
export declare enum VaultState {
    Inactive = 0,
    Active = 1,
    Combined = 2,
    Deactivated = 3
}
export declare const MAX_VAULT_SIZE: number;
export declare const MAX_EXTERNAL_ACCOUNT_SIZE: number;
export declare class Vault {
    key: VaultKey;
    tokenProgram: StringPublicKey;
    fractionMint: StringPublicKey;
    authority: StringPublicKey;
    fractionTreasury: StringPublicKey;
    redeemTreasury: StringPublicKey;
    allowFurtherShareCreation: boolean;
    pricingLookupAddress: StringPublicKey;
    tokenTypeCount: number;
    state: VaultState;
    lockedPricePerShare: BN;
    constructor(args: {
        tokenProgram: StringPublicKey;
        fractionMint: StringPublicKey;
        authority: StringPublicKey;
        fractionTreasury: StringPublicKey;
        redeemTreasury: StringPublicKey;
        allowFurtherShareCreation: boolean;
        pricingLookupAddress: StringPublicKey;
        tokenTypeCount: number;
        state: VaultState;
        lockedPricePerShare: BN;
    });
}
export declare class SafetyDepositBox {
    key: VaultKey;
    vault: StringPublicKey;
    tokenMint: StringPublicKey;
    store: StringPublicKey;
    order: number;
    constructor(args: {
        vault: StringPublicKey;
        tokenMint: StringPublicKey;
        store: StringPublicKey;
        order: number;
    });
}
export declare class ExternalPriceAccount {
    key: VaultKey;
    pricePerShare: BN;
    priceMint: StringPublicKey;
    allowedToCombine: boolean;
    constructor(args: {
        pricePerShare: BN;
        priceMint: StringPublicKey;
        allowedToCombine: boolean;
    });
}
export declare const VAULT_SCHEMA: Map<any, any>;
export declare const decodeVault: (buffer: Buffer) => Vault;
export declare const decodeExternalPriceAccount: (buffer: Buffer) => ExternalPriceAccount;
export declare const decodeSafetyDeposit: (buffer: Buffer) => SafetyDepositBox;
export declare function setVaultAuthority(vault: StringPublicKey, currentAuthority: StringPublicKey, newAuthority: StringPublicKey, instructions: TransactionInstruction[]): Promise<void>;
export declare function initVault(allowFurtherShareCreation: boolean, fractionalMint: StringPublicKey, redeemTreasury: StringPublicKey, fractionalTreasury: StringPublicKey, vault: StringPublicKey, vaultAuthority: StringPublicKey, pricingLookupAddress: StringPublicKey, instructions: TransactionInstruction[]): Promise<void>;
export declare function getSafetyDepositBox(vault: StringPublicKey, tokenMint: StringPublicKey): Promise<StringPublicKey>;
export declare function addTokenToInactiveVault(amount: BN, tokenMint: StringPublicKey, tokenAccount: StringPublicKey, tokenStoreAccount: StringPublicKey, vault: StringPublicKey, vaultAuthority: StringPublicKey, payer: StringPublicKey, transferAuthority: StringPublicKey, instructions: TransactionInstruction[]): Promise<void>;
export declare function activateVault(numberOfShares: BN, vault: StringPublicKey, fractionMint: StringPublicKey, fractionTreasury: StringPublicKey, vaultAuthority: StringPublicKey, instructions: TransactionInstruction[]): Promise<void>;
export declare function combineVault(vault: StringPublicKey, outstandingShareTokenAccount: StringPublicKey, payingTokenAccount: StringPublicKey, fractionMint: StringPublicKey, fractionTreasury: StringPublicKey, redeemTreasury: StringPublicKey, newVaultAuthority: StringPublicKey | undefined, vaultAuthority: StringPublicKey, transferAuthority: StringPublicKey, externalPriceAccount: StringPublicKey, instructions: TransactionInstruction[]): Promise<void>;
export declare function withdrawTokenFromSafetyDepositBox(amount: BN, destination: StringPublicKey, safetyDepositBox: StringPublicKey, storeKey: StringPublicKey, vault: StringPublicKey, fractionMint: StringPublicKey, vaultAuthority: StringPublicKey, instructions: TransactionInstruction[]): Promise<void>;
export declare function updateExternalPriceAccount(externalPriceAccountKey: StringPublicKey, externalPriceAccount: ExternalPriceAccount, instructions: TransactionInstruction[]): Promise<void>;
export declare function getSafetyDepositBoxAddress(vault: StringPublicKey, tokenMint: StringPublicKey): Promise<StringPublicKey>;
//# sourceMappingURL=vault.d.ts.map