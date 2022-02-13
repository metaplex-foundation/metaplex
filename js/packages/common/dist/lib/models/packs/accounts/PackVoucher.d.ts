import { Connection } from '@solana/web3.js';
import { PackKey } from '..';
import { AccountAndPubkey, StringPublicKey } from '../../..';
export declare class PackVoucher {
    key: PackKey;
    packSet: StringPublicKey;
    master: StringPublicKey;
    metadata: StringPublicKey;
    constructor(args: {
        key: PackKey;
        packSet: StringPublicKey;
        master: StringPublicKey;
        metadata: StringPublicKey;
    });
}
export declare const PACK_VOUCHER_SCHEMA: Map<any, any>;
export declare const decodePackVoucher: (buffer: Buffer) => PackVoucher;
export declare const getVouchersByPackSet: ({ connection, packSetKey, }: {
    connection: Connection;
    packSetKey: StringPublicKey;
}) => Promise<AccountAndPubkey[]>;
//# sourceMappingURL=PackVoucher.d.ts.map