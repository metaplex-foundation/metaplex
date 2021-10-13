import { useAccount, useConnection } from '@oyster/common';
import { useEffect } from 'react';
import { initTokenSwap } from '../actions/swap.actions';

export function useTokenSwap() {
  const connection = useConnection();
  const account = useAccount();

  useEffect(() => {
    console.log('--conn', connection, account)

    if (!connection || !account) {
      return;
    }

    const init = async () => {
      await initTokenSwap(connection);
    }

    init();
  }, [connection, account]);

}
