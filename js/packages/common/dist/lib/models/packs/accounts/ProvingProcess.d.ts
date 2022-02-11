import { Connection, PublicKey } from '@solana/web3.js';
import { PackKey } from '..';
import { AccountAndPubkey, ParsedAccount, StringPublicKey } from '../../..';
export declare class ProvingProcess {
    key: PackKey;
    walletKey: StringPublicKey;
    isExhausted: Boolean;
    voucherMint: StringPublicKey;
    packSet: StringPublicKey;
    cardsToRedeem: Map<number, number>;
    cardsRedeemed: number;
    constructor(args: {
        key: PackKey;
        walletKey: StringPublicKey;
        isExhausted: Boolean;
        voucherMint: StringPublicKey;
        packSet: StringPublicKey;
        cardsToRedeem: Map<number, number>;
        cardsRedeemed: number;
    });
}
export declare const PACK_PROVING_PROCESS_SCHEMA: Map<any, any>;
export declare const decodePackProvingProcess: (buffer: Buffer) => ProvingProcess;
export declare const getProvingProcessByPackSetAndWallet: ({ connection, packSetKey, walletKey, }: {
    connection: Connection;
    packSetKey: StringPublicKey;
    walletKey: PublicKey;
}) => Promise<AccountAndPubkey[]>;
export declare const getProvingProcessByPubkey: (connection: Connection, pubkey: StringPublicKey) => Promise<ParsedAccount<ProvingProcess>>;
//# sourceMappingURL=ProvingProcess.d.ts.map