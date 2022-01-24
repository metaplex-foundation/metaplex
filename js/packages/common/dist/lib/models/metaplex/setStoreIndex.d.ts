import { TransactionInstruction } from '@solana/web3.js';
import BN from 'bn.js';
import { StringPublicKey } from '../../utils';
export declare function setStoreIndex(storeIndex: StringPublicKey, auctionCache: StringPublicKey, payer: StringPublicKey, page: BN, offset: BN, instructions: TransactionInstruction[], belowCache?: StringPublicKey, aboveCache?: StringPublicKey): Promise<void>;
//# sourceMappingURL=setStoreIndex.d.ts.map