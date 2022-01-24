import { PublicKey, TransactionInstruction } from '@solana/web3.js';
interface Params {
    packSetKey: PublicKey;
    authority: string;
}
export declare function activate({ packSetKey, authority, }: Params): Promise<TransactionInstruction>;
export {};
//# sourceMappingURL=activate.d.ts.map