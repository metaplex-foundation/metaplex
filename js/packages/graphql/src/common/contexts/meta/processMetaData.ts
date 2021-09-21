import { ProcessAccountsFunc } from "./types";
import { isValidHttpUrl } from "../../utils/isValidHttpUrl";
import {
  decodeEdition,
  decodeMasterEdition,
  decodeMetadata,
  Edition,
  MasterEditionV1,
  MasterEditionV2,
  Metadata,
  MetadataKey,
} from "../../actions";
import { ParsedAccount } from "../accounts/types";
import { METADATA_PROGRAM_ID, AccountInfoOwnerString } from "../../utils";

export const processMetaData: ProcessAccountsFunc = (
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
        const parsedAccount: ParsedAccount<Metadata> = {
          pubkey,
          info: metadata,
        };
        setter("metadataByMint", metadata.mint, parsedAccount);
      }
    }

    if (isEditionV1Account(account)) {
      const edition = decodeEdition(account.data);
      const parsedAccount: ParsedAccount<Edition> = {
        pubkey,
        info: edition,
      };
      setter("editions", pubkey, parsedAccount);
    }

    if (isMasterEditionAccount(account)) {
      const masterEdition = decodeMasterEdition(account.data);

      if (isMasterEditionV1(masterEdition)) {
        const parsedAccount: ParsedAccount<MasterEditionV1> = {
          pubkey,
          info: masterEdition,
        };
        setter("masterEditions", pubkey, parsedAccount);

        setter(
          "masterEditionsByPrintingMint",
          masterEdition.printingMint,
          parsedAccount
        );

        setter(
          "masterEditionsByOneTimeAuthMint",
          masterEdition.oneTimePrintingAuthorizationMint,
          parsedAccount
        );
      } else {
        const parsedAccount: ParsedAccount<MasterEditionV2> = {
          pubkey,
          info: masterEdition,
        };
        setter("masterEditions", pubkey, parsedAccount);
      }
    }
  } catch {
    // ignore errors
    // add type as first byte for easier deserialization
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

const isMasterEditionV1 = (
  me: MasterEditionV1 | MasterEditionV2
): me is MasterEditionV1 => me.key === MetadataKey.MasterEditionV1;
