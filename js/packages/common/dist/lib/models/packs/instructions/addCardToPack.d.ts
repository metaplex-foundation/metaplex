import { PublicKey, TransactionInstruction, Keypair } from '@solana/web3.js';
import { TokenAccount } from '../..';
import { StringPublicKey } from '../../../utils';
import { AddCardToPackParams } from '../interface';
interface Params extends AddCardToPackParams {
    packSetKey: PublicKey;
    authority: string;
    mint: StringPublicKey;
    tokenAccount: TokenAccount;
    toAccount: Keypair;
}
export declare function addCardToPack({ maxSupply, weight, index, packSetKey, authority, mint, tokenAccount, toAccount, }: Params): Promise<TransactionInstruction>;
export {};
//# sourceMappingURL=addCardToPack.d.ts.map