import { Connection } from '@solana/web3.js';
import {
  AUCTION_ID,
  METADATA_PROGRAM_ID,
  METAPLEX_ID,
  VAULT_ID,
} from '@oyster/common/dist/lib/utils/ids';

export const loadMeta = async (connection: Connection) => {
  return (
    await Promise.all([
      connection.getProgramAccounts(VAULT_ID),
      connection.getProgramAccounts(AUCTION_ID),
      connection.getProgramAccounts(METADATA_PROGRAM_ID),
      connection.getProgramAccounts(METAPLEX_ID),
    ])
  ).flat();
};
