import React, { FC } from 'react';
import { StringPublicKey } from '../utils';
interface StoreConfig {
    storeAddress?: StringPublicKey;
    isConfigured: boolean;
    isReady: boolean;
    setStoreForOwner: (ownerAddress?: string) => Promise<string | undefined>;
}
export declare const StoreContext: React.Context<StoreConfig>;
export declare const StoreProvider: FC<{
    ownerAddress?: string;
    storeAddress?: string;
}>;
export declare const useStore: () => StoreConfig;
export {};
//# sourceMappingURL=store.d.ts.map