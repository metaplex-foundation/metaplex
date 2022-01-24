import { TransactionInstruction } from '@solana/web3.js';
import BN from 'bn.js';
import { StringPublicKey } from '../../utils';
export declare function redeemParticipationBidV3(vault: StringPublicKey, safetyDepositTokenStore: StringPublicKey, destination: StringPublicKey, safetyDeposit: StringPublicKey, bidder: StringPublicKey, payer: StringPublicKey, metadata: StringPublicKey, masterEdition: StringPublicKey, originalMint: StringPublicKey, transferAuthority: StringPublicKey, acceptPaymentAccount: StringPublicKey, tokenPaymentAccount: StringPublicKey, newMint: StringPublicKey, edition: BN, winIndex: BN | null, instructions: TransactionInstruction[]): Promise<void>;
//# sourceMappingURL=redeemParticipationBidV3.d.ts.map