import { MetaplexApi } from './api';
import { inspect } from 'util';
// import { Connection } from '@solana/web3.js';
// import { loadAccounts } from '@oyster/common/dist/lib/contexts/meta/loadAccounts';
// import { getOwnedMeta } from '@oyster/common/dist/lib/contexts/meta/getOwnedMeta';
// import { loadUserTokenAccounts } from './utils/loadUserTokenAccounts';

const ownerId = '7DAjuKLx8yHgcqfvTXaPwx5pUhDpWrF9XoTbBgT2fHrm';
const storeId = '54VX6zEFJB4X2fX1RmYQ4jRULtdAFzJcXhKQPYHVTxrR';

export const getData = async (): Promise<any> => {
  // const endpoint = ENDPOINTS[2].endpoint;
  // const connection = new Connection(endpoint, 'recent');

  // const [state, userAccounts] = await Promise.all([
  //   loadAccounts(connection, true),
  //   loadUserTokenAccounts(connection, ownerId),
  // ]);

  // return getOwnedMeta(userAccounts, state);
  // return state;
  MetaplexApi.load(true);
  const api = new MetaplexApi();
  await api.initialize({ context: {} });
  const au = [
    api.getAuctions({ storeId, state: 'live' }).length,
    api.getAuctions({ storeId, state: 'resale' }).length,
    api.getAuctions({ storeId, state: 'ended' }).length,
    api.getAuctions({ storeId, state: 'all' }).length,
    api.getAuctions({ storeId, participantId: ownerId }).length,
  ];
  return au;
};

const run = async () => {
  const a = await getData();

  console.log(inspect(a, { showHidden: false, depth: 5 }));
  console.log(a.length);
};

void run();
