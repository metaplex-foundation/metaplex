import { Connection } from '@solana/web3.js';
import {
  TokenAccount,
  StringPublicKey,
  TOKEN_PROGRAM_ID,
  TokenAccountParser,
  getTokenAccountsByOwner,
  getAccountInfoAndContext,
  wrapNativeAccount,
} from '..';

export const loadOwnerTokenAccounts = async (
  connection: Connection,
  ownerId: StringPublicKey,
) => {
  const accounts = await getTokenAccountsByOwner(connection, ownerId, {
    programId: TOKEN_PROGRAM_ID.toBase58(),
  });
  const tokenAccounts = accounts
    .map(info => TokenAccountParser(info.pubkey, info.account))
    .filter(Boolean) as TokenAccount[];
  return tokenAccounts;
};

export const loadNativeTokenAccount = async (
  connection: Connection,
  ownerId: StringPublicKey,
) => {
  const account = await getAccountInfoAndContext(connection, ownerId);
  return wrapNativeAccount(ownerId, account);
};

// TODO: cache & subscribe
export const loadUserTokenAccounts = async (
  connection: Connection,
  ownerId: StringPublicKey,
) => {
  const accounts = await Promise.all([
    loadOwnerTokenAccounts(connection, ownerId),
    loadNativeTokenAccount(connection, ownerId),
  ]);
  return accounts.flat().filter(Boolean) as TokenAccount[];
};
