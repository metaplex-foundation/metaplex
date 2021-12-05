import { AccountInfo } from '@solana/web3.js';
import { ProcessAccountsFunc } from './types';
import { isValidHttpUrl } from '../../utils/isValidHttpUrl';
import {
  decodeEdition,
  decodeMasterEdition,
  decodeMetadata,
  Edition,
  MasterEditionV1,
  MasterEditionV2,
  Metadata,
  MetadataKey,
} from '../../actions';
import { ParsedAccount } from '../accounts/types';
import { METADATA_PROGRAM_ID, pubkeyToString } from '../../utils';

export const processMetaData: ProcessAccountsFunc = async (
  { account, pubkey },
  setter,
) => {
  if (!isMetadataAccount(account)) return;
  try {
    if (isMetadataV1Account(account)) {
      const metadata = decodeMetadata(account.data);

      if (isValidHttpUrl(metadata.data.uri)) {
        const parsedAccount: ParsedAccount<Metadata> = {
          pubkey,
          account,
          info: metadata,
        };

        await setter('metadataByMint', metadata.mint, parsedAccount);
        await setter('metadataByMetadata', pubkey, parsedAccount);
      }
    }

    if (isEditionV1Account(account)) {
      const edition = decodeEdition(account.data);
      const parsedAccount: ParsedAccount<Edition> = {
        pubkey,
        account,
        info: edition,
      };
      setter('editions', pubkey, parsedAccount);
    }

    if (isMasterEditionAccount(account)) {
      const masterEdition = decodeMasterEdition(account.data);

      if (isMasterEditionV1(masterEdition)) {
        const parsedAccount: ParsedAccount<MasterEditionV1> = {
          pubkey,
          account,
          info: masterEdition,
        };
        setter('masterEditions', pubkey, parsedAccount);

        setter(
          'masterEditionsByPrintingMint',
          masterEdition.printingMint,
          parsedAccount,
        );

        setter(
          'masterEditionsByOneTimeAuthMint',
          masterEdition.oneTimePrintingAuthorizationMint,
          parsedAccount,
        );
      } else {
        const parsedAccount: ParsedAccount<MasterEditionV2> = {
          pubkey,
          account,
          info: masterEdition,
        };
        setter('masterEditions', pubkey, parsedAccount);
      }
    }
  } catch {
    // ignore errors
    // add type as first byte for easier deserialization
  }
};

const isMetadataAccount = (account: AccountInfo<Buffer>) =>
  account && pubkeyToString(account.owner) === METADATA_PROGRAM_ID;

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
