import { Connection } from '@solana/web3.js';
import { Metadata } from '../../actions';
import { ParsedAccount } from '../accounts';
export declare const queryExtendedMetadata: (connection: Connection, mintToMeta: Record<string, ParsedAccount<Metadata>>) => Promise<{
    metadata: ParsedAccount<Metadata>[];
    mintToMetadata: {
        [x: string]: ParsedAccount<Metadata>;
    };
}>;
//# sourceMappingURL=queryExtendedMetadata.d.ts.map