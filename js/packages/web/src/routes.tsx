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
  ParticipatedView,
  StaticPageView,

} from './views';
import { AdminView } from './views/admin';

import { PackCreateView } from './views/packCreate';
import { BillingView } from './views/auction/billing';

export function Routes() {
  const shouldEnableNftPacks = process.env.NEXT_ENABLE_NFT_PACKS;
  return (
    <>
      <HashRouter basename={'/'}>
        <Providers>
          <Switch>
            <Route exact path="/pxadmen" component={() => <AdminView />} />
            {shouldEnableNftPacks && (
              <Route
                exact
                path="/admin/pack/create/:stepParam?"
                component={() => <PackCreateView />}
              />
            )}
            <Route
              exact
              path="/analytics"
              component={() => <AnalyticsView />}
            />
             <Route
              exact
              path="/purchases"
              component={() => <ParticipatedView />}
            />
            <Route
              exact
              path="/art/create/:step_param?"
              component={() => <ArtCreateView />}
            />
            <Route
              exact
              path="/wallet/:id?"
              component={() => <ArtworksView />}
            />
            <Route exact path="/art/:id" component={() => <ArtView />} />
            <Route exact path="/artists/:id" component={() => <ArtistView />} />
            <Route exact path="/collections" component={() => <ArtistsView />} />

          
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
            <Route path="/abouterds" component={() => <StaticPageView />} />
            <Route path="/" component={() => <HomeView />} />
          </Switch>
        </Providers>
      </HashRouter>
    </>
  );
}
