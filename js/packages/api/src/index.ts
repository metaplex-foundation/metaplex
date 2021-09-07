import { DEFAULT_ENDPOINT } from './api';
import { inspect } from 'util';
import { Connection } from '@solana/web3.js';
import { loadAccounts } from '@oyster/common/dist/lib/contexts/meta/loadAccounts';
import { getOwnedMeta } from '@oyster/common/dist/lib/contexts/meta/getOwnedMeta';
import { loadUserTokenAccounts } from './loaders/loadUserTokenAccounts';

const ownerId = '7DAjuKLx8yHgcqfvTXaPwx5pUhDpWrF9XoTbBgT2fHrm';

export const getData = async (): Promise<any> => {
  const endpoint = DEFAULT_ENDPOINT.endpoint;
  const connection = new Connection(endpoint, 'recent');

  const [state, userAccounts] = await Promise.all([
    loadAccounts(connection, true),
    loadUserTokenAccounts(connection, ownerId),
  ]);

  return getOwnedMeta(userAccounts, state);
};

const run = async () => {
  const a = await getData();

  console.log(inspect(a, { showHidden: false, depth: 5 }));
};

void run();
