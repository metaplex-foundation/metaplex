import { AccountInfo, Connection, PublicKey } from '@solana/web3.js';
import { StringPublicKey } from '../../utils/ids';

export const getAccountInfo = async (
  connection: Connection,
  key: StringPublicKey,
) => {
  const account = await connection.getAccountInfo(new PublicKey(key));

  if (!account) {
    return null;
  }

  const { data, ...rest } = account;

  return {
    ...rest,
    data,
  } as AccountInfo<Buffer>;
};
