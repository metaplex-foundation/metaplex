import React from 'react';
import { HashRouter, Route, Switch } from 'react-router-dom';
import { contexts } from '@oyster/common';
import { MetaProvider } from './contexts';
import { AppLayout } from './components/Layout';

import {
  ArtCreateView,
  ArtistsView,
  ArtistView,
  ArtView,
  AuctionCreateView,
  AuctionView,
  HomeView,
  ArtworksView,
} from './views';
import { UseWalletProvider } from 'use-wallet';
import { CoingeckoProvider } from './contexts/coingecko';
import { BillingView } from './views/auction/billing';
import { AdminView } from './views/admin';
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
                          <Route
                            exact
                            path="/admin"
                            component={() => <AdminView />}
                          />
                          <Route
                            exact
                            path="/art/create/:step_param?"
                            component={() => <ArtCreateView />}
                          />
                          <Route
                            exact
                            path="/artworks/:id?"
                            component={() => <ArtworksView />}
                          />
                          <Route
                            exact
                            path="/art/:id"
                            component={() => <ArtView />}
                          />
                          <Route
                            exact
                            path="/artists/:id"
                            component={() => <ArtistView />}
                          />
                          <Route
                            exact
                            path="/artists"
                            component={() => <ArtistsView />}
                          />
                          <Route
                            exact
                            path="/auction/create/:step_param?"
                            component={() => <AuctionCreateView />}
                          />
                          <Route
                            exact
                            path="/auction/:id"
                            component={() => <AuctionView />}
                          />
                          <Route
                            exact
                            path="/auction/:id/billing"
                            component={() => <BillingView />}
                          />
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
