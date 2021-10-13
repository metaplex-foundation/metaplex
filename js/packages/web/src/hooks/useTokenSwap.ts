import { useConnection } from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect } from 'react';
import { initTokenAccounts, initTokenSwap } from '../actions/swap.actions';

export function useTokenSwap() {
  const connection = useConnection();
  const { publicKey } = useWallet();

  useEffect(() => {
    console.log('--conn', connection, publicKey)

    if (!connection || !publicKey) {
      return;
    }

    const init = async () => {
      await initTokenSwap(connection, publicKey);
      await initTokenAccounts();
    }

    init();
  }, [connection, publicKey]);

}
