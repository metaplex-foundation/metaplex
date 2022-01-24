import { StringPublicKey } from '../../utils/ids';
import { TokenAccount } from '../../models';
import { Metadata } from '../../actions';
import { StoreIndexer, WhitelistedCreator } from '../../models/metaplex';
import { Connection, PublicKey } from '@solana/web3.js';
import { AccountAndPubkey, MetaState, ProcessAccountsFunc, UpdateStateValueFunc } from './types';
import { ParsedAccount } from '../accounts/types';
export declare const USE_SPEED_RUN = false;
export declare const pullStoreMetadata: (connection: Connection, tempCache: MetaState) => Promise<MetaState>;
export declare const pullYourMetadata: (connection: Connection, userTokenAccounts: TokenAccount[], tempCache: MetaState) => Promise<MetaState>;
export declare const pullPayoutTickets: (connection: Connection, tempCache: MetaState) => Promise<MetaState>;
export declare const pullPacks: (connection: Connection, state: MetaState, walletKey?: PublicKey | null | undefined) => Promise<MetaState>;
export declare const pullPack: ({ connection, state, packSetKey, walletKey, }: {
    connection: Connection;
    state: MetaState;
    packSetKey: StringPublicKey;
    walletKey: PublicKey | null;
}) => Promise<MetaState>;
export declare const pullAuctionSubaccounts: (connection: Connection, auction: StringPublicKey, tempCache: MetaState) => Promise<MetaState>;
export declare const pullPages: (connection: Connection) => Promise<ParsedAccount<StoreIndexer>[]>;
export declare const pullPage: (connection: Connection, page: number, tempCache: MetaState, walletKey?: PublicKey | null | undefined, shouldFetchNftPacks?: boolean | undefined) => Promise<MetaState>;
export declare const limitedLoadAccounts: (connection: Connection) => Promise<MetaState>;
export declare const loadAccounts: (connection: Connection) => Promise<MetaState>;
export declare const pullMetadataByKeys: (connection: Connection, state: MetaState, metadataKeys: StringPublicKey[]) => Promise<MetaState>;
export declare const makeSetter: (state: MetaState) => UpdateStateValueFunc<MetaState>;
export declare const processingAccounts: (updater: UpdateStateValueFunc) => (fn: ProcessAccountsFunc) => (accounts: AccountAndPubkey[]) => Promise<void>;
export declare const metadataByMintUpdater: (metadata: ParsedAccount<Metadata>, state: MetaState) => Promise<MetaState>;
export declare const initMetadata: (metadata: ParsedAccount<Metadata>, whitelistedCreators: Record<string, ParsedAccount<WhitelistedCreator>>, setter: UpdateStateValueFunc) => Promise<void>;
//# sourceMappingURL=loadAccounts.d.ts.map