import React from 'react';
import { Route, Switch } from 'react-router-dom';

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
import { BillingView } from './views/auction/billing';
import { AdminView } from './views/admin';

export function Routes() {
  return (
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
  );
}
