import { WalletAdapterNetwork, WalletError } from '@solana/wallet-adapter-base';
import {
  WalletProvider as BaseWalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
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
import { useConnectionConfig } from './connection';

export const WalletProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const {endpoint, env} = useConnectionConfig();
  const wallets = useMemo(
    () => {
      const networkLabel = (env.includes("testnet")? "testnet" : env.includes("devnet") ? "devnet" : "mainnet-beta") as WalletAdapterNetwork;
      return [
      new PhantomWalletAdapter(),
      new TorusWalletAdapter({params:{network:{
        blockExplorerUrl: env.includes("testnet") ? "https://explorer.solana.com/?cluster=testnet" : env.includes("devnt")  ? "https://explorer.solana.com/?cluster=devnet" : "https://explorer.solana.com/",
        chainId: "0x1",
        displayName: env,
        logo: "solana.svg",
        rpcTarget: endpoint,
        ticker: "SOL",
        tickerName: "Solana"
      }}}),
      new SolflareWalletAdapter({network: networkLabel}),
      new LedgerWalletAdapter(),
      new SolongWalletAdapter(),
      new MathWalletAdapter(),
      new SolletWalletAdapter({network:networkLabel}),
    ];
  },
    [endpoint, env],
  );

  const onError = useCallback((error: WalletError) => {
    console.error(error);
    notify({
      message: 'Wallet error',
      description: error.message,
    });
  }, []);
  return (
    // Wallet adapter yet to implement a method to change network during runtime
    // to reinit wallet adapter with selected network, add key prop (this causes provider to remount so use with caution)
    <BaseWalletProvider wallets={wallets} onError={onError} autoConnect>
      <WalletModalProvider>{children}</WalletModalProvider>
    </BaseWalletProvider>
  );
};