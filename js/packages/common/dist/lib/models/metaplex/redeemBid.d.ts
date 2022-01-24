import { TransactionInstruction } from '@solana/web3.js';
import { StringPublicKey } from '../../utils';
export declare function redeemBid(vault: StringPublicKey, safetyDepositTokenStore: StringPublicKey, destination: StringPublicKey, safetyDeposit: StringPublicKey, fractionMint: StringPublicKey, bidder: StringPublicKey, payer: StringPublicKey, masterEdition: StringPublicKey | undefined, reservationList: StringPublicKey | undefined, isPrintingType: boolean, instructions: TransactionInstruction[], auctioneerReclaimIndex?: number): Promise<void>;
//# sourceMappingURL=redeemBid.d.ts.map