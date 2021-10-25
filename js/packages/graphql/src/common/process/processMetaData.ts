import {
  decodeEdition,
  decodeMasterEdition,
  decodeMetadata,
  MetadataKey,
} from '../models/metadata';
import {
  AccountInfoOwnerString,
  isValidHttpUrl,
  METADATA_PROGRAM_ID,
} from '../utils';
import { createPipeline, createProcessor } from './utils';

const isMetadataAccount = (account: AccountInfoOwnerString<Buffer>) => {
  return account.owner === METADATA_PROGRAM_ID;
};

const isMetadataV1Account = (account: AccountInfoOwnerString<Buffer>) =>
  account.data[0] === MetadataKey.MetadataV1;

const isEditionV1Account = (account: AccountInfoOwnerString<Buffer>) =>
  account.data[0] === MetadataKey.EditionV1;

const isMasterEditionAccount = (account: AccountInfoOwnerString<Buffer>) =>
  account.data[0] === MetadataKey.MasterEditionV1 ||
  account.data[0] === MetadataKey.MasterEditionV2;

export const METADATA_PROCESSOR = createPipeline(
  {
    metadata: createProcessor(
      acc => isMetadataV1Account(acc),
      ({ account, pubkey }) => {
        const metadata = decodeMetadata(account.data, pubkey);
        if (
          isValidHttpUrl(metadata.data.uri) &&
          metadata.data.uri.indexOf('arweave') >= 0
        ) {
          return metadata;
        }
        return undefined;
      },
    ),
    editions: createProcessor(
      acc => isEditionV1Account(acc),
      ({ account, pubkey }) => {
        return decodeEdition(account.data, pubkey);
      },
    ),
    masterEditions: createProcessor(
      acc => isMasterEditionAccount(acc),
      ({ account, pubkey }) => {
        return decodeMasterEdition(account.data, pubkey);
      },
    ),
  },
  isMetadataAccount,
);
