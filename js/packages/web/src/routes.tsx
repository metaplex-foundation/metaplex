import { HashRouter, Route, Switch } from 'react-router-dom';
import { Providers } from './providers';
import {
  AnalyticsView,
  ArtCreateView,
  ArtCreateBulkView,
  ArtistsView,
  ArtistView,
  ArtView,
  ArtworksView,
  AuctionCreateView,
  AuctionView,
  HomeView,
} from './views';
import { AdminView } from './views/admin';
import { BillingView } from './views/auction/billing';

export function Routes() {
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
                            path="/art/create-bulk"
                            component={() => <ArtCreateBulkView />}
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
