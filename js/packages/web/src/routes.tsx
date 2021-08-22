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
  FaqView,
  AboutView,
  RoadmapView
} from './views';
import { AdminView } from './views/admin';
// import { BillingView } from './views/auction/billing';

export function Routes() {
  return (
    <>
      <HashRouter basename={'/'}>
        <Providers>
          <Switch>
            <Route exact path="/admin" component={() => <AdminView />} />
            <Route
              exact
              path="/analytics"
              component={() => <AnalyticsView />}
            />
            <Route
              exact
              path="/about"
              component={() => <AboutView />}
            />
            <Route
              exact
              path="/roadmap"
              component={() => <RoadmapView />}
            />
            <Route
              exact
              path="/faq"
              component={() => <FaqView />}
            />
            {/* <Route
              exact
              path="/art/create/:step_param?"
              component={() => <ArtCreateView />}
            /> */}
            <Route
              exact
              path="/art/create-batch"
              component={() => <ArtCreateBulkView />}
            />
            {/* <Route
              exact
              path="/artworks/:id?"
              component={() => <ArtworksView />}
            /> */}
            {/* <Route exact path="/art/:id" component={() => <ArtView />} /> */}
            {/* <Route exact path="/artists/:id" component={() => <ArtistView />} /> */}
            {/* <Route exact path="/artists" component={() => <ArtistsView />} /> */}
            {/* <Route
              exact
              path="/auction/create/:step_param?"
              component={() => <AuctionCreateView />}
            /> */}
            {/* <Route
              exact
              path="/auction/:id"
              component={() => <AuctionView />}
            /> */}
            {/* <Route
              exact
              path="/auction/:id/billing"
              component={() => <BillingView />}
            /> */}
            <Route path="/" component={() => <HomeView />} />
          </Switch>
        </Providers>
      </HashRouter>
    </>
  );
}
