import React from 'react'
import { HashRouter, Route, Switch } from 'react-router-dom'
import { Providers } from './providers'
import {
  ArtView,
  ArtistView,
  ArtistsView,
  AuctionView,
  ArtworksView,
  AnalyticsView,
  ArtCreateView,
  StaticPageView,
  AuctionCreateView,
  HomeView,
} from './views'
import { AdminView } from './views/admin'
import PackView from './views/pack'
import { PackCreateView } from './views/packCreate'
import { BillingView } from './views/auction/billing'

/* New view components */
import {
  Explore,
  StaticContent,
  SubmitCollection,
  LaunchPadSubmission,
} from './components-v2/views'

/* UI v2 Upgraded Views */
import ScrollToTop from './ScrollToTop'
import { Home, Collection, Discover, NFTDetails, NftNext } from './ui/views'

import { SalesListView } from './views/home/components/SalesList'

export function Routes() {
  const shouldEnableNftPacks = process.env.NEXT_ENABLE_NFT_PACKS === 'true'
  return (
    <>
      <HashRouter basename={'/'}>
        <ScrollToTop>
          <Providers>
            <Switch>
              {shouldEnableNftPacks && (
                <Route
                  exact
                  path='/admin/pack/create/:stepParam?'
                  component={() => <PackCreateView />}
                />
              )}
              {shouldEnableNftPacks && (
                <Route exact path='/pack/:packKey' component={() => <PackView />} />
              )}
              <Route exact path='/admin' component={() => <AdminView />} />
              <Route exact path='/analytics' component={() => <AnalyticsView />} />
              <Route exact path='/allitems' component={() => <SalesListView />} />
              <Route exact path='/art/create/:step_param?' component={() => <ArtCreateView />} />
              <Route exact path='/artworks/:id?' component={() => <ArtworksView />} />
              <Route exact path='/art/:id' component={() => <ArtView />} />
              <Route exact path='/artists/:id' component={() => <ArtistView />} />
              <Route exact path='/artists' component={() => <ArtistsView />} />

              <Route
                exact
                path='/auction/create/:step_param?'
                component={() => <AuctionCreateView />}
              />
              <Route exact path='/auction/:id' component={() => <AuctionView />} />
              <Route exact path='/auction/:id/billing' component={() => <BillingView />} />
              <Route path='/about' component={() => <StaticPageView />} />
              <Route path='/discover' component={() => <Discover />} />
              {/* <Route path='/collection/:id' component={() => <CollectionDetailView />} /> */}
              <Route path='/collection/:id' component={() => <Collection />} />
              <Route path='/nft/:id' component={() => <NFTDetails />} />
              <Route path='/nft-next/:id' component={() => <NftNext />} />
              <Route path='/' component={() => <Home />} />
              {/* <Route exact path='/auction/:id' component={() => <AuctionView />} />
            <Route exact path='/auction/:id/billing' component={() => <BillingView />} /> */}
              {/* <Route path='/about' component={() => <StaticPageView />} />
            <Route path='/explore' component={() => <Explore />} />
            <Route path='/collection' component={() => <Collection />} />
            <Route path='/static-content' component={() => <StaticContent />} />
            <Route path='/submit-collection' component={() => <SubmitCollection />} />
            <Route path='/launchpad-submission' component={() => <LaunchPadSubmission />} /> */}
            </Switch>
          </Providers>
        </ScrollToTop>
      </HashRouter>
    </>
  )
}
