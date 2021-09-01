import { MetaplexApiDataSource } from './api';
import { inspect } from 'util';
// import { Connection } from '@solana/web3.js';
// import { loadAccounts } from '@oyster/common/dist/lib/contexts/meta/loadAccounts';
// import { getOwnedMeta } from '@oyster/common/dist/lib/contexts/meta/getOwnedMeta';
// import { loadUserTokenAccounts } from './utils/loadUserTokenAccounts';

const ownerId = '7DAjuKLx8yHgcqfvTXaPwx5pUhDpWrF9XoTbBgT2fHrm';
const storeId = '54VX6zEFJB4X2fX1RmYQ4jRULtdAFzJcXhKQPYHVTxrR';

function asyncCount<T>(data: Promise<T[]>) {
  return data.then(d => d.length);
}

export const getData = async (): Promise<any> => {
  // const endpoint = ENDPOINTS[2].endpoint;
  // const connection = new Connection(endpoint, 'recent');

  // const [state, userAccounts] = await Promise.all([
  //   loadAccounts(connection, true),
  //   loadUserTokenAccounts(connection, ownerId),
  // ]);

  // return getOwnedMeta(userAccounts, state);
  // return state;

  const source = new MetaplexApiDataSource();
  const api = source.ENTRIES[0];

  const au = [
    api.getAuctions({ storeId, state: 'live' }),
    api.getAuctions({ storeId, state: 'resale' }),
    api.getAuctions({ storeId, state: 'ended' }),
    api.getAuctions({ storeId, state: 'all' }),
    api.getAuctions({ storeId, participantId: ownerId }),
  ].map(item => asyncCount(item));
  return au;
};

const run = async () => {
  const a = await getData();

  console.log(inspect(a, { showHidden: false, depth: 5 }));
  console.log(a.length);
};

void run();
