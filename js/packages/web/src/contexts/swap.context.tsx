import { useConnection } from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { Account } from '@solana/web3.js';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { initTokenAccounts, updateUserTokenAccounts } from '../actions/swap.actions';
import { initTokenSwap } from '../actions/swap3.actions';
import { SWAP_ADDRESS } from '../models/Swap.model';
import { TOKEN_SWAP_PROGRAM_ID, TokenSwap } from '../program/TokenSwap';

export interface SwapContextState {
  isInited: boolean;
  isReverse: boolean;
  setIsReverse: (value: boolean) => void;
  tokenA: any;
  tokenB: any;
}

const SwapContext = React.createContext<SwapContextState | null>(null);

export function SwapProvider({ children }: {
  children: any;
}) {
  const connection = useConnection();
  const { publicKey } = useWallet();
  const [ account ] = useState(new Account());
  const [ tokenSwap, setTokenSwap ] = useState(null);
  const [ isInited, setIsInited ] = useState(false);
  const [ isReverse, setIsReverse ] = useState(false);

  useEffect(() => {
    if (!connection || !publicKey) {
      return;
    }

    const init = async () => {
      const tokenSwap = await initTokenSwap(connection, account);
      const { tokenAccountA, tokenAccountB } = await initTokenAccounts(connection);
      await updateUserTokenAccounts(connection);
      setIsInited(true);
    };

    init();
  }, [ connection, publicKey ]);

  const value: SwapContextState = {
    isInited,
    isReverse,
    setIsReverse,
    tokenA: 'a',
    tokenB: 'b',
  };

  return (
    <SwapContext.Provider value={value}>
      {children}
    </SwapContext.Provider>
  );
}

export const useSwapState = () => {
  return useContext(SwapContext);
};
