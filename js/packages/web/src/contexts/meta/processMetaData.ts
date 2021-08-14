import {
  decodeMetadata,
  decodeEdition,
  decodeMasterEdition,
  Metadata,
  ParsedAccount,
  Edition,
  MasterEditionV1,
  MasterEditionV2,
} from '@oyster/common';
import { MetadataKey } from '@oyster/common/dist/lib/actions/metadata';
import { METADATA_PROGRAM_ID } from '@oyster/common/dist/lib/utils/ids';
import { AccountInfo } from '@solana/web3.js';
import { ProcessAccountsFunc } from './types';
import { isValidHttpUrl } from '../../utils/isValidHttpUrl';

export const processMetaData: ProcessAccountsFunc = (
  { account, pubkey },
  setter,
) => {
  if (!isMetadataAccount(account)) return;

  try {
    if (isMetadataV1Account(account)) {
      const metadata = decodeMetadata(account.data);

      if (
        isValidHttpUrl(metadata.data.uri) &&
        metadata.data.uri.indexOf('arweave') >= 0
      ) {
        const parsedAccount: ParsedAccount<Metadata> = {
          pubkey,
          account,
          info: metadata,
        };
        setter('metadataByMint', metadata.mint.toBase58(), parsedAccount);
      }
    }

    if (isEditionV1Account(account)) {
      const edition = decodeEdition(account.data);
      const parsedAccount: ParsedAccount<Edition> = {
        pubkey,
        account,
        info: edition,
      };
      setter('editions', pubkey.toBase58(), parsedAccount);
    }

    if (isMasterEditionAccount(account)) {
      const masterEdition = decodeMasterEdition(account.data);

      if (isMasterEditionV1(masterEdition)) {
        const parsedAccount: ParsedAccount<MasterEditionV1> = {
          pubkey,
          account,
          info: masterEdition,
        };
        setter('masterEditions', pubkey.toBase58(), parsedAccount);

        setter(
          'masterEditionsByPrintingMint',
          masterEdition.printingMint.toBase58(),
          parsedAccount,
        );

        setter(
          'masterEditionsByOneTimeAuthMint',
          masterEdition.oneTimePrintingAuthorizationMint.toBase58(),
          parsedAccount,
        );
      } else {
        const parsedAccount: ParsedAccount<MasterEditionV2> = {
          pubkey,
          account,
          info: masterEdition,
        };
        setter('masterEditions', pubkey.toBase58(), parsedAccount);
      }
    }
  } catch {
    // ignore errors
    // add type as first byte for easier deserialization
  }
};

const isMetadataAccount = (account: AccountInfo<Buffer>) => {
  return account.owner.equals
    ? account.owner.equals(METADATA_PROGRAM_ID)
    : //@ts-ignore
      account.owner === METADATA_PROGRAM_ID.toBase58();
};

const isMetadataV1Account = (account: AccountInfo<Buffer>) =>
  account.data[0] === MetadataKey.MetadataV1;

const isEditionV1Account = (account: AccountInfo<Buffer>) =>
  account.data[0] === MetadataKey.EditionV1;

const isMasterEditionAccount = (account: AccountInfo<Buffer>) =>
  account.data[0] === MetadataKey.MasterEditionV1 ||
  account.data[0] === MetadataKey.MasterEditionV2;

const isMasterEditionV1 = (
  me: MasterEditionV1 | MasterEditionV2,
): me is MasterEditionV1 => {
  return me.key === MetadataKey.MasterEditionV1;
};
