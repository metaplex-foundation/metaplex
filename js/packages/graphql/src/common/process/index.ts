export * from './processAuctions';
export * from './processMetaData';
export * from './processMetaplexAccounts';
export * from './processVaultData';
export * from './getEmptyState';
export * from './types';

import { AUCTION_PROCESSOR } from './processAuctions';
import { METADATA_PROCESSOR } from './processMetaData';
import { METAPLEX_ACCOUNTS_PROCESSOR } from './processMetaplexAccounts';
import { VAULT_PROCESSOR } from './processVaultData';

export const processAuctions = AUCTION_PROCESSOR.process;
export const processMetaData = METADATA_PROCESSOR.process;
export const processMetaplexAccounts = METAPLEX_ACCOUNTS_PROCESSOR.process;
export const processVaultData = VAULT_PROCESSOR.process;
