import { TransactionInstruction } from '@solana/web3.js';
import { StringPublicKey } from '../../utils';
import { AuctionManagerSettingsV1 } from './deprecatedStates';
export declare function deprecatedInitAuctionManagerV1(vault: StringPublicKey, auctionManagerAuthority: StringPublicKey, payer: StringPublicKey, acceptPaymentAccount: StringPublicKey, store: StringPublicKey, settings: AuctionManagerSettingsV1, instructions: TransactionInstruction[]): Promise<void>;
//# sourceMappingURL=deprecatedInitAuctionManagerV1.d.ts.map