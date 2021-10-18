import logger from '../../logger';
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
import { ProcessAccountsFunc } from './types';

export const processMetaData: ProcessAccountsFunc = async (
  { account, pubkey },
  setter,
) => {
  if (!isMetadataAccount(account)) return;

  try {
    if (isMetadataV1Account(account)) {
      const metadata = decodeMetadata(account.data, pubkey);

      if (
        isValidHttpUrl(metadata.data.uri) &&
        metadata.data.uri.indexOf('arweave') >= 0
      ) {
        //try {
        //  await metadata.init();
        //} catch {
        //  // nothing
        //}
        await setter('metadata', pubkey, metadata);
      }
    }

    if (isEditionV1Account(account)) {
      const edition = decodeEdition(account.data, pubkey);
      await setter('editions', pubkey, edition);
    }

    if (isMasterEditionAccount(account)) {
      const masterEdition = decodeMasterEdition(account.data, pubkey);
      await setter('masterEditions', pubkey, masterEdition);
    }
  } catch (err) {
    logger.warn(err);
  }
};

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
