import React from 'react';
import { HashRouter, Route, Switch } from 'react-router-dom';
import { contexts } from '@oyster/common';
import { MetaProvider } from './contexts';
import { AppLayout } from './components/Layout';

import {
  AboutView,
  HomeView,
  RoadmapView,
  Treehouse
} from './views';
import { UseWalletProvider } from 'use-wallet';
import { CoingeckoProvider } from './contexts/coingecko';
import { ConfettiProvider } from './components/Confetti';
const { WalletProvider } = contexts.Wallet;
const { ConnectionProvider } = contexts.Connection;
const { AccountsProvider } = contexts.Accounts;

export function Routes() {
  return (
    <>
      <HashRouter basename={'/'}>
        <ConnectionProvider>
          <WalletProvider>
            <UseWalletProvider chainId={5}>
              <AccountsProvider>
                <CoingeckoProvider>
                  <MetaProvider>
                    <ConfettiProvider>
                      <AppLayout>
                        <Switch>
                          <Route path="/treehouse" component={() => <Treehouse />} />
                          <Route path="/about" component={() => <AboutView />} />
                          <Route path="/roadmap" component={() => <RoadmapView />} />
                          <Route path="/" component={() => <HomeView />} />
                        </Switch>
                      </AppLayout>
                    </ConfettiProvider>
                  </MetaProvider>
                </CoingeckoProvider>
              </AccountsProvider>
            </UseWalletProvider>
          </WalletProvider>
        </ConnectionProvider>
      </HashRouter>
    </>
  );
}
