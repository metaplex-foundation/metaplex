import React from 'react';
import { HashRouter, Route, Switch } from 'react-router-dom';
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
  StaticPageView,
} from './views';
import { AdminView } from './views/admin';
import PackView from './views/pack';
import { PackCreateView } from './views/packCreate';
import { BillingView } from './views/auction/billing';
import { CollectionsView } from './views/collections';
import { CollectionDetailView } from './views/collections/collectionDetail';

export function Routes() {
  const shouldEnableNftPacks = process.env.NEXT_ENABLE_NFT_PACKS === 'true';
  return (
    <>
      <HashRouter basename={'/'}>
        <Providers>
          <Switch>
            {shouldEnableNftPacks && (
              <Route
                exact
                path="/admin/pack/create/:stepParam?"
                component={() => <PackCreateView />}
              />
            )}
            {shouldEnableNftPacks && (
              <Route
                exact
                path="/pack/:packKey"
                component={() => <PackView />}
              />
            )}
            <Route exact path="/admin" component={() => <AdminView />} />
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
            <Route path="/about" component={() => <StaticPageView />} />
            <Route path="/collections" component={() => <CollectionsView />} />
            <Route
              path="/collection/:id"
              component={() => <CollectionDetailView />}
            />
            <Route path="/" component={() => <HomeView />} />
          </Switch>
        </Providers>
      </HashRouter>
    </>
  );
}
