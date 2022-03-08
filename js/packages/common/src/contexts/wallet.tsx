import { WalletError } from '@solana/wallet-adapter-base';
import {
  WalletContextState,
  WalletProvider as BaseWalletProvider,
  WalletContext,
  useWallet
} from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletModalContext, useWalletModal } from '@solana/wallet-adapter-react-ui';
import {
  LedgerWalletAdapter,
  MathWalletAdapter,
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  SolletWalletAdapter,
  SolongWalletAdapter,
  TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import React, {
  FC,
  ReactNode,
  useCallback,
  useMemo,
} from 'react';
import { notify } from '../utils';

export const WalletProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new TorusWalletAdapter(),
      new SolflareWalletAdapter(),
      new LedgerWalletAdapter(),
      new SolongWalletAdapter(),
      new MathWalletAdapter(),
      new SolletWalletAdapter(),
    ],
    [],
  );

  const onError = useCallback((error: WalletError) => {
    console.error(error);
    notify({
      message: 'Wallet error',
      description: error.message,
    });
  }, []);
  return (
    <BaseWalletProvider wallets={wallets} onError={onError} autoConnect>
      <WalletModalProvider>{children}</WalletModalProvider>
    </BaseWalletProvider>
  );
};