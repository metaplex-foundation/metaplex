import { PublicKey } from '@solana/web3.js';
import { StringPublicKey } from '../..';
export declare const PACKS_PREFIX = "packs";
export declare const CARD_PREFIX = "card";
export declare const VOUCHER_PREFIX = "voucher";
export declare const PROVING_PROCESS_PREFIX = "proving";
export declare const CONFIG_PREFIX = "config";
export declare function getProgramAuthority(): Promise<StringPublicKey>;
export declare function findProvingProcessProgramAddress(packSetKey: PublicKey, userWallet: PublicKey, voucherMint: PublicKey): Promise<StringPublicKey>;
export declare function findPackConfigProgramAddress(packSetKey: PublicKey): Promise<StringPublicKey>;
export declare function findPackCardProgramAddress(pack: PublicKey, index: number): Promise<StringPublicKey>;
export declare function findPackVoucherProgramAddress(pack: PublicKey, index: number): Promise<StringPublicKey>;
//# sourceMappingURL=find.d.ts.map