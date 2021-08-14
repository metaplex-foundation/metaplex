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
  AnalyticsView,
} from './views';
import { UseWalletProvider } from 'use-wallet';
import { CoingeckoProvider } from './contexts/coingecko';
import { BillingView } from './views/auction/billing';
import { AdminView } from './views/admin';
import { ConfettiProvider } from './components/Confetti';
const { WalletProvider } = contexts.Wallet;
const { ConnectionProvider } = contexts.Connection;
const { AccountsProvider } = contexts.Accounts;
import { useEffect } from 'react'
import { useRouter } from 'next/router'

import * as ga from './utils/ga'

export function Routes() {

  const router = useRouter()

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      ga.pageview(url)
    }
    //When the component is mounted, subscribe to router changes
    //and log those page views
    router.events.on('routeChangeComplete', handleRouteChange)

    // If the component is unmounted, unsubscribe
    // from the event with the `off` method
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router.events])

  return (
    <>
      <HashRouter basename={'/'}>
        <ConnectionProvider
          storeId={process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS_ADDRESS}
        >
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
                            path="/analytics"
                            component={() => <AnalyticsView />}
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
