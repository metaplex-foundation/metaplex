import { PublicKey } from '@solana/web3.js';
export declare const getStoreID: (storeOwnerAddress?: string | undefined) => Promise<string | undefined>;
export declare const setProgramIds: (store?: string | undefined) => Promise<void>;
export declare const programIds: () => {
    token: PublicKey;
    associatedToken: PublicKey;
    bpf_upgrade_loader: PublicKey;
    system: PublicKey;
    metadata: string;
    memo: PublicKey;
    vault: string;
    auction: string;
    metaplex: string;
    pack_create: PublicKey;
    oracle: PublicKey;
    store: PublicKey | undefined;
};
//# sourceMappingURL=programIds.d.ts.map