import { AccountInfo } from '@solana/web3.js';
import {
  AccountParser,
  decodeMasterEdition,
  decodeMetadata,
  StringPublicKey,
} from '..';

export const WhitelistedMetadataParser: AccountParser = (
  pubkey: StringPublicKey,
  account: AccountInfo<Buffer>,
) => ({
  pubkey,
  account,
  info: decodeMetadata(account.data),
});

export const WhitelistedMasterEditionVParser: AccountParser = (
  pubkey: StringPublicKey,
  account: AccountInfo<Buffer>,
) => ({
  pubkey,
  account,
  info: decodeMasterEdition(account.data),
});
