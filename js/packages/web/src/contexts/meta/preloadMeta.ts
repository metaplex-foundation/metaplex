import { Connection, PublicKey } from '@solana/web3.js';
import { ENDPOINTS } from '@oyster/common/dist/lib/contexts/connection';
import { loadMeta } from './loadMeta';
import { AccountAndPubkey } from './types';

export const DEFAULT_ENDPOINT = ENDPOINTS[0];

export const preloadMeta = async () => {
  const endpoint = DEFAULT_ENDPOINT.endpoint;
  const connection = new Connection(endpoint, 'recent');

  const accounts = await loadMeta(connection);

  return serializeAccounts(accounts);
};

export const serializeAccounts = (accounts: AccountAndPubkey[]) => {
  return accounts.map(({ account, pubkey }) => ({
    account: {
      ...account,
      owner: account.owner.toBase58(),
      data: account.data.toString('base64'),
    },
    pubkey: pubkey.toBase58(),
  }));
};

export const deserializeAccounts = (
  array: ReturnType<typeof serializeAccounts>,
): AccountAndPubkey[] => {
  return array.map(({ account, pubkey }) => ({
    account: {
      ...account,
      owner: new PublicKey(account.owner),
      data: Buffer.from(account.data, 'base64'),
    },
    pubkey: new PublicKey(pubkey),
  }));
};
