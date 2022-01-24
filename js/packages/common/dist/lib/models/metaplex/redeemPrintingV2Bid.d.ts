import { TransactionInstruction } from '@solana/web3.js';
import BN from 'bn.js';
import { StringPublicKey } from '../../utils';
export declare function redeemPrintingV2Bid(vault: StringPublicKey, safetyDepositTokenStore: StringPublicKey, tokenAccount: StringPublicKey, safetyDeposit: StringPublicKey, bidder: StringPublicKey, payer: StringPublicKey, metadata: StringPublicKey, masterEdition: StringPublicKey, originalMint: StringPublicKey, newMint: StringPublicKey, edition: BN, editionOffset: BN, winIndex: BN, instructions: TransactionInstruction[]): Promise<void>;
//# sourceMappingURL=redeemPrintingV2Bid.d.ts.map