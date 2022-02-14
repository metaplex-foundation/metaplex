import * as React from "react";
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import { hot } from "react-hot-loader";

import { CoingeckoProvider } from '../contexts/coingecko';
import { ConnectionProvider } from '../contexts/ConnectionContext';
import { LoaderProvider } from '../components/Loader';
import { SPLTokenListProvider } from '../contexts/tokenList';
import { WalletProvider } from '../contexts/WalletContext';
import { AppLayout } from './Layout';

import { About } from './About';
import { Claim } from './Claim';

export const App = () => {
  return (
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
  );
}

declare let module: Record<string, unknown>;

export default hot(module)(App);
