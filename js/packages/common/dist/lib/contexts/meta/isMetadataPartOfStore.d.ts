import { Metadata } from '../../actions';
import { Store, WhitelistedCreator } from '../../models/metaplex';
import { ParsedAccount } from '../accounts/types';
export declare const isMetadataPartOfStore: (m: ParsedAccount<Metadata>, whitelistedCreatorsByCreator: Record<string, ParsedAccount<WhitelistedCreator>>, store?: ParsedAccount<Store> | null | undefined) => boolean;
//# sourceMappingURL=isMetadataPartOfStore.d.ts.map