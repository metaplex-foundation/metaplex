import './App.css';
import { useEffect, useMemo, useState } from 'react';

import Home from './Home';

import * as anchor from '@project-serum/anchor';
import { clusterApiUrl, Connection } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  getPhantomWallet,
  getSolflareWallet,
  getSolletWallet,
} from '@solana/wallet-adapter-wallets';

import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';

import { WalletDialogProvider } from '@solana/wallet-adapter-material-ui';
import { ThemeProvider, createTheme } from '@material-ui/core';
import { ConfettiProvider } from './confetti';
import { getOAuthToken } from './oauth';

const theme = createTheme({
  palette: {
    type: 'dark',
  },
});

const candyMachineId = process.env.REACT_APP_CANDY_MACHINE_ID
  ? new anchor.web3.PublicKey(process.env.REACT_APP_CANDY_MACHINE_ID)
  : undefined;

const fairLaunchId = process.env.REACT_APP_FAIR_LAUNCH_ID 
  ? new anchor.web3.PublicKey(process.env.REACT_APP_FAIR_LAUNCH_ID) 
  : undefined;

const network = process.env.REACT_APP_SOLANA_NETWORK as WalletAdapterNetwork;

const rpcHost = process.env.REACT_APP_SOLANA_RPC_HOST!;

const startDateSeed = parseInt(process.env.REACT_APP_CANDY_START_DATE!, 10);

const txTimeout = 30000; // milliseconds (confirm this works for your project)

const App = () => {
  const endpoint = useMemo(() => clusterApiUrl(network), []);

  const [ connection, setConnection ] = useState<Connection>(new anchor.web3.Connection(rpcHost))

  useEffect(() => {
    if (!process.env.REACT_APP_RPC_OAUTH_ENABLED) {
      console.log('OAuth for RPC disabled');
      return;
    }

    (async () => {
      const accessToken = await getOAuthToken(
        process.env.REACT_APP_RPC_OAUTH_CLIENT_ID!,
        process.env.REACT_APP_RPC_OAUTH_REDIRECT_URL!,
        process.env.REACT_APP_RPC_OAUTH_AUTH_URL!,
        process.env.REACT_APP_RPC_OAUTH_TOKEN_URL!,
      );

      setConnection(new anchor.web3.Connection(rpcHost, { httpHeaders: { 'Authorization': `Bearer ${accessToken}`}}));
    })()
  }, [])


  const wallets = useMemo(
    () => [getPhantomWallet(), getSolflareWallet(), getSolletWallet()],
    [],
  );

  return (
    <ThemeProvider theme={theme}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletDialogProvider>
            <ConfettiProvider>
            <Home
                candyMachineId={candyMachineId}
                fairLaunchId={fairLaunchId}
                connection={connection}
                startDate={startDateSeed}
                txTimeout={txTimeout}
              />
            </ConfettiProvider>
          </WalletDialogProvider>
        </WalletProvider>
      </ConnectionProvider>
    </ThemeProvider>
  );
};

export default App;
