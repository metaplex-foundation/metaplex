import { Storefront } from '@oyster/common';
import React from 'react';
import { HashRouter, Route, Switch } from 'react-router-dom';
import { Providers } from './providers';
import {
  ArtCreateView,
  ArtistView,
  ArtView,
  ArtworksView,
  AuctionCreateView,
  AuctionView,
  HomeView,
  StaticPageView,
} from './views';
import { AdminView } from './views/admin';
import { BillingView } from './views/auction/billing';

interface RoutesProps {
  storefront: Storefront;
}

export function Routes({ storefront }: RoutesProps) {
  return (
    <>
      <HashRouter basename="/">
        <Providers storefront={storefront}>
          <Switch>
            <Route exact path="/admin" component={() => <AdminView />} />
            <Route
              exact
              path="/artworks/new/:step_param?"
              component={() => <ArtCreateView />}
            />
            <Route exact path="/owned" component={() => <ArtworksView />} />
            <Route exact path="/artworks/:id" component={() => <ArtView />} />
            <Route path="/artists/:id" component={() => <ArtistView />} />
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
            <Route path="/" component={() => <HomeView />} />
          </Switch>
        </Providers>
      </HashRouter>
    </>
  );
}
