import { Connection } from '@solana/web3.js';
import { PackKey } from '..';
import { AccountAndPubkey, StringPublicKey } from '../../..';
export declare class PackCard {
    key: PackKey;
    packSet: StringPublicKey;
    master: StringPublicKey;
    metadata: StringPublicKey;
    tokenAccount: StringPublicKey;
    maxSupply: number;
    weight: number;
    constructor(args: {
        key: PackKey;
        packSet: StringPublicKey;
        master: StringPublicKey;
        metadata: StringPublicKey;
        tokenAccount: StringPublicKey;
        maxSupply: number;
        weight: number;
    });
}
export declare const PACK_CARD_SCHEMA: Map<any, any>;
export declare const decodePackCard: (buffer: Buffer) => PackCard;
export declare const getCardsByPackSet: ({ connection, packSetKey, }: {
    connection: Connection;
    packSetKey: StringPublicKey;
}) => Promise<AccountAndPubkey[]>;
//# sourceMappingURL=PackCard.d.ts.map