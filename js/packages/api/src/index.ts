import { DEFAULT_ENDPOINT } from './api';
import { inspect } from 'util';
import { Connection } from '@solana/web3.js';
import { loadAccounts } from '@oyster/common/dist/lib/contexts/meta/loadAccounts';

export const getData = async (): Promise<any> => {
  const endpoint = DEFAULT_ENDPOINT.endpoint;
  const connection = new Connection(endpoint, 'recent');
  return loadAccounts(connection, true);
};

const run = async () => {
  const a = await getData();

  console.log(inspect(a, { showHidden: false, depth: 0 }));
};

void run();
