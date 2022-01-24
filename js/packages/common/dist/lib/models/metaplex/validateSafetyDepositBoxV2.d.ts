import { TransactionInstruction } from '@solana/web3.js';
import { SafetyDepositConfig } from '.';
import { StringPublicKey } from '../../utils';
export declare function validateSafetyDepositBoxV2(vault: StringPublicKey, metadata: StringPublicKey, safetyDepositBox: StringPublicKey, safetyDepositTokenStore: StringPublicKey, tokenMint: StringPublicKey, auctionManagerAuthority: StringPublicKey, metadataAuthority: StringPublicKey, payer: StringPublicKey, instructions: TransactionInstruction[], edition: StringPublicKey, whitelistedCreator: StringPublicKey | undefined, store: StringPublicKey, safetyDepositConfig: SafetyDepositConfig): Promise<void>;
//# sourceMappingURL=validateSafetyDepositBoxV2.d.ts.map