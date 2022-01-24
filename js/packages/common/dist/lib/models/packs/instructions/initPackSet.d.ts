import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { StringPublicKey } from '../../../utils';
import { InitPackSetParams } from '../interface';
interface Params extends InitPackSetParams {
    packSetKey: PublicKey;
    authority: StringPublicKey;
}
export declare function initPackSet({ name, description, uri, mutable, distributionType, allowedAmountToRedeem, redeemStartDate, redeemEndDate, packSetKey, authority, }: Params): Promise<TransactionInstruction>;
export {};
//# sourceMappingURL=initPackSet.d.ts.map