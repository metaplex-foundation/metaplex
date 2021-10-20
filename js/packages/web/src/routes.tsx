import { BrowserRouter, Route, Switch } from 'react-router-dom';
import { Providers } from './providers';
import {
  AnalyticsView,
  ArtCreateView,
  ArtistsView,
  ArtistView,
  ArtView,
  ArtworksView,
  AuctionCreateView,
  AuctionView,
  HomeView,
  MarketplaceView,
} from './views';
import { AdminView } from './views/admin';
import { BillingView } from './views/auction/billing';
import { Collections } from './views/collections';

export function Routes() {
  return (
    <>
      <BrowserRouter basename={'/'}>
        <Providers>
          <Switch>
            <Route exact path="/admin" component={() => <AdminView />} />
            <Route exact path="/collections" component={() => <Collections />} />
            <Route
              exact
              path="/analytics"
              component={() => <AnalyticsView />}
            />
            <Route exact path="/auction" component={() => <AnalyticsView />} />
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
            <Route exact path="/art/:id" component={() => <ArtView />} />
            <Route exact path="/artists/:id" component={() => <ArtistView />} />
            <Route exact path="/artists" component={() => <ArtistsView />} />
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
            {/* <Route
              exact
              path="/marketplace"
              component={() => <MarketplaceView />}
            /> */}
            <Route
              exact
              path="/marketplace/:id"
              component={() => <MarketplaceView />}
            />
            <Route path="/" component={() => <HomeView />} />
          </Switch>
        </Providers>
      </BrowserRouter>
    </>
  );
}
