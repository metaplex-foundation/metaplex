import { TransactionInstruction } from '@solana/web3.js';
import { StringPublicKey } from '../../utils';
export declare function claimBid(acceptPayment: StringPublicKey, bidder: StringPublicKey, bidderPotToken: StringPublicKey, vault: StringPublicKey, tokenMint: StringPublicKey, instructions: TransactionInstruction[]): Promise<void>;
//# sourceMappingURL=claimBid.d.ts.map