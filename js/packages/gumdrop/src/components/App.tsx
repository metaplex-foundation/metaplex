import * as React from 'react';
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import { hot } from 'react-hot-loader';
import { createTheme, ThemeProvider } from '@mui/material/styles';

import { CoingeckoProvider } from '../contexts/coingecko';
import { ConnectionProvider } from '../contexts/ConnectionContext';
import { LoaderProvider } from '../components/Loader';
import { SPLTokenListProvider } from '../contexts/tokenList';
import { WalletProvider } from '../contexts/WalletContext';
import { AppLayout } from './Layout';

import { About } from './About';
import { Claim } from './Claim';

export const App = () => {
  const muiDarkTheme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#d0bdf4',
      },
      secondary: {
        main: '#8458B3',
      },
    },
  });
  return (
    <ThemeProvider theme={muiDarkTheme}>
      <BrowserRouter>
        <ConnectionProvider>
          <SPLTokenListProvider>
            <CoingeckoProvider>
              <LoaderProvider>
                <WalletProvider>
                  <AppLayout>
                    <Switch>
                      <Route exact path="/" component={About} />
                      <Route exact path="/claim" component={Claim} />
                    </Switch>
                  </AppLayout>
                </WalletProvider>
              </LoaderProvider>
            </CoingeckoProvider>
          </SPLTokenListProvider>
        </ConnectionProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

declare let module: Record<string, unknown>;

export default hot(module)(App);
