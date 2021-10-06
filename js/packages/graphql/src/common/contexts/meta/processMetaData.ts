import logger from "../../../logger";
import {
  decodeEdition,
  decodeMasterEdition,
  decodeMetadata,
  MetadataKey,
} from "../../actions";
import { AccountInfoOwnerString, METADATA_PROGRAM_ID } from "../../utils";
import { isValidHttpUrl } from "../../utils/isValidHttpUrl";
import { ProcessAccountsFunc } from "./types";

export const processMetaData: ProcessAccountsFunc = async (
  { account, pubkey },
  setter
) => {
  if (!isMetadataAccount(account)) return;

  try {
    if (isMetadataV1Account(account)) {
      const metadata = decodeMetadata(account.data);

      if (
        isValidHttpUrl(metadata.data.uri) &&
        metadata.data.uri.indexOf("arweave") >= 0
      ) {
        await metadata.init();
        await setter("metadata", pubkey, metadata);
      }
    }

    if (isEditionV1Account(account)) {
      const edition = decodeEdition(account.data);
      await setter("edition", pubkey, edition);
    }

    if (isMasterEditionAccount(account)) {
      const masterEdition = decodeMasterEdition(account.data);
      await setter("masterEdition", pubkey, masterEdition);
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
