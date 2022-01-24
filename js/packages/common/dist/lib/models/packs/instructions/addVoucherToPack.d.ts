import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { TokenAccount } from '../..';
import { StringPublicKey } from '../../../utils';
interface Params {
    index: number;
    packSetKey: PublicKey;
    authority: StringPublicKey;
    mint: StringPublicKey;
    tokenAccount: TokenAccount;
}
export declare function addVoucherToPack({ index, packSetKey, authority, mint, tokenAccount, }: Params): Promise<TransactionInstruction>;
export {};
//# sourceMappingURL=addVoucherToPack.d.ts.map