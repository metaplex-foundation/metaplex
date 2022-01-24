/// <reference types="react" />
/// <reference types="node" />
import { AccountInfo, PublicKey } from '@solana/web3.js';
import { MintInfo } from '@solana/spl-token';
import { TokenAccount } from '../../models';
export declare const useAccountsContext: () => any;
export declare function AccountsProvider({ children }: {
    children?: any;
}): JSX.Element;
export declare function useNativeAccount(): {
    account: AccountInfo<Buffer>;
};
export declare function useMint(key?: string | PublicKey): MintInfo | undefined;
export declare function useAccount(pubKey?: PublicKey): TokenAccount | undefined;
//# sourceMappingURL=accounts.d.ts.map