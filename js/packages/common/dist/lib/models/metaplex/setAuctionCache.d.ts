import { TransactionInstruction } from '@solana/web3.js';
import BN from 'bn.js';
import { StringPublicKey } from '../../utils';
export declare function setAuctionCache(auctionCache: StringPublicKey, payer: StringPublicKey, auction: StringPublicKey, safetyDepositBox: StringPublicKey, auctionManager: StringPublicKey, page: BN, instructions: TransactionInstruction[]): Promise<void>;
//# sourceMappingURL=setAuctionCache.d.ts.map