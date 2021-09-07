import { Connection } from '@solana/web3.js';
import {
  StringPublicKey,
  TOKEN_PROGRAM_ID,
} from '@oyster/common/dist/lib/utils/ids';
import { cache } from '@oyster/common/dist/lib/contexts/accounts/cache';
import { TokenAccountParser } from '@oyster/common/dist/lib/contexts/accounts/parsesrs';
import { TokenAccount } from '@oyster/common/dist/lib/models/account';
import {
  getTokenAccountsByOwner,
  getAccountInfoAndContext,
} from '@oyster/common/dist/lib/utils/web3';
import { wrapNativeAccount } from '@oyster/common/dist/lib/contexts/accounts/wrapNativeAccount';

export const loadOwnerTokenAccounts = async (
  connection: Connection,
  ownerId: StringPublicKey,
) => {
  const accounts = await getTokenAccountsByOwner(connection, ownerId, {
    programId: TOKEN_PROGRAM_ID.toBase58(),
  });
  const tokenAccounts = accounts
    .map(info => cache.add(info.pubkey, info.account, TokenAccountParser))
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
