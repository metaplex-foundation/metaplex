import { MetaplexApi } from './api';
import { inspect } from 'util';
// import { Connection } from '@solana/web3.js';
// import { loadAccounts } from '@oyster/common/dist/lib/contexts/meta/loadAccounts';
// import { getOwnedMeta } from '@oyster/common/dist/lib/contexts/meta/getOwnedMeta';
// import { loadUserTokenAccounts } from './utils/loadUserTokenAccounts';

// const ownerId = '7DAjuKLx8yHgcqfvTXaPwx5pUhDpWrF9XoTbBgT2fHrm';

export const getData = async (): Promise<any> => {
  // const endpoint = ENDPOINTS[2].endpoint;
  // const connection = new Connection(endpoint, 'recent');

  // const [state, userAccounts] = await Promise.all([
  //   loadAccounts(connection, true),
  //   loadUserTokenAccounts(connection, ownerId),
  // ]);

  // return getOwnedMeta(userAccounts, state);
  // return state;
  const api = new MetaplexApi();
  await api.initialize({ context: {} });
  return (await api.getAuctions()).slice(0, 10);
};

const run = async () => {
  const a = await getData();

  console.log(inspect(a, { showHidden: false, depth: 5 }));
};

void run();
